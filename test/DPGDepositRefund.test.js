const DPG = artifacts.require("DPG");
const DPGActorManager = artifacts.require("DPGActorManager");

const DEPOSIT_VALUE = web3.toWei(1, "ether");


contract("DPG Deposit Refund Test", async (accounts) => {
    let mainContract;
    const owner = accounts[0];
    const consumerA = accounts[1];

    // hooks
    beforeEach("redeploy contract with new actor manager dependency for each test", async() => {
        const actorManagerContract = await DPGActorManager.new();
        mainContract = await DPG.new(actorManagerContract.address);
    });

    // function deposit(uint bottleCount) public payable
    it("should fail to accept deposits because bottle count (0) is not greater than or equal to one (1)", async() => {
        const bottles = 0;

        try {
            await mainContract.deposit(bottles);
        } catch (error) {
            return true;
        }

        throw new Error("Did accept deposits even though bottle count (0) is not greater than or equal to one (1)");
    });

    it("should fail to accept deposits because value (2.99) does not equal that of bottle count (3), ", async() => {
        const bottles = 3;

        try {
            await mainContract.deposit(bottles, {value: 2.99 * DEPOSIT_VALUE});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept deposits even though value (2.99) does not equal that of bottle count (3)");
    });

    it("should accept deposits because bottle count (1) is greater than or equal to one (1) and value (1) equals that of bottle count (1)", async () => {
        const bottles = 1;
        const value = bottles * DEPOSIT_VALUE;

        await mainContract.deposit(bottles, {value: value});
        const contractBalance = await web3.eth.getBalance(mainContract.address);

        assert.equal(value, contractBalance);
    });

    it("should accept deposits because bottle count (2) is greater than or equal to one (1) and value (2) equals that of bottle count (2)", async () => {
        const bottles = 2;
        const value = bottles * DEPOSIT_VALUE;

        await mainContract.deposit(bottles, {value: value});
        const contractBalance = await web3.eth.getBalance(mainContract.address);

        assert.equal(value, contractBalance);
    });

    // function refund(uint bottleCount) public
    it("should fail to refund deposits because bottle count (0) is not greater than or equal to one (1)", async() => {
        const bottles = 0;

        try {
            await mainContract.refund(bottles);
        } catch (error) {
            return true;
        }

        throw new Error("Did refund deposits even though bottle count (0) is not greater than or equal to one (1)");
    });

    it("should refund deposits because bottle count (1) is greater than or equal to one (1)", async() => {
        const bottles = 1;
        const value = bottles * DEPOSIT_VALUE;

        const consumerBalanceBefore = await web3.eth.getBalance(consumerA);
        console.log("balance before: ", consumerBalanceBefore.toNumber());

        const depositTXInfo = await mainContract.deposit(bottles, {value: value});
        const depositTX = await web3.eth.getTransaction(depositTXInfo.tx);
        const depositGasCost = depositTX.gasPrice.mul(depositTXInfo.receipt.gasUsed);
        console.log("deposit gas cost: ", depositGasCost.toNumber());

        const refundTXInfo = await mainContract.refund(bottles);
        const refundTX = await web3.eth.getTransaction(refundTXInfo.tx);
        const refundGasCost = refundTX.gasPrice.mul(refundTXInfo.receipt.gasUsed);
        console.log("refund gas cost: ", refundGasCost.toNumber());

        const consumerBalanceAfter = await web3.eth.getBalance(consumerA);
        console.log("balancer after: ", consumerBalanceAfter.toNumber());

        // assert.equal(consumerBalanceBefore - depositGasCost - refundGasCost, consumerBalanceAfter);
    });

    it("should refund deposits because bottle count (2) is greater than or equal to one (1)", async() => {
        const bottles = 2;
        const value = bottles * DEPOSIT_VALUE;

        const consumerBalanceBefore = await web3.eth.getBalance(consumerA);
        console.log("balance before: ", consumerBalanceBefore.toNumber());

        const depositTXInfo = await mainContract.deposit(bottles, {value: value});
        const depositTX = await web3.eth.getTransaction(depositTXInfo.tx);
        const depositGasCost = depositTX.gasPrice.mul(depositTXInfo.receipt.gasUsed);
        console.log("deposit gas cost: ", depositGasCost.toNumber());

        const refundTXInfo = await mainContract.refund(bottles);
        const refundTX = await web3.eth.getTransaction(refundTXInfo.tx);
        const refundGasCost = refundTX.gasPrice.mul(refundTXInfo.receipt.gasUsed);
        console.log("refund gas cost: ", refundGasCost.toNumber());

        const consumerBalanceAfter = await web3.eth.getBalance(consumerA);
        console.log("balancer after: ", consumerBalanceAfter.toNumber());

        // assert.equal(consumerBalanceBefore - depositGasCost - refundGasCost, consumerBalanceAfter);
    });

});