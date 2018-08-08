const DPGPenalty = artifacts.require("DPGPenalty");
const DPGActorManager = artifacts.require("DPGActorManager");
const DPGToken = artifacts.require("DPGToken");

const DEPOSIT_VALUE = web3.toWei(1, "ether");


contract("DPG Penalty Test", async (accounts) => {
    let mainContract;
    let tokenContract;
    const owner = accounts[0];
    const requestor = accounts[1];
    const retail = accounts[2];
    const consumerA = accounts[3];
    const consumerB = accounts[4]
    const bottler = accounts[5]

    // hooks
    before("deploy contract with new actor manager dependency", async() => {
        const actorManagerContract = await DPGActorManager.new();
        mainContract = await DPGPenalty.new(actorManagerContract.address);
        const tokenContractAddress = await mainContract.token();
        tokenContract = await DPGToken.at(tokenContractAddress);
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
        const selfReturnedOneWays = await mainContract.getSelfReturnedOneWayBottlesByConsumer(consumerA);

        assert.equal(selfReturnedOneWays, firstPurchaseIdentifiersConsumerA.length);
    });

    const firstPurchaseIdentifiersConsumerB = [3]

    it("should set the number of foreign returned one way bottles to 1 for consumer B because retail reported return of 1 bottle purchased by consumer B but returned by consumer A", async() => {
        await mainContract.buyOneWayBottles(firstPurchaseIdentifiersConsumerB, consumerB, {from: retail});
        await mainContract.returnOneWayBottles(firstPurchaseIdentifiersConsumerB, consumerA, {from: retail});
        const foreignReturnedOneWays = await mainContract.getForeignReturnedOneWayBottlesByConsumer(consumerB);

        assert.equal(foreignReturnedOneWays, firstPurchaseIdentifiersConsumerB.length);
    });

    const firstNonsenseReturnConsumerA = [5];

    it("should not fail to accept report of returned bottles even though identifiers do not exist", async() => {
        try {
            await returnOneWayBottles(firstNonsenseReturnConsumerA, consumerA, {from: retail});
        } catch (error) {
            return false;
        }
    });

    it("should also not increase the the number of self returned one way bottles for consumer A because the bottle identifiers do not exist", async() => {
        const selfReturnedOneWays = await mainContract.getSelfReturnedOneWayBottlesByConsumer(consumerA);
        
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

    // function reportThrownAwayOneWayBottlesByConsumer(uint[] identifiers) public
    

});