pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./DPGCore.sol";
import "./DPGToken.sol";


contract DPGPenalty is DPGCore {
    using SafeMath for uint;

    // MARK: - Types
    struct UserStatistic {
        uint thrownAwayOneWayBottles;
        uint selfReturnedOneWayBottles;
        uint foreignReturnedOneWayBottles;
        uint penaltyWithdrawAmount;
    }

    // MARK: - Public Properties
    uint public constant PENALTY_THRESHOLD = 5;
    uint public constant PENALTY_VALUE = 0.2 ether;

    DPGToken public token = new DPGToken();

    uint public seizedPenalties;

    // MARK: - Internal Properties
    mapping(address => UserStatistic) internal statisticByConsumer;
    mapping(uint => uint) internal penaltyByBottleId;

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor(address _actorManager) public DPGCore(_actorManager) {}

    // MARK: - Public Methods
    // => tested
    function buyOneWayBottles(uint[] _identifiers, address _address) public payable {
        uint newBottles = 0;
        uint oldBottles = 0;
        uint penalty = getPenalty(_address);

        for (uint i = 0; i < _identifiers.length; i++) {
            uint bottleId = _identifiers[i];
            
            if (!token.exists(bottleId)) {
                token.mint(_address, bottleId);
                newBottles = newBottles.add(1);
                penaltyByBottleId[bottleId] = penalty;
            } else {
                address owner = token.ownerOf(bottleId);
                
                if (owner != _address) {
                    token.safeTransferFrom(owner, _address, bottleId);
                    oldBottles = oldBottles.add(1);
                    increasePenaltyWithdraw(penaltyByBottleId[bottleId], owner);
                    penaltyByBottleId[bottleId] = penalty;
                }
            }
        }

        uint deposit = newBottles.mul(DEPOSIT_VALUE.add(penalty)) + oldBottles.mul(penalty);
        
        if (deposit > 0) {
            _deposit(deposit);    
        }
    }

    // => tested
    function returnOneWayBottles(uint[] _identifiers, address _address) public {
        for (uint i = 0; i < _identifiers.length; i++) {
            uint bottleId = _identifiers[i];

            if (!token.exists(bottleId)) {
                continue;
            }

            address owner = token.ownerOf(bottleId);
            token.burn(owner, bottleId);

            uint penalty = penaltyByBottleId[bottleId];

            if (owner == _address) {
                incrementSelfReturnedOneWayBottles(owner);
                increasePenaltyWithdraw(penalty, owner);
            } else {
                incrementForeignReturnedOneWayBottles(owner);
                seizedPenalties = seizedPenalties.add(penalty);
            }
        }
    }

    function refund(uint _bottleCount) public {
        _refund(_bottleCount);
    }

    // => tested
    function reportThrownAwayOneWayBottles(uint[] _identifiers) public {
        uint bottleCount = 0;

        for (uint i = 0; i < _identifiers.length; i++) {
            uint bottleId = _identifiers[i];

            if (!token.exists(bottleId)) {
                // bottle must be recognized as one way bottle in order to increment thrown away counter
                // bottleCount = bottleCount.add(1);
                continue;
            }

            bottleCount = bottleCount.add(1);

            address owner = token.ownerOf(bottleId);
            token.burn(owner, bottleId);
            
            incrementThrownAwayOneWayBottles(owner);
            
            uint penalty = penaltyByBottleId[bottleId];
            seizedPenalties = seizedPenalties.add(penalty);
        }

        if (bottleCount > 0) {
            _reportThrownAwayOneWayBottles(bottleCount);        
        }
    }

    // => tested
    function withdrawPenalty() public {
        uint amount = statisticByConsumer[msg.sender].penaltyWithdrawAmount;
        require(amount > 0);

        msg.sender.transfer(amount);
    }

    // => tested
    function withdrawSeizedPenalties() public onlyOwner {
        require(seizedPenalties > 0);

        msg.sender.transfer(seizedPenalties);
    }

    // MARK: - Getters
    function getSelfReturnedOneWayBottles(address _address) public view returns (uint) {
        return statisticByConsumer[_address].selfReturnedOneWayBottles;
    }

    function getForeignReturnedOneWayBottles(address _address) public view returns (uint) {
        return statisticByConsumer[_address].foreignReturnedOneWayBottles;
    }

    // https://github.com/trufflesuite/truffle/issues/569
    function getThrownAwayOneWayBottlesForConsumer(address _address) public view returns (uint) {
        return statisticByConsumer[_address].thrownAwayOneWayBottles;
    }

    // => tested
    function getPenaltyWithdrawAmount(address _address) public view returns (uint) {
        return statisticByConsumer[_address].penaltyWithdrawAmount;
    }

    // => tested
    function getPenalty(address _address) public view returns (uint) {
        return getThrownAwayOneWayBottlesForConsumer(_address).div(PENALTY_THRESHOLD).mul(PENALTY_VALUE);
    }

    function getMinimumDeposit(address _address, uint[] _identifiers) public view returns (uint) {
        uint newBottles = 0;
        uint oldBottles = 0;
        uint penalty = getPenalty(_address);

        for (uint i = 0; i < _identifiers.length; i++) {
            uint bottleId = _identifiers[i];
            
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

    function getMinimumDeposit(address _address, uint _bottleCount) public view returns (uint) {
        uint penalty = getPenalty(_address);
        return _bottleCount.mul(DEPOSIT_VALUE.add(penalty));
    }

    // MARK: - Private Methods
    function increasePenaltyWithdraw(uint _amount, address _address) internal {
        statisticByConsumer[_address].penaltyWithdrawAmount = statisticByConsumer[_address].penaltyWithdrawAmount.add(_amount);
    }

    function incrementSelfReturnedOneWayBottles(address _address) internal {
        statisticByConsumer[_address].selfReturnedOneWayBottles = statisticByConsumer[_address].selfReturnedOneWayBottles.add(1);
    }

    function incrementForeignReturnedOneWayBottles(address _address) internal {
        statisticByConsumer[_address].foreignReturnedOneWayBottles = statisticByConsumer[_address].foreignReturnedOneWayBottles.add(1);
    }

    function incrementThrownAwayOneWayBottles(address _address) internal {
        statisticByConsumer[_address].thrownAwayOneWayBottles = statisticByConsumer[_address].thrownAwayOneWayBottles.add(1);
    }

}