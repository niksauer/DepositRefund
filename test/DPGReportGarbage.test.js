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


contract("DPG Report Garbage Test", async (accounts) => {
    const actorManagerContract = await DPGActorManager.deployed();
    let mainContract;
    
    const owner = accounts[0];
    const requestor = accounts[1];
    const collectorA = accounts[2];
    const collectorB = "0x0000000000000000000000000000000000000000";

    // hooks
    before("deploy contract with actor manager dependency", async() => {
        mainContract = await DPGBasic.new(actorManagerContract.address);
    });

    // function reportThrownAwayBottles(uint bottleCount) public periodDependent
    it("should fail to accept report count of thrown away bottles because bottle count (0) is not greater than or equal to one (1)", async() => {
        const bottles = 0;

        try {
            await mainContract.reportThrownAwayOneWayBottles(bottles, {from: collectorA});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept report even though bottle count (0) is not greater than or equal to one (1)");
    });

    it("should fail to accept reported count of thrown away bottles (3) because collector A is not an approved garbage collector", async() => {
        const bottles = 3;

        try {
            await mainContract.reportThrownAwayOneWayBottles(bottles, {from: collectorA});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept report even though collector A is not an approved garbage collector");
    });
    
    // function addGarbageCollector(address _address) public onlyOwner
    it("should fail to add collector A as an approved garbage collector because caller is not the contract owner", async() => {
        try {
            await actorManagerContract.addGarbageCollector(collectorA, {from: requestor});
        } catch (error) {
            return true;
        }

        throw new Error("Did add collector A even though caller is not the contract owner");
    });

    it("should add collector A as an approved garbage collector because caller is contract owner", async() => {
        await actorManagerContract.addGarbageCollector(collectorA, {from: owner});
        
        assert.isTrue(await actorManagerContract.isApprovedGarbageCollector(collectorA));
    });

    it("should fail to add collector B as an approved garbage collector because collector's address (0x0) equals that of zero address", async() => {
        try {
            await actorManagerContract.addGarbageCollector(collectorB, {from: owner});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept collector B as an approved gargabe collector even though collector's address (0x0) equals that of zero address");
    });

    it("should fail to add collector A as an approved garbage collector because collector A is already approved", async() => {
        try {
            await actorManagerContract.addGarbageCollector(collectorA, {from: owner});
        } catch (error) {
            return true;
        }

        throw new Error("Did accept collector A as an approved gargabe collector even though collector was already approved");
    });
    
    // // function reportThrownAwayBottles(uint bottleCount) public periodDependent
    const firstReportPeriod1 = 1;

    it("should accept and set reported count of thrown away bottles as total because bottle count (1) is greater than or equal to one (1) and collector A was approved as a garbage collector previously", async() => {
        await mainContract.reportThrownAwayOneWayBottles(firstReportPeriod1, {from: collectorA});
        
        assert.equal(await mainContract.getThrownAwayOneWayBottles(), firstReportPeriod1);
    });

    it("should also set the agency fund to 50% of the reported count's deposit value (0.5 ETH) because it is the first report", async() => {
        assert.equal(await mainContract.agencyFund(), firstReportPeriod1 * DEPOSIT_VALUE * 0.5);
    });
    
    const secondReportPeriod1 = 13;

    it("should increase reported count of thrown away bottles to 14 because another report of 13 bottles is sent by collector A", async() => {
        await mainContract.reportThrownAwayOneWayBottles(secondReportPeriod1, {from: collectorA});
        const thrownAways = await mainContract.getThrownAwayOneWayBottles();

        assert.equal(thrownAways.toNumber(), firstReportPeriod1 + secondReportPeriod1);
    });

    it("should also increase agency fund by 50% of reported count's deposit value (6.5 ETH) because another report of 13 bottles was accepted previously", async() => {
        assert.equal(await mainContract.agencyFund(), (firstReportPeriod1 + secondReportPeriod1) * DEPOSIT_VALUE * 0.5);
    });

    const firstReportPeriod2 = 50;

    it("should set reported count of thrown away bottles (50) as total because current time is advanced by 4 week (28 days)", async() => {
        await timeTravel(86400 * 28);
        await mineBlock();
        
        await mainContract.reportThrownAwayOneWayBottles(firstReportPeriod2, {from: collectorA});

        assert.equal(await mainContract.getThrownAwayOneWayBottles(), firstReportPeriod2);
    });

    it("should also increase agency fund by 50% of reported count's deposit value (25 ETH) because funds are not reset with each period", async() => {
        assert.equal(await mainContract.agencyFund(), (firstReportPeriod1 + secondReportPeriod1 + firstReportPeriod2) * DEPOSIT_VALUE * 0.5);
    });

});