pragma solidity 0.4.24;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract ActorManager {
    using SafeMath for uint;

    // MARK: - Types
    struct Actor {
        bool isApproved;
        uint joined;
    }

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor() public {}

    // MARK: - Internal Methods
    // => dont override
    function approve(Actor storage _actor) internal {
        require(!_actor.isApproved);

        _actor.isApproved = true;
        _actor.joined = now;
    }

    // => dont override
    function deny(Actor storage _actor) internal {
        require(_actor.isApproved);

        _actor.isApproved = false;
    }

}