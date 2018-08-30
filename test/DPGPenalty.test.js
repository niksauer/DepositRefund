const DPGPenalty = artifacts.require("DPGPenalty");
const DPGActorManager = artifacts.require("DPGActorManager");
const DPGToken = artifacts.require("DPGToken");

const DEPOSIT_VALUE = web3.toWei(1, "ether");
const PENALTY_VALUE = web3.toWei(0.2, "ether");


contract("DPG Penalty Test", async (accounts) => {
    let mainContract;
    let tokenContract;
    const owner = accounts[0];
    const requestor = accounts[1];
    const retail = accounts[2];
    const consumerA = accounts[3];
    const consumerB = accounts[4]
    const bottler = accounts[5];
    const collector = accounts[6];

    // hooks
    before("deploy contract with new actor manager dependency and add garbage collector", async() => {
        const actorManagerContract = await DPGActorManager.new();
        mainContract = await DPGPenalty.new(actorManagerContract.address);
        const tokenContractAddress = await mainContract.token();
        tokenContract = await DPGToken.at(tokenContractAddress);

        await actorManagerContract.addCollector(collector, {from: owner});
    });

    // constructor
    it("should start with zero minted tokens", async() => {
        const tokenSupply = await tokenContract.totalSupply();
        assert.equal(tokenSupply, 0);
    });

    const firstPurchaseIdentifiersRetail = [1, 2, 3];

    // function buyOneWayBottles(uint[] identifiers, address _address) public payable
    it("should fail to accept report of 3 purchased bottles by retail because report (1 ETH) does not include appropriate deposit value (3 ETH) and purchase represents introduction", async() => {
        try {
            await mainContract.buyOneWayBottles(firstPurchaseIdentifiersRetail, retail, {from: bottler, value: 1 * DEPOSIT_VALUE});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept report of newly introduced bottle purchase even though report does not include appropriate deposits");
    });

    it("should mint 3 tokens because bottler reported purchase of 3 newly introduced bottles by retail", async() => {
        const newBottles = firstPurchaseIdentifiersRetail.length
        await mainContract.buyOneWayBottles(firstPurchaseIdentifiersRetail, retail, {from: bottler, value: firstPurchaseIdentifiersRetail.length * DEPOSIT_VALUE});
        const supply = await tokenContract.totalSupply();

        assert.equal(supply, newBottles);
    });

    it("should also transfer 3 tokens to retailer because bottler reported purchase of 3 bottles by retail", async() => {
        const ownedTokens = await tokenContract.tokensOf(retail);

        assert.equal(ownedTokens.length, firstPurchaseIdentifiersRetail.length);
    });

    it("should also only transfer tokens with identifiers reported for retailer's purchase", async() => {
        const ownedTokens = (await tokenContract.tokensOf(retail)).map(x => x.toNumber());
        let validTokens = 0;
    
        firstPurchaseIdentifiersRetail.forEach(identifier => {
            if (ownedTokens.includes(identifier)) {
                validTokens = validTokens + 1;
            }
        });

        assert.equal(validTokens, firstPurchaseIdentifiersRetail.length);
    });

    const firstPurchaseIdentifiersConsumerA = [2, 4];
    const newBottles = 1;

    it("should only mint one additional token because retailer reported purchase of 2 bottles by consumer A and retailer previously bought one of these bottles from bottler but also introduced his own bottle", async() => {
        await mainContract.buyOneWayBottles(firstPurchaseIdentifiersConsumerA, consumerA, {from: retail, value: newBottles * DEPOSIT_VALUE});
        const supply = await tokenContract.totalSupply();

        assert.equal(supply, firstPurchaseIdentifiersRetail.length + newBottles);
    });

    it("should also transfer 2 tokens to consumer A because retailer reported purchase of 2 bottles by consumer A", async() => {
        const ownedTokens = await tokenContract.tokensOf(consumerA);

        assert.equal(ownedTokens.length, firstPurchaseIdentifiersConsumerA.length);
    });

    it("should also only transfer tokens with identifiers reported for consumer A's purchase", async() => {
        const ownedTokens = (await tokenContract.tokensOf(consumerA)).map(x => x.toNumber());
        let validTokens = 0;
    
        firstPurchaseIdentifiersConsumerA.forEach(identifier => {
            if (ownedTokens.includes(identifier)) {
                validTokens = validTokens + 1;
            }
        });

        assert.equal(validTokens, firstPurchaseIdentifiersConsumerA.length);
    });

    // function mint(address _to, uint256 _tokenId) public onlyOwner
    it("should fail to mint new token (even though bottle 5 does not exist) because caller (requestor) is not token contract owner (mainContract)", async() => {
        try {
            await tokenContract.mint(requestor, 5, {from: requestor});
        } catch (error) {
            return true;
        }

        throw new Error("Did mint new token even though caller is not token contract owner");
    });

    // function returnOneWayBottles(uint[] identifiers, address _address) public
    it("should burn 2 tokens because take-back point reported return of 2 purchased bottles by consumer A", async() => {
        await mainContract.returnOneWayBottles(firstPurchaseIdentifiersConsumerA, consumerA, {from: retail});
        const supply = await tokenContract.totalSupply();

        assert.equal(supply, firstPurchaseIdentifiersRetail.length + newBottles - firstPurchaseIdentifiersConsumerA.length);
    });

    it("should not burn token with identifier 1 because only bottles 2 and 4 were reported to be returned", async() => {
        assert.isTrue(await tokenContract.exists(1));
    });

    it("should not burn token with identifier 3 because only bottles 2 and 4 were reported to be returned", async() => {
        assert.isTrue(await tokenContract.exists(3));
    });

    it("should also set the number of self returned one way bottles to 2 for consumer A because retail reported return of 2 bottles purchased by consumer A and returned by consumer A", async() => {
        const selfReturnedOneWays = await mainContract.getSelfReturnedOneWayBottles(consumerA);

        assert.equal(selfReturnedOneWays, firstPurchaseIdentifiersConsumerA.length);
    });

    const firstPurchaseIdentifiersConsumerB = [3]

    it("should set the number of foreign returned one way bottles to 1 for consumer B because retail reported return of 1 bottle purchased by consumer B but returned by consumer A", async() => {
        await mainContract.buyOneWayBottles(firstPurchaseIdentifiersConsumerB, consumerB, {from: retail});
        await mainContract.returnOneWayBottles(firstPurchaseIdentifiersConsumerB, consumerA, {from: retail});
        const foreignReturnedOneWays = await mainContract.getForeignReturnedOneWayBottles(consumerB);

        assert.equal(foreignReturnedOneWays, firstPurchaseIdentifiersConsumerB.length);
    });

    const firstNonsenseReportIdentifiers = [5];

    it("should not fail to accept report of returned bottles even though identifiers have not been registered through a purchase because some identifiers may potentially exist", async() => {
        try {
            await returnOneWayBottles(firstNonsenseReportIdentifiers, consumerA, {from: retail});
        } catch (error) {
            return false;
        }
    });

    it("should also not increase the number of self returned one way bottles for consumer A because the bottle identifiers have not been registered through a purchase", async() => {
        const selfReturnedOneWays = await mainContract.getSelfReturnedOneWayBottles(consumerA);
        
        assert.equal(selfReturnedOneWays, firstPurchaseIdentifiersConsumerA.length);
    });

    // function burn(address _to, uint256 _tokenId) public onlyOwner
    it("should fail to burn token (even though bottle 1 exists) because caller (requestor) is not contract owner (mainContract)", async() => {
        try {
            await tokenContract.burn(requestor, 1, {from: requestor});
        } catch (error) {
            return true;
        }

        throw new Error("Did burn token even though requestor is not contract owner");
    });

    const secondNonsenseReportIdentifiers = [8, 9];

    // function reportThrownAwayOneWayBottlesByConsumer(uint[] identifiers) public
    it("should not increase number of thrown away one way bottles because bottle identifiers have not been registered through a purchase", async() => {
        const thrownAwaysBefore = await mainContract.getThrownAwayOneWayBottles();
        await mainContract.reportThrownAwayOneWayBottles(secondNonsenseReportIdentifiers);
        const thrownAwaysAfter = await mainContract.getThrownAwayOneWayBottles();

        assert(thrownAwaysAfter, thrownAwaysBefore);
    });

    const firstThrownAwayIdentifiers = [1] 

    it("should set the number of thrown away one way bottles for consumer B to one (1) because consumer B purchases bottle 1 and a report of a thrown away bottle with identifier 1 is sent", async() => {
        await mainContract.buyOneWayBottles(firstThrownAwayIdentifiers, consumerB, {from: retail})
        await mainContract.reportThrownAwayOneWayBottles(secondNonsenseReportIdentifiers, {from: collector});
        const thrownAways = await mainContract.getThrownAwayOneWayBottlesForConsumer(consumerB);

        assert(thrownAways, firstThrownAwayIdentifiers.length);
    });

    it("should also set the number of thrown away bottles to 1 because a report of 1 thrown away one way bottle was accepted previously", async() => {
        assert(await mainContract.getThrownAwayOneWayBottles(), firstThrownAwayIdentifiers.length);
    });

    const secondPurchaseIdentifiersConsumerA = [10, 11, 12, 13, 14, 15, 16, 17, 18];
    const secondThrownAwayIdentifiersConsumerA = [10, 11, 12, 13, 14, 15, 16];

    // function getPenaltyByConsumer(address _address) public view returns (uint)
    it("should return a penalty of 0.2 ETH because consumer A has purchased 8 one way bottles and a throw away report for 6 of those has been sent", async() => {
        const value = secondPurchaseIdentifiersConsumerA.length * DEPOSIT_VALUE;
        await mainContract.buyOneWayBottles(secondPurchaseIdentifiersConsumerA, consumerA, {from: retail, value: value});
        await mainContract.reportThrownAwayOneWayBottles(secondThrownAwayIdentifiersConsumerA, {from: collector});
        const penalty = await mainContract.getPenalty(consumerA);

        assert.equal(penalty, PENALTY_VALUE);
    });

    const thirdPurchaseIdentifersConsumerA = [19, 20];

    // function buyOneWayBottles(uint[] identifiers, address _address) public payable
    it("should fail to accept one way bottle purchase of 2 bottles because deposit value (2 ETH) does not include required penalty (0.4 ETH)", async() => {
        const value = thirdPurchaseIdentifersConsumerA.length * DEPOSIT_VALUE;
       
        try {
            await mainContract.buyOneWayBottles(thirdPurchaseIdentifersConsumerA, consumerA, {from: retail, value: value});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept one way bottle purchase even though required penalty was not included");
    });

    it("should accept one way bottle purchase of 2 bottles because deposit value (2.4 ETH) includes required penalty", async() => {
        const value = thirdPurchaseIdentifersConsumerA.length * (web3.toWei(1.2, "ether"));

        await mainContract.buyOneWayBottles(thirdPurchaseIdentifersConsumerA, consumerA, {from: retail, value: value});
    });

    // function returnOneWayBottles(uint[] identifiers, address _address) public
    it("should increase the penalty withdraw amount to 0.2 ETH because consumer A returned one of his bottles personally", async() => {
        await mainContract.returnOneWayBottles([19], consumerA, {from: retail});
        const amount = await mainContract.getPenaltyWithdrawAmount(consumerA);
        
        assert.equal(amount, PENALTY_VALUE);
    });

    // function withdrawPenalty() public
    it("should allow consumer A to withdraw his penalty (0.2 ETH)", async() => {
        const consumerBalanceBefore = await web3.eth.getBalance(consumerA);
        console.log("balance before: ", consumerBalanceBefore.toNumber());

        const withdrawTxInfo = await mainContract.withdrawPenalty({from: consumerA});
        const withdrawTx = await web3.eth.getTransaction(withdrawTxInfo.tx);
        const withdrawGasCost = withdrawTx.gasPrice.mul(withdrawTxInfo.receipt.gasUsed);
        console.log("withdraw gas cost: ", withdrawGasCost.toNumber());

        const consumerBalanceAfter = await web3.eth.getBalance(consumerA);
        console.log("balancer after: ", consumerBalanceAfter.toNumber());
    });

    // function returnOneWayBottles(uint[] identifiers, address _address) public
    it("should increase the seized penalties to 0.2 ETH because consumer A did not return one of his bottles personally", async() => {
        await mainContract.returnOneWayBottles([20], consumerB, {from: retail});
        
        assert.equal(await mainContract.seizedPenalties(), PENALTY_VALUE);
    });

    // function withdrawSeizedPenalties() public onlyOwner
    it("should fail to withdraw the seized penalties because the caller (requestor) is not the contract owner (owner)", async() => {
        try {
            await mainContract.withdrawSeizedPenalties({from: requestor});
        } catch (error) {
            return true;
        }

        throw new Error("Did allow withdrawal of seized penalties even though caller is not the contract owner");
    });

    it("should allow the contract owner to withdraw the seized penalties (0.2 ETH)", async() => {
        const ownerBalanceBefore = await web3.eth.getBalance(owner);
        console.log("balance before: ", ownerBalanceBefore.toNumber());

        const withdrawTxInfo = await mainContract.withdrawSeizedPenalties({from: owner});
        const withdrawTx = await web3.eth.getTransaction(withdrawTxInfo.tx);
        const withdrawGasCost = withdrawTx.gasPrice.mul(withdrawTxInfo.receipt.gasUsed);
        console.log("withdraw gas cost: ", withdrawGasCost.toNumber());

        const ownerBalanceAfter = await web3.eth.getBalance(owner);
        console.log("balancer after: ", ownerBalanceAfter.toNumber());
    });

    const forthPurchaseIdentifersConsumerA = [21];

    // function reportThrownAwayOneWayBottles(uint[] identifiers) public
    it("should set the seized penalties to 0.2 ETH (even though no penalty had to be payed upon its first purchase to the retailer) because consumer A was reported to have thrown away one of his bottles and has already thrown away 6 bottles which induced the penalty", async() => {
        const value = forthPurchaseIdentifersConsumerA.length * DEPOSIT_VALUE;
        await mainContract.buyOneWayBottles(forthPurchaseIdentifersConsumerA, retail, {from: bottler, value: value});
        const penalty = forthPurchaseIdentifersConsumerA.length * PENALTY_VALUE;
        await mainContract.buyOneWayBottles(forthPurchaseIdentifersConsumerA, consumerA, {from: retail, value: penalty});
        await mainContract.reportThrownAwayOneWayBottles(forthPurchaseIdentifersConsumerA, {from: collector});

        assert(await mainContract.seizedPenalties(), penalty);
    });

});