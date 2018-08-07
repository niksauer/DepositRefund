var DPG = artifacts.require("./DPG.sol");
var DPGActorManager = artifacts.require("./DPGActorManager.sol");

module.exports = async(deployer, network, accounts) => {
	await deployer.deploy(DPGActorManager);
	await deployer.deploy(DPG, DPGActorManager.address);
};