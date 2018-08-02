const DPG = artifacts.require("DPG");

const DEPOSIT_VALUE = web3.toWei(1, "ether");

contract("DPG Test", async (accounts) => {
    it("should fail to accept deposits because bottle count (0) is not greater than or equal to one", async() => {
        let contract = await DPG.deployed();
        let bottles = 0;

        try {
            await contract.deposit(bottles);
        } catch (error) {
            return true;
        }

        throw new Error("Did accept deposits even though bottle count (0) is not greater than or equal to one");
    })

    it("should fail to accept deposits because value does not equal that of bottle count (3), ", async() => {
        let contract = await DPG.deployed();
        let bottles = 3;
        let value = 2.99 * DEPOSIT_VALUE;

        try {
            await contract.deposit(bottles, {value: value});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept deposits even though value does not equal that of bottle count (3)");
    })

    it("should accept deposits because bottle count (3) is greater than or equal to one and value equals that of bottle count", async () => {
        let contract = await DPG.deployed();
        let bottles = 3;
        let value = bottles * DEPOSIT_VALUE;

        await contract.deposit(bottles, {value: value});
        let contractBalance = await web3.eth.getBalance(contract.address);

        assert.equal(value, contractBalance);
    });

})