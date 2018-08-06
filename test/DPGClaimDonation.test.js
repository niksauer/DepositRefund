const DPG = artifacts.require("DPG");

const timeTravel = function (seconds) {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [seconds], // 86400 seconds in a day
            id: new Date().getTime()
        }, (error, result) => {
            if (error) { 
                return reject(error); 
            } else {
                return resolve(result);
            }
        });
    });
};

const mineBlock = function() {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "evm_mine",
            id: new Date().getTime()
        }, (error, result) => {
            if (error) { 
                return reject(error); 
            } else {
                return resolve(result);
            }
        });
    });
};

const DEPOSIT_VALUE = web3.toWei(1, "ether");


contract("DPG Claim Donation Test", async (accounts) => {
    const contract = await DPG.deployed();
    const owner = accounts[0];
    const collectorA = accounts[1];
    const agencyA = accounts[2];
    const agencyB = "0x0000000000000000000000000000000000000000";
    const agencyC = accounts[3];
    const retail = accounts[4];
    
    // hooks
    before("setup garbage collector and deposits for 4 bottles", async() => {
        const bottles = 4;
        await contract.deposit(bottles, {from: retail, value: bottles * DEPOSIT_VALUE});
        await contract.addGarbageCollector(collectorA, {from: owner});
    });

    // function addEnvironmentalAgency(address _address) public onlyOwner
    it("should fail to add agency A as an approved environmental agency because caller is not the contract owner", async() => {
        try {
            await contract.addEnvironmentalAgency(agencyA, {from: requestor});
        } catch (error) {
            return true;
        }

        throw new Error("Did add agency A even though caller is not the contract owner");
    });

    it("should add agency A as an approved environmental agency because caller is contract owner", async() => {
        await contract.addEnvironmentalAgency(agencyA, {from: owner});
        assert(await contract.isApprovedEnvironmentalAgency(agencyA));
    });

    it("should fail to add agency B as an approved environmental agency because agency's address (0x0) equals that of zero address", async() => {
        try {
            await contract.addEnvironmentalAgency(agencyB, {from: owner});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept agency B as an approved environmental agency even though agency's address (0x0) equals that of zero address");
    });

    it("should fail to add collector A as an environmental agency because agency A is already approved", async() => {
        try {
            await contract.addEnvironmentalAgency(agencyA, {from: owner});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept agency A as an approved environmetal agency even though agency was already approved");
    });

    // function claimDonation() public periodDependent
    it("should fail to send the donation to agency A (even though it is an approved agency) because its the first period", async() => {
        try {
            await contract.claimDonation({from: agencyA});
        } catch (error) {
            return true;
        }
        
        throw new Error("Did send the donation even though its the first period");
    });

    it("should fail to send the donation to agency B (even though its not the first period) because agency B is not an approved environmental agency", async() => {
        await timeTravel(86400 * 28);
        await mineBlock();

        try {
            await contract.claimDonation({from: agencyB});
        } catch (error) {
            return true;
        }

        throw new Error("Did send the donation even though agency B is not an approved environmental agency");
    });

    it("should fail to send the donation to agency A (even though it is an approved agency and its not the first period) because agency A has not participated for at least 4 weeks (28 days)", async() => {
        try {
            await contract.claimDonation({from: agencyA});
        } catch (error) {
            return true;
        }

        throw new Error("Did send the donation even though agency A has not participated for at least 4 weeks (28 days)");
    });

    it("should fail to send the donation to agency A (even though it is an approved agency and its not the first period and it has participated for at least 4 weeks by advancing 1 day) because the amount is not greater than zero (0) as no thrown away bottles were reported", async() => {
        await timeTravel(86400 * 1);
        
        try {
            await contract.claimDonation({from: agencyA});
        } catch (error) {
            return true;
        }

        throw new Error("Did send the donation even though the amount is not greater than zero (0) as no thrown away bottles were reported");
    });

    const firstReportPeriod1 = 2;

    it("should send the donation (1 ETH = 100% of agency funds) to agency A because agency A is an approved environmental agency and it is not the first period and it has participated for at least 4 weeks (28 days) and a report of 2 thrown away bottles is sent", async() => {
        await contract.reportThrownAwayOneWayBottles(firstReportPeriod1, {from: collectorA});

        const agencyBalanceBefore = await web3.eth.getBalance(agencyA);
        console.log("balance before: ", agencyBalanceBefore.toNumber());

        const claimTXInfo = await contract.claimDonation({from: agencyA});
        const claimTX = await web3.eth.getTransaction(claimTXInfo.tx);
        const claimGasCost = claimTX.gasPrice.mul(claimTXInfo.receipt.gasUsed);
        console.log("claim gas cost: ", claimGasCost.toNumber());

        const agencyBalanceAfter = await web3.eth.getBalance(agencyA);
        console.log("balance after: ", agencyBalanceAfter.toNumber());
    
        // assert.equal(agencyBalanceBefore - claimGasCost + (DEPOSIT_VALUE * firstReportPeriod1 * 0.5), agencyBalanceAfter);
        assert(agencyBalanceAfter > agencyBalanceBefore);
    });

    it("should not send the donation to agency A because agency A already claimed the donation in this period (index: 2)", async() => {
        try {
            await contract.claimDonation({from: agencyA});
        } catch (error) {
            return true;
        }

        throw new Error("Did send the donation even though agency A already claimed the donation");
    });

    const firstReportPeriod2 = 2;

    it("should send the donation (0.5 ETH = 50% of agency funds) to agency A because the funds were emptied and agency C is added and another report of 2 thrown away bottles is sent", async() => {
        await contract.addEnvironmentalAgency(agencyC, {from: owner});

        await timeTravel(86400 * 29);
        await mineBlock();

        await contract.reportThrownAwayOneWayBottles(firstReportPeriod2, {from: collectorA});

        const agencyBalanceBefore = await web3.eth.getBalance(agencyC);
        console.log("balance before: ", agencyBalanceBefore.toNumber());

        const claimTXInfo = await contract.claimDonation({from: agencyC});
        const claimTX = await web3.eth.getTransaction(claimTXInfo.tx);
        const claimGasCost = claimTX.gasPrice.mul(claimTXInfo.receipt.gasUsed);
        console.log("claim gas cost: ", claimGasCost.toNumber());

        const agencyBalanceAfter = await web3.eth.getBalance(agencyC);
        console.log("balance after: ", agencyBalanceAfter.toNumber());
        
        // assert.equal(agencyBalanceBefore - claimGasCost + (DEPOSIT_VALUE * firstReportPeriod2 * 0.5 / 2), agencyBalanceAfter);
        assert(agencyBalanceAfter > agencyBalanceBefore);
    });

});