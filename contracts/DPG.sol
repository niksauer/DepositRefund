pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./base/Ownable.sol";
import "./interface/IDPGActorManager.sol";


contract DPG is Ownable {
    using SafeMath for uint;

    // MARK: - Types
    enum PeriodName { A, B }

    struct Consumer {
        uint reusableBottlePurchases;
        bool hasClaimedReward;
        uint lastResetPeriodIndex;
    }

    struct Period {
        uint index;
        uint reusableBottlePurchases;
        uint thrownAwayOneWayBottles;
        mapping(address => Consumer) consumers;
    }

    // MARK: - Public Properties
    uint public constant PERIOD_LENGTH = 4 weeks;
    uint public constant DEPOSIT_VALUE = 1 ether;

    uint public currentPeriodIndex = 1;
    uint public currentPeriodStart = now;

    uint[] public reusableBottlePurchasesInPeriod;
    uint[] public thrownAwayOneWayBottlesInPeriod;

    uint public unclaimedRewards;
    uint public agencyFund;

    // MARK: - Internal Properties
    IDPGActorManager internal actorManager;
    mapping(address => uint) internal lastClaimByAgency;

    // MARK: - Private Properties
    PeriodName private currentPeriodName = PeriodName.A;
    Period private periodA;
    Period private periodB;

    // MARK: - Modifier
    modifier periodDependent() {
        Period memory period = getAccountingPeriod();

        if (now < currentPeriodStart.add(PERIOD_LENGTH)) {
            _;
        } else {
            setNextPeriod();
            _;
        }
    }

    // MARK: - Initialization
    constructor(address _actorManager) public Ownable(msg.sender) {
        actorManager = IDPGActorManager(_actorManager);
        periodA.index = currentPeriodIndex;
        periodB.index = currentPeriodIndex.add(1);
    }

    // MARK: - Public Methods
    function () external payable {
        // fallback may only rely on 2300 gas (in worst case, i.e. contract-to-contract send) so that following accouning scheme might not be performed
        agencyFund = agencyFund.add(msg.value);
    }

    // MARK: Reporting
    // => tested
    function reportReusableBottlePurchase(address _address, uint _bottleCount) public periodDependent {
        require(_bottleCount > 0);
        require(_address != address(0));

        Period storage period = getAccountingPeriod();
        Consumer storage consumer = period.consumers[_address];

        if (consumer.lastResetPeriodIndex < currentPeriodIndex) {
            resetConsumer(consumer);
        }

        consumer.reusableBottlePurchases = consumer.reusableBottlePurchases.add(_bottleCount);
        period.reusableBottlePurchases = period.reusableBottlePurchases.add(_bottleCount);
    }

    // MARK: Reward/Donation
    // => tested
    function claimReward() public periodDependent {
        require(currentPeriodIndex > 1);

        Period storage period = getRewardPeriod();
        Consumer storage consumer = period.consumers[msg.sender];

        if (consumer.lastResetPeriodIndex < currentPeriodIndex.sub(1)) {
            revert();

            // resetConsumer(consumer);
            // return;
        }
 
        require(!consumer.hasClaimedReward);

        uint amount = getRewardAmount(consumer.reusableBottlePurchases, period.index);
        require(amount > 0);

        consumer.hasClaimedReward = true;
        msg.sender.transfer(amount);
    }

    // => tested
    function claimDonation() public periodDependent {
        require(currentPeriodIndex > 1);

        require(actorManager.isApprovedAgency(msg.sender));

        require(actorManager.getJoinedTimestampForAgency(msg.sender) < now.sub(PERIOD_LENGTH));

        Period memory period = getRewardPeriod();
        require(lastClaimByAgency[msg.sender] < period.index);

        uint amount = getDonationAmount();
        require(amount > 0);
        
        agencyFund = agencyFund.sub(amount);
        lastClaimByAgency[msg.sender] = period.index;
        msg.sender.transfer(amount);
    }

    // MARK: - Getters
    function getReusableBottlePurchases() public view returns (uint) {
        return getAccountingPeriod().reusableBottlePurchases;
    }

    // https://github.com/trufflesuite/truffle/issues/569
    function getReusableBottlePurchasesForConsumer(address _address) public view returns (uint) {
        return getAccountingPeriod().consumers[_address].reusableBottlePurchases;
    }

    function getThrownAwayOneWayBottles() public view returns (uint) {
        return getAccountingPeriod().thrownAwayOneWayBottles;
    }

    function hasClaimedDonation(address _address) public view returns (bool) {
        Period storage rewardPeriod = getRewardPeriod();
        return lastClaimByAgency[_address] == rewardPeriod.index;
    }

    function hasClaimedReward(address _address) public view returns (bool) {
        Period storage rewardPeriod = getRewardPeriod();
        return rewardPeriod.consumers[_address].hasClaimedReward;
    }

    function getDonationAmount() public view returns (uint) {
        uint agencyCount = actorManager.getCountOfApprovedAgencies();

        if (agencyCount == 0) {
            return 0;
        }

        // agencyFund / approvedAgencies
        return agencyFund.div(agencyCount);
    }

    function getRewardAmount(address _address) public view returns (uint) {
        Period storage period = getRewardPeriod();
        Consumer storage consumer = period.consumers[_address];

        if (consumer.lastResetPeriodIndex < currentPeriodIndex.sub(1)) {
            return 0;
        } else {
            return getRewardAmount(consumer.reusableBottlePurchases, period.index);
        }
    }

    // MARK: - Internal Methods
    // MARK: Deposit/Refund
    // => tested
    function _deposit(uint _amount) internal {
        require(_amount > 0);

        require(msg.value >= _amount);

        if (msg.value > _amount) {
            agencyFund = agencyFund.add(msg.value - _amount);
        }
    }

    // => tested
    function _refund(uint _bottleCount) internal {
        require(_bottleCount > 0);

        uint amount = _bottleCount.mul(DEPOSIT_VALUE);
        msg.sender.transfer(amount);
    }

    // MARK: Reporting
    // => tested
    function _reportThrownAwayOneWayBottles(uint _bottleCount) internal periodDependent {
        require(_bottleCount > 0);
        require(actorManager.isApprovedCollector(msg.sender));

        Period storage period = getAccountingPeriod();
        period.thrownAwayOneWayBottles = period.thrownAwayOneWayBottles.add(_bottleCount);

        agencyFund = agencyFund.add(_bottleCount.mul(DEPOSIT_VALUE).div(2));
    }

    function getAccountingPeriod() internal view returns (Period storage) {
        return currentPeriodName == PeriodName.A ? periodA : periodB;
    }

    function getRewardPeriod() internal view returns (Period storage) {
        return currentPeriodName == PeriodName.A ? periodB : periodA;
    }

    function getRewardAmount(uint _reusableBottlePurchases, uint _periodIndex) internal view returns (uint) {
        uint totalReusableBottlePurchases = reusableBottlePurchasesInPeriod[_periodIndex.sub(1)];
        uint thrownAwayOneWayBottles = thrownAwayOneWayBottlesInPeriod[_periodIndex.sub(1)];

        if (_reusableBottlePurchases == 0 || thrownAwayOneWayBottles == 0) {
            return 0;
        }

        // userShare * ((thrownAwayOneWayBottles * DEPOSIT_VALUE) / 2)
        return (_reusableBottlePurchases.div(totalReusableBottlePurchases)).mul(thrownAwayOneWayBottles.mul(DEPOSIT_VALUE).div(2));
    }

    // MARK: - Private Methods
    // MARK: Accounting
    function setNextPeriod() private {
        uint periodEnd = currentPeriodStart.add(PERIOD_LENGTH);
        require(now >= periodEnd);

        Period storage period = getAccountingPeriod();
        reusableBottlePurchasesInPeriod.push(period.reusableBottlePurchases);
        thrownAwayOneWayBottlesInPeriod.push(period.thrownAwayOneWayBottles);

        uint passedPeriods = ((now.sub(periodEnd)).div(PERIOD_LENGTH)).add(1);

        if (passedPeriods > 1) {
            for (uint i = 1; i < passedPeriods; i++) {
                reusableBottlePurchasesInPeriod.push(0);
                thrownAwayOneWayBottlesInPeriod.push(0);
            }
        }

        if (currentPeriodName == PeriodName.A) {
            currentPeriodName = PeriodName.B;
        } else {
            currentPeriodName = PeriodName.A;
        }

        currentPeriodIndex = currentPeriodIndex.add(passedPeriods);
        currentPeriodStart = periodEnd;

        period = getAccountingPeriod();
        resetPeriod(period);
    }

    function resetPeriod(Period storage _period) private {
        _period.index = currentPeriodIndex;
        _period.reusableBottlePurchases = 0;
        _period.thrownAwayOneWayBottles = 0;
    }

    function resetConsumer(Consumer storage _consumer) private {
        if (!_consumer.hasClaimedReward && _consumer.lastResetPeriodIndex > 0) {
            unclaimedRewards = unclaimedRewards.add(getRewardAmount(_consumer.reusableBottlePurchases, _consumer.lastResetPeriodIndex));
        }

        _consumer.reusableBottlePurchases = 0;
        _consumer.hasClaimedReward = false;
        _consumer.lastResetPeriodIndex = currentPeriodIndex;
    }

}