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


contract("DPG Report Purchase Test", async (accounts) => {
    const contract = await DPG.deployed();
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const reporter = accounts[0];
    const consumerA = accounts[1];
    const consumerB = accounts[2];

    // currentPeriodIndex
    it("should start with period index 1", async() => {
        assert.equal(await contract.currentPeriodIndex(), 1);
    });

    // function reportReusableBottlePurchase(address _address, uint count) public periodDependent
    it("should fail to accept reported count of purchased reusable bottles for consumer A because bottle count (0) is not greater than or equal to one (1)", async() => {
        const bottles = 0;

        try {
            await contract.reportReusableBottlePurchase(consumerA, bottles, {from: reporter});
            throw new Error("Did accept report even though bottle count (0) is not greater than or equal to one (1)");
        } catch (error) {
            return true;
        }
    });

    it("should fail to accept reported count of purchased reusable bottles (3) for consumer A because consumer's address (0x0) equals that of zero address", async() => {
        const bottles = 3;

        try {
            await contract.reportReusableBottlePurchase(zeroAddress, bottles, {from: reporter});
            throw new Error("Did accept report even though consumer's address (0x0) equals that of zero address");
        } catch (error) {
            return true;
        }
    });

    const firstPurchaseConsumerAPeriod1 = 100;

    it("should accept and set reported count of purchased reusable bottles for consumer A because bottle count (100) is greater than or equal to one (1) and consumer's addres does not equal zero address", async() => {
        await contract.reportReusableBottlePurchase(consumerA, firstPurchaseConsumerAPeriod1, {from: reporter});
        assert.equal(await contract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod1);
    });

    it("should also set accepted count of purchased reusable bottles as total purchases because it is the first purchase", async() => {        
        assert.equal(await contract.getReusableBottlePurchases(), firstPurchaseConsumerAPeriod1);
    });

    const secondPurchaseConsumerAPeriod1 = 50;

    it("should increase reported count of purchased reusable bottles for consumer A to 150 because another report of 50 bottles for consumer A is sent", async() => {
        await contract.reportReusableBottlePurchase(consumerA, secondPurchaseConsumerAPeriod1, {from: reporter});
        assert.equal(await contract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1);
    });

    it("should also increase total purchases to 150 because another report of 50 bottles was accepted previously", async() => {
        assert.equal(await contract.getReusableBottlePurchases(), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1);
    });

    const firstPurchaseConsumerBPeriod1 = 10;

    it("should set reported count of purchased reusable bottles for consumer B to 10 because another report of 10 bottles for consumer B is sent", async() => {
        await contract.reportReusableBottlePurchase(consumerB, firstPurchaseConsumerBPeriod1, {from: reporter});
        assert.equal(await contract.getReusableBottlePurchasesByConsumer(consumerB), firstPurchaseConsumerBPeriod1);
    });

    it("should also increase total purchases to 160 because another report of 10 bottles was accepted previously", async() => {
        assert.equal(await contract.getReusableBottlePurchases(), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1 + firstPurchaseConsumerBPeriod1);
    });

    it("should not change reported count of purchased bottles for consumer A because the previous report of 50 bottles was sent for consumer B", async() => {
        assert.equal(await contract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1);
    });

    const thirdPurchaseCustomerAPeriod1 = 20;

    it("should not set next accounting period (index: 2) upon reporting a purchase of 20 reusables bottles for consumer A because current time is only advanced by 3 weeks (21 days)", async() => {
        await timeTravel(86400 * 21);
        await mineBlock();
        
        await contract.reportReusableBottlePurchase(consumerA, thirdPurchaseCustomerAPeriod1, {from: reporter});
        const currentPeriodIndex = await contract.currentPeriodIndex();

        assert.equal(currentPeriodIndex, 1);
    });

    it("should also increase reported count of purchased bottles for consumer A to 170 because another report of 20 bottles was accepted previously and period was not advanced far enough", async() => {
        assert.equal(await contract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1 + thirdPurchaseCustomerAPeriod1);
    });

    it("should also increase total purchases to 180 because another report of 20 bottles was accepted previously and period was not advaced far enough", async() => {
        const reusableBottlePurchases = await contract.getReusableBottlePurchases();
        const expectedPurchases = firstPurchaseConsumerAPeriod1 + secondPurchaseConsumerAPeriod1 + firstPurchaseConsumerBPeriod1 + thirdPurchaseCustomerAPeriod1;
        
        assert.equal(reusableBottlePurchases, expectedPurchases);
    });

    const firstPurchaseConsumerBPeriod2 = 30;

    it("should set next accounting period (index: 2) upon reporting a purchase of 30 reusables bottles for consumer B because current time is advanced by 1 week (7 days)", async() => {
        await timeTravel(86400 * 7);
        await mineBlock();
        
        await contract.reportReusableBottlePurchase(consumerB, firstPurchaseConsumerBPeriod2, {from: reporter});
        const currentPeriodIndex = await contract.currentPeriodIndex();

        assert.equal(currentPeriodIndex, 2);
    });

    it("should also set reported count of purchased reusable bottles for consumer B to 30 because period was advanced", async() => {       
        assert.equal(await contract.getReusableBottlePurchasesByConsumer(consumerB), firstPurchaseConsumerBPeriod2);
    });

    const firstPurchaseConsumerAPeriod2 = 6;

    // should set total purchases accordingly (6)
    it("should set reported count of purchased resuable bottles for consumer A to 6 because a report of 6 bottles was sent for consumer A and period was advanced", async() => {
        await contract.reportReusableBottlePurchase(consumerA, firstPurchaseConsumerAPeriod2, {from: reporter});

        assert.equal(await contract.getReusableBottlePurchasesByConsumer(consumerA), firstPurchaseConsumerAPeriod2);
    });

    it("should also increase total purchases to 36 because another report of 6 bottles was accepted in addition to a previous of 30, both of which happened in a new period", async() => {
        assert.equal(await contract.getReusableBottlePurchases(), firstPurchaseConsumerBPeriod2 + firstPurchaseConsumerAPeriod2);
    });
    
    const firstPurchaseConsumerAPeriod3 = 8;

    it("should set next accounting period (index: 3) upon reporting a purchase of 8 reusables bottles for consumer A because current time is advanced by 4 week (28 days)", async() => {
        await timeTravel(86400 * 28);
        await mineBlock();
        
        await contract.reportReusableBottlePurchase(consumerA, firstPurchaseConsumerAPeriod3, {from: reporter});
        const currentPeriodIndex = await contract.currentPeriodIndex();

        assert.equal(currentPeriodIndex, 3);
    });

    it("should set reported count of purchased resuable bottles for consumer A to 8 because period was advanced", async() => {
        await contract.reportReusableBottlePurchase(consumerA, firstPurchaseConsumerAPeriod3, {from: reporter});
    });

});