const DPG = artifacts.require("DPG");

const DEPOSIT_VALUE = web3.toWei(1, "ether");


contract("DPG Test", async (accounts) => {
    let contract;

    beforeEach("redeploy contract for each test", async function () {
        contract = await DPG.new();
    });

    it("should fail to accept deposits because bottle count (0) is not greater than or equal to one (1)", async() => {
        let bottles = 0;

        try {
            await contract.deposit(bottles);
            throw new Error("Did accept deposits even though bottle count (0) is not greater than or equal to one (1)");
        } catch (error) {
            return true;
        }
    });

    it("should fail to accept deposits because value (2.99) does not equal that of bottle count (3), ", async() => {
        let bottles = 3;
        let value = 2.99 * DEPOSIT_VALUE;

        try {
            await contract.deposit(bottles, {value: value});
            throw new Error("Did accept deposits even though value (2.99) does not equal that of bottle count (3)");
        } catch (error) {
            return true;
        }
    });

    it("should accept deposits because bottle count (3) is greater than or equal to one (1) and value (3) equals that of bottle count (3)", async () => {
        let bottles = 3;
        let value = bottles * DEPOSIT_VALUE;

        await contract.deposit(bottles, {value: value});
        let contractBalance = await web3.eth.getBalance(contract.address);

        assert.equal(value, contractBalance);
    });

    it("should fail to refund deposits because bottle count (0) is not greater than or equal to one", async() => {});

});