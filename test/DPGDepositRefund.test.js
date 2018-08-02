const DPG = artifacts.require("DPG");

const DEPOSIT_VALUE = web3.toWei(1, "ether");


contract("DPG Deposit/Refund Test", async (accounts) => {
    let contract;
    const creator = accounts[0];
    const consumerA = accounts[1];

    // hooks
    beforeEach("redeploy contract for each test", async function () {
        contract = await DPG.new();
    });

    // constructor() public
    // it("should set creator as the owner", async() => {
    //     assert.equal(await contract.owner(), creator);
    // });

    // it("should set current period index to 1", async() => {
    //     assert.equal(await contract.currentPeriodIndex(), 1);
    // });

    // it("should set current period name to A (0) ", async() => {
    //     assert.equal(await contract.currentPeriodName(), 0);
    // })

    // it("should set unclaimed rewards to 0", async() => {
    //     assert.equal(await contract.unclaimedRewards(), 0);
    // });

    // function deposit(uint bottleCount) public payable
    it("should fail to accept deposits because bottle count (0) is not greater than or equal to one (1)", async() => {
        const bottles = 0;

        try {
            await contract.deposit(bottles);
            throw new Error("Did accept deposits even though bottle count (0) is not greater than or equal to one (1)");
        } catch (error) {
            return true;
        }
    });

    it("should fail to accept deposits because value (2.99) does not equal that of bottle count (3), ", async() => {
        const bottles = 3;
        const value = 2.99 * DEPOSIT_VALUE;

        try {
            await contract.deposit(bottles, {value: value});
            throw new Error("Did accept deposits even though value (2.99) does not equal that of bottle count (3)");
        } catch (error) {
            return true;
        }
    });

    it("should accept deposits because bottle count (1) is greater than or equal to one (1) and value (1) equals that of bottle count (1)", async () => {
        const bottles = 1;
        const value = bottles * DEPOSIT_VALUE;

        await contract.deposit(bottles, {value: value});
        const contractBalance = await web3.eth.getBalance(contract.address);

        assert.equal(value, contractBalance);
    });

    it("should accept deposits because bottle count (2) is greater than or equal to one (1) and value (2) equals that of bottle count (2)", async () => {
        const bottles = 2;
        const value = bottles * DEPOSIT_VALUE;

        await contract.deposit(bottles, {value: value});
        const contractBalance = await web3.eth.getBalance(contract.address);

        assert.equal(value, contractBalance);
    });

    // function refund(uint bottleCount) public
    it("should fail to refund deposits because bottle count (0) is not greater than or equal to one (1)", async() => {
        const bottles = 0;

        try {
            await contract.refund(bottles);
            throw new Error("Did refund deposits even though bottle count (0) is not greater than or equal to one (1)");
        } catch (error) {
            return true;
        }
    });

    // it("should refund deposits because bottle count (1) is greater than or equal to one (1)", async() => {
    //     const bottles = 1;
    //     const value = bottles * DEPOSIT_VALUE;

    //     const consumerBalanceBefore = await web3.eth.getBalance(consumerA);

    //     const depositTXInfo = await contract.deposit(bottles, {value: value});
    //     const depositTX = await web3.eth.getTransaction(depositTXInfo.tx);
    //     const depositGasCost = depositTX.gasPrice.mul(depositTXInfo.receipt.gasUsed);

    //     const refundTXInfo = await contract.refund(bottles);
    //     const refundTX = await web3.eth.getTransaction(refundTXInfo.tx);
    //     const refundGasCost = refundTX.gasPrice.mul(refundTXInfo.receipt.gasUsed);

    //     const consumerBalanceAfter = await web3.eth.getBalance(consumerA);

    //     assert.equal(consumerBalanceBefore - depositGasCost - refundGasCost, consumerBalanceAfter);
    // });

    // it("should refund deposits because bottle count (2) is greater than or equal to one (1)", async() => {
    //     const bottles = 2;
    //     const value = bottles * DEPOSIT_VALUE;

    //     const consumerBalanceBefore = await web3.eth.getBalance(consumerA);

    //     const depositTXInfo = await contract.deposit(bottles, {value: value});
    //     const depositTX = await web3.eth.getTransaction(depositTXInfo.tx);
    //     const depositGasCost = depositTX.gasPrice.mul(depositTXInfo.receipt.gasUsed);

    //     const refundTXInfo = await contract.refund(bottles);
    //     const refundTX = await web3.eth.getTransaction(refundTXInfo.tx);
    //     const refundGasCost = refundTX.gasPrice.mul(refundTXInfo.receipt.gasUsed);

    //     const consumerBalanceAfter = await web3.eth.getBalance(consumerA);

    //     assert.equal(consumerBalanceBefore - depositGasCost - refundGasCost, consumerBalanceAfter);
    // });

});