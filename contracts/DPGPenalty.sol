pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./DPG.sol";
import "./DPGToken.sol";


contract DPGPenalty is DPG {
    using SafeMath for uint;

    // MARK: - Public Properties
    mapping(address => uint) internal thrownAwayOneWayBottlesByConsumer;

    mapping(address => uint) internal selfReturnedOneWayBottlesByConsumer;
    mapping(address => uint) internal foreignReturnedOneWayBottlesByConsumer;
    
    // MARK: - Public Properties
    DPGToken public token = new DPGToken();

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor(address _actorManager) public DPG(_actorManager) {}

    // MARK: - Public Methods
    function buyOneWayBottles(uint[] identifiers, address _address) public payable {
        uint newBottles = 0;

        for (uint i = 0; i < identifiers.length; i++) {
            uint bottleId = identifiers[i];

            if (!token.exists(bottleId)) {
                token.mint(_address, bottleId);
                newBottles = newBottles.add(1);
            } else {
                address owner = token.ownerOf(bottleId);
                
                if (owner != _address) {
                    token.safeTransferFrom(owner, _address, bottleId);
                }
            }
        }

        if (newBottles > 0) {
            _deposit(newBottles);
        }
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
                selfReturnedOneWayBottlesByConsumer[_address] = selfReturnedOneWayBottlesByConsumer[_address].add(1);
            } else {
                foreignReturnedOneWayBottlesByConsumer[owner] = foreignReturnedOneWayBottlesByConsumer[owner].add(1);
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
                // bottle must be recognized as one way bottle in order to increment thrown away counter
                // bottleCount = bottleCount.add(1);
                continue;
            }

            bottleCount = bottleCount.add(1);

            address owner = token.ownerOf(bottleId);
            token.burn(owner, bottleId);
            thrownAwayOneWayBottlesByConsumer[owner] = thrownAwayOneWayBottlesByConsumer[owner].add(1);
        }

        if (bottleCount > 0) {
            _reportThrownAwayOneWayBottles(bottleCount);        
        }
    }

    // MARK: - Getters
    function getSelfReturnedOneWayBottlesByConsumer(address _address) public view returns (uint) {
        return selfReturnedOneWayBottlesByConsumer[_address];
    }

    function getForeignReturnedOneWayBottlesByConsumer(address _address) public view returns (uint) {
        return foreignReturnedOneWayBottlesByConsumer[_address];
    }

    function getThrownAwayOneWayBottlesByBoncumser(address _address) public view returns (uint) {
        return thrownAwayOneWayBottlesByConsumer[_address];   
    }

}