pragma solidity 0.4.24;


contract Ownable {

    // MARK: - Public Properties
    address public owner;

    // MARK: - Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner);
        
        _;
    }

    // MARK: - Initialization
    constructor(address _owner) public {
        owner = _owner;
    }
    
}