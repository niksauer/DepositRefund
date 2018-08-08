// https://github.com/trufflesuite/truffle/issues/650
// https://github.com/trufflesuite/truffle/issues/501

var DPGPenalty = artifacts.require("./DPGPenalty.sol");
var DPGActorManager = artifacts.require("./DPGActorManager.sol");

module.exports = async(deployer, network, accounts) => {
	await deployer.deploy(DPGActorManager);
	await deployer.deploy(DPGPenalty, DPGActorManager.address);
};