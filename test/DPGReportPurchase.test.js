const DPG = artifacts.require("DPG");

const DEPOSIT_VALUE = web3.toWei(1, "ether");


contract("DPG Report Purchase Test", async (accounts) => {
    const contract = await DPG.deployed();
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const reporter = accounts[0];
    const consumerA = accounts[1];
    const consumerB = accounts[2];

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

    const firstValidPurchaseSize = 100;

    it("should accept and set reported count of purchased reusable bottles for consumer A because bottle count (100) is greater than or equal to one (1) and consumer's addres does not equal zero address", async() => {
        await contract.reportReusableBottlePurchase(consumerA, firstValidPurchaseSize, {from: reporter});
        assert(await contract.getReusableBottlePurchasesByConsumer(consumerA), firstValidPurchaseSize);
    });

    it("should also set accepted count of purchased reusable bottles as total purchases because it is the first purchase", async() => {        
        assert(await contract.getReusableBottlePurchases(), firstValidPurchaseSize);
    });

    const secondValidPurchaseSize = 50;

    it("should increase reported count of purchased reusable bottles for consumer A to 150 because another report of 50 bottles for consumer A is sent", async() => {
        await contract.reportReusableBottlePurchase(consumerA, secondValidPurchaseSize, {from: reporter});
        assert(await contract.getReusableBottlePurchasesByConsumer(consumerA), firstValidPurchaseSize + secondValidPurchaseSize);
    });

    it("should also increase total purchases to 150 because another report of 50 bottles was accepted previously", async() => {
        assert(await contract.getReusableBottlePurchases(), firstValidPurchaseSize + secondValidPurchaseSize);
    });

    // it("should set reported count of purchased reusable bottles (10) for consumer B and increase total purchases for current (index: 1) accounting period to 3+2+10", async() => {});
    // it("should only set reported count of purchased reusable bottles (10) for consumer B and not change that of consumer A (5) in current (index: 1) accounting period", async() => {});
    // it("should set next (index: 2) accounting period upon reporting purchase after 4 weeks", async() => {});
    // it("should reset reported count of purchased resuable bottles for consumer A upon reporting purchases (6) in next (index: 2) accounting period and set total purchases accordingly (6)", async() => {});
    // it("should reset reported count of purchased resuable bottles for consumer A upon reporting purchases (7) in next next (index: 3) accounting period and set total purchases accordingly (7)", async() => {});

});
    