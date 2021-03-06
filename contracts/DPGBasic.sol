pragma solidity 0.4.24;

import "./DPGCore.sol";


contract DPGBasic is DPGCore {

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor(address _actorManager) public DPGCore(_actorManager) {}

    // MARK: - Public Methods
    function deposit(uint _bottleCount) public payable {
        uint amount = _bottleCount.mul(DEPOSIT_VALUE); 
        _deposit(amount);
    }

    function refund(uint _bottleCount) public {
        _refund(_bottleCount);
    }

    function reportThrownAwayOneWayBottles(uint _bottleCount) public {
        _reportThrownAwayOneWayBottles(_bottleCount);
    }

}