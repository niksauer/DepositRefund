const DPGActorManager = artifacts.require("DPGActorManager");
const DPGBasic = artifacts.require("DPGBasic");
const DPGPenalty = artifacts.require("DPGPenalty");
const DPGToken = artifacts.require("DPGToken");

const DEPOSIT_VALUE = web3.toWei(1, "ether");

contract("DPG Gas Cost Test", async (accounts) => {
    // let mainContract;
    const owner = accounts[0];
    const retail = accounts[1];
    const collector = accounts[2];
    const consumer = accounts[3];
    const bottler = accounts[4];

    // constructor
    it("should output deployment gas cost for DPGActorManager, DPGBasic and DPGPenalty (including DPGToken)", async() => {
        const actorManagerContract = await DPGActorManager.new();
        const actorManagerReceipt = await web3.eth.getTransactionReceipt(actorManagerContract.transactionHash);
        console.log("DPGActorManager", actorManagerReceipt.gasUsed);

        const basicContract = await DPGBasic.new(actorManagerContract.address);
        const basicContractReceipt = await web3.eth.getTransactionReceipt(basicContract.transactionHash);
        console.log("DPGBasic", basicContractReceipt.gasUsed);

        const penaltyContract = await DPGPenalty.new(actorManagerContract.address);
        const penaltyContractReceipt = await web3.eth.getTransactionReceipt(penaltyContract.transactionHash);
        console.log("DPGPenalty", penaltyContractReceipt.gasUsed);
    });

    // DPGActorManager
    it("should output gas cost for DPGActorManager", async() => {
        const actorManagerContract = await DPGActorManager.new();

        // depends on number of accounts created in Ganache
        const iterations = accounts.length - 1;

        // addCollector()
        let totalAddCollectorGasCost = 0;

        for (i = 1; i <= iterations; i++) {
            const addCollectorTX = await actorManagerContract.addCollector(accounts[i], {from: owner});
            const gasCost = addCollectorTX.receipt.gasUsed
            totalAddCollectorGasCost = totalAddCollectorGasCost + gasCost;
            // console.log("addCollector()", gasCost);
        }

        const averageAddCollectorGasCost = totalAddCollectorGasCost/iterations;
        console.log("addCollector() - avg -", averageAddCollectorGasCost);
        
        // removeCollector()
        let totalRemoveCollectorGasCost = 0;

        for (i = 1; i <= iterations; i++) {
            const removeCollectorTX = await actorManagerContract.removeCollector(accounts[i], {from: owner});
            const gasCost = removeCollectorTX.receipt.gasUsed
            totalRemoveCollectorGasCost = totalRemoveCollectorGasCost + gasCost;
            // console.log("removeCollector()", gasCost);
        }

        const averageRemoveCollectorGasCost = totalRemoveCollectorGasCost / iterations;
        console.log("removeCollector() - avg -", averageRemoveCollectorGasCost);
    });

    // DPGBasic
    it("should output gas cost for DPGBasic", async() => {
        const actorManagerContract = await DPGActorManager.new();
        const mainContract = await DPGBasic.new(actorManagerContract.address);
        actorManagerContract.addCollector(collector, {from: owner});

        // adjust
        const maxBottles = 1000;

        // deposit()
        let totalDepositGasCost = 0;

        for (i = 1; i <= maxBottles; i++) {
            const depositTX = await mainContract.deposit(i, {value: i * DEPOSIT_VALUE, from: retail});
            const gasCost = depositTX.receipt.gasUsed;
            totalDepositGasCost = totalDepositGasCost + gasCost;
            // console.log("deposit()", gasCost);
        }

        const averageDepositGasCost = totalDepositGasCost / maxBottles;
        console.log("deposit() - avg -", averageDepositGasCost);
        
        // refund()
        let totalRefundGasCost = 0;

        for (i = 1; i <= maxBottles; i++) {
            const refundTX = await mainContract.refund(i, {from: retail});
            const gasCost = refundTX.receipt.gasUsed;
            totalRefundGasCost = totalRefundGasCost + gasCost;
            // console.log("refund()", gasCost);
        }

        const averageRefundGasCost = totalRefundGasCost / maxBottles;
        console.log("refund() - avg -", averageRefundGasCost);

        // reportThrownAwayOneWayBottles()
        let totalReportGasCost = 0;

        for (i = 1; i <= maxBottles; i++) {
            const reportTX = await mainContract.reportThrownAwayOneWayBottles(i, {from: collector});
            const gasCost = reportTX.receipt.gasUsed;
            totalReportGasCost = totalReportGasCost + gasCost;
            // console.log("reportThrownAwayOneWayBottles()", gasCost);
        }

        const averageReportGasCost = totalReportGasCost / maxBottles;
        console.log("reportThrownAwayOneWayBottles() - avg -", averageReportGasCost);

        // reportReusableBottlePurchase()
        let totalReportReusablesGasCost = 0;

        for (i = 1; i <= maxBottles; i++) {
            const reportReusablesTX = await mainContract.reportReusableBottlePurchase(consumer, i, {from: retail});
            const gasCost = reportReusablesTX.receipt.gasUsed;
            totalReportReusablesGasCost = totalReportReusablesGasCost + gasCost;
            // console.log("reportThrownAwayOneWayBottles()", gasCost);
        }

        const averageReportReusablesGasCost = totalReportReusablesGasCost / maxBottles;
        console.log("reportReusableBottlePurchase() - avg -", averageReportReusablesGasCost);
    });

    it("should output gas cost for DPGPenalty (buying and returning a bottle)", async() => {
        const actorManagerContract = await DPGActorManager.new();
        const mainContract = await DPGPenalty.new(actorManagerContract.address);
        actorManagerContract.addCollector(collector, {from: owner});

        // adjust
        const iterations = 500;
        const maxBottles = 10;

        // buyOneWayBottles()
        let totalBuyGasCost = 0;

        for (i = 0; i < iterations; i++) {
            const identifiers = [];

            for (j = 0; j < maxBottles; j++) {
                identifiers[j] = i * maxBottles + j + 1;
            }

            const buyTX = await mainContract.buyOneWayBottles(identifiers, retail, {value: identifiers.length * DEPOSIT_VALUE, from: bottler});
            const gasCost = buyTX.receipt.gasUsed;
            totalBuyGasCost = totalBuyGasCost + gasCost;
            // console.log("buyOneWayBottles()", gasCost);
        }

        const averageBuyGasCost = totalBuyGasCost / iterations;
        console.log("buyOneWayBottles() - avg -", averageBuyGasCost);

        // returnOneWayBottles()
        let totalReturnGasCost = 0;

        for (i = 0; i < iterations; i++) {
            const identifiers = [];

            for (j = 0; j < maxBottles; j++) {
                identifiers[j] = i * maxBottles + j + 1;
            }

            // adjust for foreign return
            const returnTX = await mainContract.returnOneWayBottles(identifiers, retail, {from: bottler});
            const gasCost = returnTX.receipt.gasUsed;
            totalReturnGasCost = totalReturnGasCost + gasCost;
            // console.log("returnOneWayBottles()", gasCost);
        }

        const averageReturnGasCost = totalReturnGasCost / iterations;
        console.log("returnOneWayBottles() - avg -", averageReturnGasCost);
    });
    
    it("should output gas cost for DPGPenalty (buying and further selling a bottle)", async() => {
        const actorManagerContract = await DPGActorManager.new();
        const mainContract = await DPGPenalty.new(actorManagerContract.address);
        actorManagerContract.addCollector(collector, {from: owner});

        // adjust
        const iterations = 200;
        const maxBottles = 50;

        // buyOneWayBottles()
        let totalBuyGasCost = 0;

        for (i = 0; i < iterations; i++) {
            const identifiers = [];

            for (j = 0; j < maxBottles; j++) {
                identifiers[j] = i * maxBottles + j + 1;
            }

            const buyTX = await mainContract.buyOneWayBottles(identifiers, retail, {value: identifiers.length * DEPOSIT_VALUE, from: bottler});
            const gasCost = buyTX.receipt.gasUsed;
            totalBuyGasCost = totalBuyGasCost + gasCost;
            // console.log("buyOneWayBottles()", gasCost);
        }

        const averageBuyGasCost = totalBuyGasCost / iterations;
        // console.log("buyOneWayBottles() - avg -", averageBuyGasCost);

        // buyOneWayBottles()
        let totalTransferGasCost = 0;

        for (i = 0; i < iterations; i++) {
            const identifiers = [];

            for (j = 0; j < maxBottles; j++) {
                identifiers[j] = i * maxBottles + j + 1;
            }

            const transferTX = await mainContract.buyOneWayBottles(identifiers, consumer, {from: retail});
            const gasCost = transferTX.receipt.gasUsed;
            totalTransferGasCost = totalTransferGasCost + gasCost;
            // console.log("buyOneWayBottles()", gasCost);
        }

        const averageTransferGasCost = totalTransferGasCost / iterations;
        console.log("buyOneWayBottles() - avg - transfer", averageTransferGasCost);
    });

    it("should output gas cost for DPGPenalty (reporting thrown away bottles)", async() => {
        const actorManagerContract = await DPGActorManager.new();
        const mainContract = await DPGPenalty.new(actorManagerContract.address);
        actorManagerContract.addCollector(collector, {from: owner});

        // adjust
        const iterations = 200;
        const maxBottles = 50;

        // buyOneWayBottles()
        let totalBuyGasCost = 0;

        for (i = 0; i < iterations; i++) {
            const identifiers = [];

            for (j = 0; j < maxBottles; j++) {
                identifiers[j] = i * maxBottles + j + 1;
            }

            const buyTX = await mainContract.buyOneWayBottles(identifiers, retail, {value: identifiers.length * DEPOSIT_VALUE, from: bottler});
            const gasCost = buyTX.receipt.gasUsed;
            totalBuyGasCost = totalBuyGasCost + gasCost;
            // console.log("buyOneWayBottles()", gasCost);
        }

        const averageBuyGasCost = totalBuyGasCost / iterations;
        // console.log("buyOneWayBottles() - avg -", averageBuyGasCost);

        // reportThrownAwayOneWayBottles()
        let totalReportGasCost = 0;

        for (i = 0; i < iterations; i++) {
            const identifiers = [];

            for (j = 0; j < maxBottles; j++) {
                identifiers[j] = i * maxBottles + j + 1;
            }

            const reportTX = await mainContract.reportThrownAwayOneWayBottles(identifiers, {from: collector});
            const gasCost = reportTX.receipt.gasUsed;
            totalReportGasCost = totalReportGasCost + gasCost;
            // console.log("reportThrownAwayOneWayBottles()", gasCost);
        }

        const averageReportGasCost = totalReportGasCost / iterations;
        console.log("reportThrownAwayOneWayBottles() - avg", averageReportGasCost);
    });

});