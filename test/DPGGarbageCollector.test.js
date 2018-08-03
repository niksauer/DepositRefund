const DPG = artifacts.require("DPG");

const DEPOSIT_VALUE = web3.toWei(1, "ether");

contract("DPG Garbage Collector Test", async (accounts) => {
    const contract = await DPG.deployed();
    const owner = accounts[0];
    const collectorA = accounts[1];
    const collectorB = "0x0000000000000000000000000000000000000000";
    const requestor = accounts[2];

    // function reportThrownAwayBottles(uint bottleCount) public periodDependent
    it("should fail to accept report count of thrown away bottles because bottle count (0) is not greater than or equal to one (1)", async() => {
        const bottles = 0;

        try {
            await contract.reportThrownAwayOneWayBottles(bottles, {from: collectorA});
            throw new Error("Did accept report even though bottle count (0) is not greater than or equal to one (1)");
        } catch (error) {
            return true;
        }
    });

    it("should fail to accept reported count of thrown away bottles (3) because collector A is not an approved garbage collector", async() => {
        const bottles = 3;

        try {
            await contract.reportThrownAwayOneWayBottles(bottles, {from: collectorA});
            throw new Error("Did accept report even though collector A is not an approved garbage collector");
        } catch (error) {
            return true;
        }
    });
    
    // function addGarbageCollector(address _address) public onlyOwner
    it("should fail to add collector A as an approved garbage collector because requestor is not the contract owner", async() => {
        try {
            await contract.addGarbageCollector(collectorA, {from: requestor});
            throw new Error("Did add collector A even though requestor is not the contract owner");
        } catch (error) {
            return true;
        }
    });

    it("should add collector A as an approved garbage collector because caller is contract owner", async() => {
        await contract.addGarbageCollector(collectorA, {from: owner});
        assert(await contract.isApprovedGarbageCollector(collectorA));
    });

    it("should fail to add collector B as an approved garbage collector because collector's address (0x0) equals that of zero address", async() => {
        try {
            await contract.addGarbageCollector(collectorB, {from: owner});
            throw new Error("Did accept collector B as an approved gargabe collector even though collector's address (0x0) equals that of zero address");
        } catch (error) {
            return true;
        }
    });

    it("should fail to add collector A as an approved garbage collector because collector A is already approved", async() => {
        try {
            await contract.addGarbageCollector(collectorA, {from: owner});
            throw new Error("Did accept collector A as an approved gargabe collector even though collector was already approved");
        } catch (error) {
            return true;
        }
    });
    
    // // function reportThrownAwayBottles(uint bottleCount) public periodDependent
    const firstReportPeriod1 = 1;

    it("should accept and set reported count of thrown away bottles as total because bottle count (1) is greater than or equal to one (1) and collector A was approved as a garbage collector previously", async() => {
        await contract.reportThrownAwayOneWayBottles(firstReportPeriod1, {from: collectorA});

        assert.equal(await contract.getThrownAwayOneWayBottles(), firstReportPeriod1);
    });

    it("should also set the agency fund to 50% of the reported count's deposit value (0.5 ETH) because it is the first report", async() => {
        assert.equal(await contract.agencyFund(), firstReportPeriod1 * DEPOSIT_VALUE * 0.5);
    });
    
    const secondReportPeriod1 = 13;

    it("should increase reported count of thrown away bottles to 14 because another report of 13 bottles is sent by collector A", async() => {
        await contract.reportThrownAwayOneWayBottles(secondReportPeriod1, {from: collectorA});
        assert.equal(await contract.getThrownAwayOneWayBottles(), firstReportPeriod1 + secondReportPeriod1);
    });

    it("should also increase agency fund by 50% of reported count's deposit value (6.5 ETH) because another report of 13 bottles was accepted previously", async() => {
        assert.equal(await contract.agencyFund(), (firstReportPeriod1 + secondReportPeriod1) * DEPOSIT_VALUE * 0.5);
    });

});