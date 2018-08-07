var DPGBasic = artifacts.require("./DPGBasic.sol");
var DPGActorManager = artifacts.require("./DPGActorManager.sol");

module.exports = async(deployer, network, accounts) => {
	await deployer.deploy(DPGActorManager);
	await deployer.deploy(DPGBasic, DPGActorManager.address);
};