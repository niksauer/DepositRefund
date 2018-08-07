pragma solidity 0.4.24;

import "./DPG.sol";
import "./DPGToken.sol";


contract DPGPenalty is DPG {

    // MARK: - Public Properties
    mapping(address => uint) internal thrownAwayOneWayBottlesByConsumer;

    mapping(address => uint) internal selfReturnedOneWayBottlesByConsumer;
    mapping(address => uint) internal foreignReturnedOneWayBottlesByConsumer;
    
    // MARK: - Public Properties
    DPGToken public token;

    // MARK: - Initialization
    constructor(address _actorManager) public DPG(_actorManager) {
        token = DPGToken(this);
    }

    // MARK: - Public Methods
    function buyOneWayBottles(uint[] identifiers, address _address) public payable {
        uint newBottles = 0;

        for (uint i = 0; i < identifiers.length; i++) {
            uint bottleId = identifiers[i];

            if (!token.exists(bottleId)) {
                token.mint(_address, bottleId);
                newBottles = newBottles + 1;
            } else {
                address owner = token.ownerOf(bottleId);
                token.safeTransferFrom(owner, _address, bottleId);
            }
        }

        _deposit(newBottles);
    }

    function returnOneWayBottles(uint[] identifiers, address _address) public {
        for (uint i = 0; i < identifiers.length; i++) {
            uint bottleId = identifiers[i];

            if (!token.exists(bottleId)) {
                continue;
            }

            address owner = token.ownerOf(bottleId);
            token.burn(owner, bottleId);

            if (owner == _address) {
                selfReturnedOneWayBottlesByConsumer[_address] = selfReturnedOneWayBottlesByConsumer[_address] + 1;
            } else {
                foreignReturnedOneWayBottlesByConsumer[owner] = foreignReturnedOneWayBottlesByConsumer[owner] + 1;
            }
        }
    }

    function refund(uint bottleCount) public {
        _refund(bottleCount);
    }

    function reportThrownAwayOneWayBottlesByConsumer(uint[] identifiers) public {
        uint bottleCount = 0;

        for (uint i = 0; i < identifiers.length; i++) {
            uint bottleId = identifiers[i];

            if (!token.exists(bottleId)) {
                // bottle must be recognized as one way bottle in order to increment counter
                // bottleCount = bottleCount + 1;
                continue;
            }

            bottleCount = bottleCount + 1;

            address owner = token.ownerOf(bottleId);
            token.burn(owner, bottleId);
            thrownAwayOneWayBottlesByConsumer[owner] = thrownAwayOneWayBottlesByConsumer[owner] + 1;
        }

        _reportThrownAwayOneWayBottles(bottleCount);
    }

}