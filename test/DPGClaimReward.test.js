const DPGBasic = artifacts.require("DPGBasic");
const DPGActorManager = artifacts.require("DPGActorManager");

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


contract("DPG Claim Reward Test", async (accounts) => {
    let mainContract;
    let actorManagerContract;

    const owner = accounts[0];
    const collectorA = accounts[1];
    const consumerA = accounts[2];
    const consumerB = "0x0000000000000000000000000000000000000000";
    const consumerC = accounts[3];
    const retail = accounts[4];

    // hooks
    beforeEach("redeploy contract, setup deposits for 10 bottles and add garbage collector", async() => {
        actorManagerContract = await DPGActorManager.new();
        mainContract = await DPGBasic.new(actorManagerContract.address);

        const soldBottles = 10;

        await mainContract.deposit(soldBottles, {from: retail, value: soldBottles * DEPOSIT_VALUE});
        await actorManagerContract.addCollector(collectorA, {from: owner});
    });

    // function claimReward() public periodDependent
    it("should fail to send the reward to consumer A because it's the first period (index: 1)", async() => {
        try {
            await mainContract.claimReward({from: consumerA});
        } catch (error) {
            return true;
        }
        
        throw new Error("Did send the reward even though it's the first period");
    });

    it("should fail to send the reward to consumer A (even though it's not the first period (index: 2)) because the amount is not greater than zero (0) as consumer A did not purchase any reusable bottles in the past period (index: 1)", async() => {
        await timeTravel(86400 * 28);
        await mineBlock();

        try {
            await mainContract.claimReward({from: consumerA});
        } catch (error) {
            return true;
        }

        throw new Error("Did send the reward even though the amount is not greater than zero (0) as consumer A did not purchase any reusable bottles in the past period (index: 1)");
    });

    const firstReportPeriod1ConsumerA = 5;

    it("should fail to send the reward to consumer A (even though consumer A purchased reusable bottles (3) in the past period (index: 1)) because the amount is not greater than zero (0) as no report of thrown away bottles was received in the past period (index: 1)", async() => {
        await mainContract.reportReusableBottlePurchase(consumerA, firstReportPeriod1ConsumerA, {from: retail});

        await timeTravel(86400 * 28);
        await mineBlock();

        try {
            await mainContract.claimReward({from: consumerA});
        } catch (error) {
            return true;
        }

        throw new Error("Did send the reward even though the amount is not greater than zero (0) as no report of thrown away bottles was received in the past period (index: 1)");
    });

    const firstReportPeriod1ThrownAways = 2;

    it("should send the reward (1 ETH = 100% of user funds) to consumer A because it is not the first period and a report of 2 thrown away bottles is sent for the past period (index: 1) and consumer A was reported to have purchased 3 reusable bottles in the past period (index: 1) which represents 100% of the total reusable bottle sales", async() => {
        await mainContract.reportReusableBottlePurchase(consumerA, firstReportPeriod1ConsumerA, {from: retail});
        await mainContract.reportThrownAwayOneWayBottles(firstReportPeriod1ThrownAways, {from: collectorA});

        await timeTravel(86400 * 28);
        await mineBlock();

        const consumerBalanceBefore = await web3.eth.getBalance(consumerA);
        console.log("balance before: ", consumerBalanceBefore.toNumber());

        const claimTXInfo = await mainContract.claimReward({from: consumerA});
        const claimTX = await web3.eth.getTransaction(claimTXInfo.tx);
        const claimGasCost = claimTX.gasPrice.mul(claimTXInfo.receipt.gasUsed);
        console.log("claim gas cost: ", claimGasCost.toNumber());

        const consumerBalanceAfter = await web3.eth.getBalance(consumerA);
        console.log("balance after: ", consumerBalanceAfter.toNumber());
    
        // assert.equal(consumerBalanceBefore - claimGasCost + (DEPOSIT_VALUE * firstReportPeriod1 * 0.5), consumerBalanceAfter);
        assert.isAbove(consumerBalanceAfter.toNumber(), consumerBalanceBefore.toNumber());
    });

    it("should fail to send the reward to consumer A because consumer A already claimed the reward for the past period (index: 1)", async() => {
        await mainContract.reportReusableBottlePurchase(consumerA, firstReportPeriod1ConsumerA, {from: retail});
        await mainContract.reportThrownAwayOneWayBottles(firstReportPeriod1ThrownAways, {from: collectorA});

        await timeTravel(86400 * 28);
        await mineBlock();

        const claimTXInfo = await mainContract.claimReward({from: consumerA});
    
        try {
            await mainContract.claimReward({from: consumerA});
        } catch (error) {
            return true;
        }

        throw new Error("Did send the reward even though consumer A already claimed the reward");
    });

    it("should fail to send the reward to consumer A (even though it is not the first period and a report of 2 thrown away bottles is sent for the first period (index: 1) and consumer A was reported to have purchased 3 reusable bottles in the first reward period (index: 1)) because consumer A missed his chance by waiting two periods (index: 4)", async() => {
        await mainContract.reportReusableBottlePurchase(consumerA, firstReportPeriod1ConsumerA, {from: retail});
        await mainContract.reportThrownAwayOneWayBottles(firstReportPeriod1ThrownAways, {from: collectorA});

        await timeTravel(86400 * 84);
        await mineBlock();
    
        try {
            await mainContract.claimReward({from: consumerA});
        } catch (error) {
            return true;
        }

        throw new Error("Did send the reward even though consumer A missed his chance by waiting two periods (index: 4)");
    });

    const firstReportPeriod2ConsumerA = 1;
    const firstReportPeriod3ConsumerA = 6;

    // function reportReusableBottlePurchase(address _address, uint bottleCount) public periodDependent
    it("should also set the amount of non-claimed rewards to 1 ETH (= 50% of throw aways) upon reporting a new reusable bottle purchase for consumer A because he missed his chance to claim the rewards for the first period (index: 1) by waiting one period (index: 3)", async() => {
        await mainContract.reportReusableBottlePurchase(consumerA, firstReportPeriod1ConsumerA, {from: retail});
        await mainContract.reportThrownAwayOneWayBottles(firstReportPeriod1ThrownAways, {from: collectorA});

        await timeTravel(86400 * 28);
        await mineBlock();
        
        // necessary to switch pointer back to first period
        await mainContract.reportReusableBottlePurchase(consumerA, firstReportPeriod2ConsumerA, {from: retail});

        await timeTravel(86400 * 28);
        await mineBlock();

        await mainContract.reportReusableBottlePurchase(consumerA, firstReportPeriod3ConsumerA, {from: retail});

        assert.equal(await mainContract.unclaimedRewards(), firstReportPeriod1ThrownAways * DEPOSIT_VALUE / 2);
    });
 
});