pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./DPG.sol";
import "./DPGToken.sol";


contract DPGPenalty is DPG {
    using SafeMath for uint;

    // MARK: - Types
    struct Statistic {
        uint thrownAwayOneWayBottles;
        uint selfReturnedOneWayBottles;
        uint foreignReturnedOneWayBottles;
        uint penaltyWithdrawAmount;
    }

    // MARK: - Private Properties
    mapping(address => Statistic) internal statistics;
    mapping(uint => uint) internal penaltyByTokenId;
    
    // MARK: - Public Properties
    uint public constant PENALTY_THRESHOLD = 5;
    uint public constant PENALTY_VALUE = 0.2 ether;

    DPGToken public token = new DPGToken();

    uint public seizedPenalties;

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor(address _actorManager) public DPG(_actorManager) {}

    // MARK: - Public Methods
    // => tested
    function buyOneWayBottles(uint[] identifiers, address _address) public payable {
        uint newBottles = 0;
        uint oldBottles = 0;
        uint penalty = getPenaltyByConsumer(_address);

        for (uint i = 0; i < identifiers.length; i++) {
            uint bottleId = identifiers[i];
            
            if (!token.exists(bottleId)) {
                token.mint(_address, bottleId);
                newBottles = newBottles.add(1);
                penaltyByTokenId[bottleId] = penalty;
            } else {
                address owner = token.ownerOf(bottleId);
                
                if (owner != _address) {
                    token.safeTransferFrom(owner, _address, bottleId);
                    oldBottles = oldBottles.add(1);
                    increasePenaltyWithdraw(penaltyByTokenId[bottleId], owner);
                    penaltyByTokenId[bottleId] = penalty;
                }
            }
        }

        uint minimumDeposit = newBottles.mul(DEPOSIT_VALUE.add(penalty)) + oldBottles.mul(penalty);
        
        if (minimumDeposit > 0) {
            _deposit(minimumDeposit);    
        }
    }

    // => tested
    function returnOneWayBottles(uint[] identifiers, address _address) public {
        for (uint i = 0; i < identifiers.length; i++) {
            uint bottleId = identifiers[i];

            if (!token.exists(bottleId)) {
                continue;
            }

            address owner = token.ownerOf(bottleId);
            token.burn(owner, bottleId);

            uint penalty = penaltyByTokenId[bottleId];

            if (owner == _address) {
                incrementSelfReturnedOneWayBottles(owner);
                increasePenaltyWithdraw(penalty, owner);
            } else {
                incrementForeignReturnedOneWayBottles(owner);
                seizedPenalties = seizedPenalties.add(penalty);
            }
        }
    }

    function refund(uint bottleCount) public {
        _refund(bottleCount);
    }

    // => tested
    function reportThrownAwayOneWayBottles(uint[] identifiers) public {
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
            
            incrementThrownAwayOneWayBottles(owner);
            
            uint penalty = penaltyByTokenId[bottleId];
            seizedPenalties = seizedPenalties.add(penalty);
        }

        if (bottleCount > 0) {
            _reportThrownAwayOneWayBottles(bottleCount);        
        }
    }

    // => tested
    function withdrawPenalty() public {
        uint amount = statistics[msg.sender].penaltyWithdrawAmount;
        require(amount > 0);

        msg.sender.transfer(amount);
    }

    // => tested
    function withdrawSeizedPenalties() public onlyOwner {
        require(seizedPenalties > 0);

        msg.sender.transfer(seizedPenalties);
    }

    // MARK: - Getters
    function getSelfReturnedOneWayBottlesByConsumer(address _address) public view returns (uint) {
        return statistics[_address].selfReturnedOneWayBottles;
    }

    function getForeignReturnedOneWayBottlesByConsumer(address _address) public view returns (uint) {
        return statistics[_address].foreignReturnedOneWayBottles;
    }

    function getThrownAwayOneWayBottlesByConsumer(address _address) public view returns (uint) {
        return statistics[_address].thrownAwayOneWayBottles;
    }

    // => tested
    function getPenaltyWithdrawAmountByConsumer(address _address) public view returns (uint) {
        return statistics[_address].penaltyWithdrawAmount;
    }

    // => tested
    function getPenaltyByConsumer(address _address) public view returns (uint) {
        return getThrownAwayOneWayBottlesByConsumer(_address).div(PENALTY_THRESHOLD).mul(PENALTY_VALUE);
    }

    function getMinimumDeposit(address _address, uint[] identifiers) public view returns (uint) {
        uint newBottles = 0;
        uint oldBottles = 0;
        uint penalty = getPenaltyByConsumer(_address);

        for (uint i = 0; i < identifiers.length; i++) {
            uint bottleId = identifiers[i];
            
            if (!token.exists(bottleId)) {
                newBottles = newBottles.add(1);
            } else {
                address owner = token.ownerOf(bottleId);
                
                if (owner != _address) {
                    oldBottles = oldBottles.add(1);
                }
            }
        }

        return newBottles.mul(DEPOSIT_VALUE.add(penalty)) + oldBottles.mul(penalty);
    }

    function getMinimumDeposit(address _address, uint bottleCount) public view returns (uint) {
        uint penalty = getPenaltyByConsumer(_address);
        return bottleCount.mul(DEPOSIT_VALUE.add(penalty));
    }

    // MARK: - Private Methods
    function increasePenaltyWithdraw(uint amount, address _address) internal {
        statistics[_address].penaltyWithdrawAmount = statistics[_address].penaltyWithdrawAmount.add(amount);
    }

    function incrementSelfReturnedOneWayBottles(address _address) internal {
        statistics[_address].selfReturnedOneWayBottles = statistics[_address].selfReturnedOneWayBottles.add(1);
    }

    function incrementForeignReturnedOneWayBottles(address _address) internal {
        statistics[_address].foreignReturnedOneWayBottles = statistics[_address].foreignReturnedOneWayBottles.add(1);
    }

    function incrementThrownAwayOneWayBottles(address _address) internal {
        statistics[_address].thrownAwayOneWayBottles = statistics[_address].thrownAwayOneWayBottles.add(1);
    }

}