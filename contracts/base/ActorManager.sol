pragma solidity 0.4.24;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract ActorManager {
    using SafeMath for uint;

    // MARK: - Types
    struct Member {
        bool isApproved;
        uint joined;
    }

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor() public {}

    // MARK: - Internal Methods
    // => dont override
    function approve(Member storage _member) internal {
        require(!_member.isApproved);

        _member.isApproved = true;
        _member.joined = now;
    }

    // => dont override
    function deny(Member storage _member) internal {
        require(_member.isApproved);

        _member.isApproved = false;
    }

}