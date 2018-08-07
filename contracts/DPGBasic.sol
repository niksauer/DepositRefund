pragma solidity 0.4.24;

import "./DPG.sol";


contract DPGBasic is DPG {

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor(address _actorManager) public DPG(_actorManager) {}

    // MARK: - Public Methods
    function deposit(uint bottleCount) public payable {
        _deposit(bottleCount);
    }

    function refund(uint bottleCount) public {
        _refund(bottleCount);
    }

    function reportThrownAwayOneWayBottles(uint bottleCount) public {
        _reportThrownAwayOneWayBottles(bottleCount);
    }

}