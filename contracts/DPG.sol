pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./interfaces/IDPGActorManager.sol";
import "./interfaces/Ownable.sol";


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

    // MARK: - Private Properties
    IDPGActorManager internal actorManager;
    mapping(address => uint) internal lastClaimByAgency;

    PeriodName internal currentPeriodName;
    Period internal periodA;
    Period internal periodB;

    // MARK: - Public Properties
    uint public constant PERIOD_LENGTH = 4 weeks;
    uint public constant DEPOSIT_VALUE = 1 ether;

    uint public currentPeriodIndex;
    uint public currentPeriodStart;

    uint[] public reusableBottlePurchasesInPeriod;
    uint[] public thrownAwayOneWayBottlesInPeriod;

    uint public unclaimedRewards;
    uint public agencyFund;

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
        currentPeriodIndex = 1;
        currentPeriodStart = now;
        currentPeriodName = PeriodName.A;
        periodA.index = currentPeriodIndex;
        periodB.index = currentPeriodIndex.add(1);
        unclaimedRewards = 0;
    }

    // MARK: - Public Methods
    function () external payable {
        // fallback may only rely on 2300 gas (in worst case, i.e. contract-to-contract send) so that following accouning scheme might not be performed
        agencyFund = agencyFund.add(msg.value);
    }

    // MARK: Reporting
    // => tested
    function reportReusableBottlePurchase(address _address, uint bottleCount) public periodDependent {
        require(bottleCount > 0);
        require(_address != address(0));

        Period storage period = getAccountingPeriod();
        Consumer storage consumer = period.consumers[_address];

        if (consumer.lastResetPeriodIndex < currentPeriodIndex) {
            resetConsumer(consumer);
        }

        consumer.reusableBottlePurchases = consumer.reusableBottlePurchases.add(bottleCount);
        period.reusableBottlePurchases = period.reusableBottlePurchases.add(bottleCount);
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

        require(actorManager.isApprovedEnvironmentalAgency(msg.sender));

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

    function getReusableBottlePurchasesByConsumer(address _address) public view returns (uint) {
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

    // MARK: - Private Methods
    // MARK: Deposit/Refund
    // => tested
    function _deposit(uint minimum) internal {
        require(minimum > 0);

        require(msg.value >= minimum);

        if (msg.value > minimum) {
            agencyFund = agencyFund.add(msg.value - minimum);
        }
    }

    // => tested
    function _refund(uint bottleCount) internal {
        require(bottleCount > 0);

        uint amount = bottleCount.mul(DEPOSIT_VALUE);
        msg.sender.transfer(amount);
    }

    // MARK: Reporting
    // => tested
    function _reportThrownAwayOneWayBottles(uint bottleCount) internal periodDependent {
        require(bottleCount > 0);
        require(actorManager.isApprovedGarbageCollector(msg.sender));

        Period storage period = getAccountingPeriod();
        period.thrownAwayOneWayBottles = period.thrownAwayOneWayBottles.add(bottleCount);

        agencyFund = agencyFund.add(bottleCount.mul(DEPOSIT_VALUE).div(2));
    }

    // MARK: Accounting
    function setNextPeriod() internal {
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

    function getAccountingPeriod() internal view returns (Period storage) {
        return currentPeriodName == PeriodName.A ? periodA : periodB;
    }

    function getRewardPeriod() internal view returns (Period storage) {
        return currentPeriodName == PeriodName.A ? periodB : periodA;
    }

    function getRewardAmount(uint reusableBottlePurchases, uint periodIndex) internal view returns (uint) {
        uint totalReusableBottlePurchases = reusableBottlePurchasesInPeriod[periodIndex.sub(1)];
        uint thrownAwayOneWayBottles = thrownAwayOneWayBottlesInPeriod[periodIndex.sub(1)];

        if (reusableBottlePurchases == 0 || thrownAwayOneWayBottles == 0) {
            return 0;
        }

        // userShare * ((thrownAwayOneWayBottles * DEPOSIT_VALUE) / 2)
        return (reusableBottlePurchases.div(totalReusableBottlePurchases)).mul(thrownAwayOneWayBottles.mul(DEPOSIT_VALUE).div(2));
    }

    function getDonationAmount() internal view returns (uint) {
        uint agencyCount = actorManager.getCountOfApprovedAgencies();

        if (agencyCount == 0) {
            return 0;
        }

        // agencyFund / approvedAgencies
        return agencyFund.div(agencyCount);
    }

    function resetPeriod(Period storage period) internal {
        period.index = currentPeriodIndex;
        period.reusableBottlePurchases = 0;
        period.thrownAwayOneWayBottles = 0;
    }

    function resetConsumer(Consumer storage consumer) internal {
        if (!consumer.hasClaimedReward && consumer.lastResetPeriodIndex > 0) {
            unclaimedRewards = unclaimedRewards.add(getRewardAmount(consumer.reusableBottlePurchases, consumer.lastResetPeriodIndex));
        }

        consumer.reusableBottlePurchases = 0;
        consumer.hasClaimedReward = false;
        consumer.lastResetPeriodIndex = currentPeriodIndex;
    }

}