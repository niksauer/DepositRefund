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


contract("DPG Report Purchase Test", async (accounts) => {
    let mainContract;
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const reporter = accounts[0];
    const consumerA = accounts[1];
    const consumerB = accounts[2];

    // hooks
    before("deploy contract with actor manager dependency", async() => {
        const actorManagerContract = await DPGActorManager.deployed();
        mainContract = await DPGBasic.new(actorManagerContract.address);
    });

    // currentPeriodIndex
    it("should start with period index 1", async() => {
        assert.equal(await mainContract.currentPeriodIndex(), 1);
    });

    // function reportReusableBottlePurchase(address _address, uint count) public periodDependent
    it("should fail to accept reported count of purchased reusable bottles for consumer A because bottle count (0) is not greater than or equal to one (1)", async() => {
        const bottles = 0;

        try {
            await mainContract.reportReusableBottlePurchase(consumerA, bottles, {from: reporter});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept report even though bottle count (0) is not greater than or equal to one (1)");
    });

    it("should fail to accept reported count of purchased reusable bottles (3) for consumer A because consumer's address (0x0) equals that of zero address", async() => {
        const bottles = 3;

        try {
            await mainContract.reportReusableBottlePurchase(zeroAddress, bottles, {from: reporter});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept report even though consumer's address (0x0) equals that of zero address");
    });

    const firstPurchaseConsumerAPeriod1 = 100;

    it("should accept and set reported count of purchased reusable bottles for consumer A because bottle count (100) is greater than or equal to one (1) and consumer's addres does not equal zero address", async() => {
        await mainContract.reportReusableBottlePurchase(consumerA, firstPurchaseConsumerAPeriod1, {from: reporter});

        assert.equal(await mainContract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod1);
    });

    it("should also set accepted count of purchased reusable bottles as total purchases because it is the first purchase", async() => {        
        assert.equal(await mainContract.getReusableBottlePurchases(), firstPurchaseConsumerAPeriod1);
    });

    const secondPurchaseConsumerAPeriod1 = 50;

    it("should increase reported count of purchased reusable bottles for consumer A to 150 because another report of 50 bottles for consumer A is sent", async() => {
        await mainContract.reportReusableBottlePurchase(consumerA, secondPurchaseConsumerAPeriod1, {from: reporter});

        assert.equal(await mainContract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1);
    });

    it("should also increase total purchases to 150 because another report of 50 bottles was accepted previously", async() => {
        assert.equal(await mainContract.getReusableBottlePurchases(), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1);
    });

    const firstPurchaseConsumerBPeriod1 = 10;

    it("should set reported count of purchased reusable bottles for consumer B to 10 because another report of 10 bottles for consumer B is sent", async() => {
        await mainContract.reportReusableBottlePurchase(consumerB, firstPurchaseConsumerBPeriod1, {from: reporter});

        assert.equal(await mainContract.getReusableBottlePurchasesByConsumer(consumerB), firstPurchaseConsumerBPeriod1);
    });

    it("should also increase total purchases to 160 because another report of 10 bottles was accepted previously", async() => {
        assert.equal(await mainContract.getReusableBottlePurchases(), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1 + firstPurchaseConsumerBPeriod1);
    });

    it("should not change reported count of purchased bottles for consumer A because the previous report of 50 bottles was sent for consumer B", async() => {
        assert.equal(await mainContract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1);
    });

    const thirdPurchaseCustomerAPeriod1 = 20;

    it("should not set next accounting period (index: 2) upon reporting a purchase of 20 reusables bottles for consumer A because current time is only advanced by 3 weeks (21 days)", async() => {
        await timeTravel(86400 * 21);
        await mineBlock();
        
        await mainContract.reportReusableBottlePurchase(consumerA, thirdPurchaseCustomerAPeriod1, {from: reporter});

        assert.equal(await mainContract.currentPeriodIndex(), 1);
    });

    it("should also increase reported count of purchased bottles for consumer A to 170 because another report of 20 bottles was accepted previously and period was not advanced far enough", async() => {
        assert.equal(await mainContract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1 + thirdPurchaseCustomerAPeriod1);
    });

    it("should also increase total purchases to 180 because another report of 20 bottles was accepted previously and period was not advaced far enough", async() => {
        const expectedPurchases = firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1 + firstPurchaseConsumerBPeriod1 + thirdPurchaseCustomerAPeriod1;
        
        assert.equal(await mainContract.getReusableBottlePurchases(), expectedPurchases);
    });

    const firstPurchaseConsumerBPeriod2 = 30;

    it("should set next accounting period (index: 2) upon reporting a purchase of 30 reusables bottles for consumer B because current time is advanced by 1 week (7 days)", async() => {
        await timeTravel(86400 * 7);
        await mineBlock();
        
        await mainContract.reportReusableBottlePurchase(consumerB, firstPurchaseConsumerBPeriod2, {from: reporter});

        assert.equal(await mainContract.currentPeriodIndex(), 2);
    });

    it("should also set reported count of purchased reusable bottles for consumer B to 30 because period was advanced", async() => {       
        assert.equal(await mainContract.getReusableBottlePurchasesByConsumer(consumerB), firstPurchaseConsumerBPeriod2);
    });

    const firstPurchaseConsumerAPeriod2 = 6;

    it("should set reported count of purchased resuable bottles for consumer A to 6 because a report of 6 bottles was sent for consumer A and period was advanced", async() => {
        await mainContract.reportReusableBottlePurchase(consumerA, firstPurchaseConsumerAPeriod2, {from: reporter});

        assert.equal(await mainContract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod2);
    });

    it("should also increase total purchases to 36 because another report of 6 bottles was accepted in addition to a previous of 30, both of which happened in a new period", async() => {
        assert.equal(await mainContract.getReusableBottlePurchases(), firstPurchaseConsumerBPeriod2 + firstPurchaseConsumerAPeriod2);
    });
    
    const firstPurchaseConsumerAPeriod3 = 8;

    it("should set next accounting period (index: 3) upon reporting a purchase of 8 reusables bottles for consumer A because current time is advanced by 4 week (28 days)", async() => {
        await timeTravel(86400 * 28);
        await mineBlock();
        
        await mainContract.reportReusableBottlePurchase(consumerA, firstPurchaseConsumerAPeriod3, {from: reporter});

        assert.equal(await mainContract.currentPeriodIndex(), 3);
    });

    it("should also set reported count of purchased resuable bottles for consumer A to 8 because period was advanced", async() => {
        assert.equal(await mainContract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod3);
    });

});