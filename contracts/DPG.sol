pragma solidity 0.4.24;

import "node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract DPG {

    // MARK: - Types
    enum PeriodName { A, B }

    struct Consumer {
        uint reusableBottlePurchases;
        bool hasClaimedReward;
        uint lastResetPeriodIndex;
    }

    struct Period {
        uint index;
        uint start;
        uint reusableBottlePurchases;
        uint thrownAwayOneWayBottles;
        mapping(address => Consumer) consumers;
    }

    struct EnvironmentalAgency {
        bool isApproved;
        bool isApprovalPending;
        uint lastClaimPeriodIndex;
        uint joined;
    }

    struct GarbageCollector {
        bool isApproved;
        bool isApprovalPending;
    }

    // MARK: - Private Properties
    address internal owner;

    uint internal approvedAgencies;
    mapping(address => EnvironmentalAgency) internal agencies;

    mapping(address => GarbageCollector) internal collectors;

    // MARK: - Public Properties
    uint public constant PERIOD_LENGTH = 4 weeks;

    // TODO: how to calculate deposit value? how to account for fluctuation in ether's value?
    uint public constant DEPOSIT_VALUE = 1 ether;

    // TODO: floats are not supported
    // uint public constant SHARE_OF_AGENCIES = 0.5;

    uint public currentPeriodIndex;
    PeriodName public currentPeriodName;
    Period public periodA;
    Period public periodB;

    uint[] public reusableBottlePurchasesInPeriod;
    uint[] public thrownAwayOneWayBottlesInPeriod;

    uint public unclaimedRewards;
    uint public agencyFund;

    // MARK: - Events
    // TODO: define events (may be used as UI update notifications)

    // MARK: - Modifier
    modifier onlyOwner() {
        if (msg.sender == owner) _;
    }

    modifier periodDependent() {
        Period memory period = getAccountingPeriod();

        if (now < SafeMath.add(period.start, PERIOD_LENGTH)) {
            _;
        } else {
            setNextPeriod();
            _;
        }
    }

    // MARK: - Initialization
    constructor() public {
        owner = msg.sender;
        currentPeriodIndex = 1;
        currentPeriodName = PeriodName.A;
        periodA.index = currentPeriodIndex;
        periodA.start = now;
        unclaimedRewards = 0;
    }

    // MARK: - Public Methods
    // MARK: Deposit/Refund
    // leave deposit upon buying newly introduced bottle (i.e. bottle put into circulation through purchase)
    // TODO: use fallback function instead?
    function deposit(uint bottleCount) public payable {
        require(bottleCount > 0);
        require(msg.value == SafeMath.mul(bottleCount, DEPOSIT_VALUE));
    }

    // refund take-back point up to the amount of bottles it accepted
    // refund = amount * 0.25€ (for one-way bottles)
    // TODO: how to limit refunds to take-back points (use signed receipts)? how to guarantee single refund (track used receipts)?
    function refund(uint bottleCount) public {
        uint amount = SafeMath.mul(bottleCount, DEPOSIT_VALUE);
        require(amount > 0);

        msg.sender.transfer(amount);
    }

    // MARK: Data Reporting
    // TODO: how to prove count and purchaser? how to limit reporting to retailers? how to guarantee single report?
    function reportReusableBottlePurchase(address _address, uint count) public periodDependent {
        Period storage period = getAccountingPeriod();
        Consumer storage consumer = period.consumers[_address];

        if (consumer.lastResetPeriodIndex < period.index) {
            resetConsumer(consumer);
        }

        consumer.reusableBottlePurchases = SafeMath.add(consumer.reusableBottlePurchases, count);
        period.reusableBottlePurchases = SafeMath.add(period.reusableBottlePurchases, count);
    }

    // TODO: how to prove count? how to guarantee single report?
    function reportThrownAwayBottles(uint count) public periodDependent {
        require(collectors[msg.sender].isApproved);

        Period storage period = getAccountingPeriod();
        period.thrownAwayOneWayBottles = SafeMath.add(period.thrownAwayOneWayBottles, count);

        agencyFund = SafeMath.add(agencyFund, SafeMath.div(SafeMath.mul(count, DEPOSIT_VALUE), 2));
    }

    // MARK: Reward/Donation
    function claimReward() public periodDependent {
        require(currentPeriodIndex > 1);

        Period storage period = getRewardPeriod();
        Consumer storage consumer = period.consumers[msg.sender];

        if (consumer.lastResetPeriodIndex < period.index) {
            resetConsumer(consumer);
        } else {
            require(!consumer.hasClaimedReward && consumer.reusableBottlePurchases > 0);

            uint amount = getRewardAmount(consumer.reusableBottlePurchases, period.index);
            require(amount > 0);

            msg.sender.transfer(amount);
            consumer.hasClaimedReward = true;
        }
    }

    function claimDonation() public periodDependent {
        require(currentPeriodIndex > 1);

        EnvironmentalAgency storage agency = agencies[msg.sender];
        require(agency.isApproved);
        require(agency.joined < SafeMath.sub(now, PERIOD_LENGTH));

        Period memory period = getRewardPeriod();
        require(agency.lastClaimPeriodIndex < period.index);

        uint amount = getDonationAmount();
        require(amount > 0);

        msg.sender.transfer(amount);
        agency.lastClaimPeriodIndex = period.index;
    }

    // MARK: Environmental Agencies
    function registerAsEnvironmentalAgency() public {
        EnvironmentalAgency storage requester = agencies[msg.sender];
        require(!requester.isApproved && !requester.isApprovalPending);

        requester.isApprovalPending = true;
    }

    // TODO: check if deletion from mapping makes sense here (delete agencies[msg.sender])
    function unregisterAsEnvironmentalAgency() public {
        EnvironmentalAgency storage agency = agencies[msg.sender];
        require(agency.isApproved || agency.isApprovalPending);

        if (agency.isApproved) {
            approvedAgencies = SafeMath.sub(approvedAgencies, 1);
        }

        agency.isApproved = false;
        agency.isApprovalPending = false;
    }

    function addEnvironmentalAgency(address _address) public onlyOwner {
        EnvironmentalAgency storage agency = agencies[_address];
        require(!agency.isApproved);

        approvedAgencies = SafeMath.add(approvedAgencies, 1);

        agency.isApproved = true;
        agency.isApprovalPending = false;
        agency.joined = now;
    }

    // TODO: check if deletion makes sense here (delete agencies[_address])
    function removeEnvironmentalAgency(address _address) public onlyOwner {
        EnvironmentalAgency storage agency = agencies[_address];
        require(agency.isApproved);

        approvedAgencies = SafeMath.sub(approvedAgencies, 1);

        agency.isApproved = false;
        agency.isApprovalPending = false;
    }

    // MARK: Garbage Collectors
    function registerAsGarbageCollector() public {
        GarbageCollector storage requester = collectors[msg.sender];
        require(!requester.isApproved && !requester.isApprovalPending);

        requester.isApprovalPending = true;
    }

    // TODO: check if deletion makes sense here (delete collectors[msg.sender])
    function unregisterAsGarbageCollector() public {
        GarbageCollector storage collector = collectors[msg.sender];
        require(collector.isApproved || collector.isApprovalPending);

        collector.isApproved = false;
        collector.isApprovalPending = false;
    }

    function addGarbageCollector(address _address) public onlyOwner {
        GarbageCollector storage collector = collectors[_address];
        require(!collector.isApproved);

        collector.isApproved = true;
        collector.isApprovalPending = false;
    }

    // TODO: check if deletion makes sense here (delete collectors[_address])
    function removeGarbageCollector(address _address) public onlyOwner {
        GarbageCollector storage collector = collectors[_address];
        require(collector.isApproved);

        collector.isApproved = false;
        collector.isApprovalPending = false;
    }

    // MARK: - Private Methods
    function setNextPeriod() internal {
        Period storage period = getAccountingPeriod();
        require(now >= SafeMath.add(period.start, PERIOD_LENGTH));

        reusableBottlePurchasesInPeriod.push(period.reusableBottlePurchases);
        thrownAwayOneWayBottlesInPeriod.push(period.thrownAwayOneWayBottles);

        if (currentPeriodName == PeriodName.A) {
            currentPeriodName = PeriodName.B;
        } else {
            currentPeriodName = PeriodName.A;
        }

        currentPeriodIndex = SafeMath.add(currentPeriodIndex, 1);

        if (currentPeriodIndex > 2) {
            period = getAccountingPeriod();
            resetPeriod(period);
        }
    }

    function getAccountingPeriod() internal view returns (Period storage) {
        return currentPeriodName == PeriodName.A ? periodA : periodB;
    }

    function getRewardPeriod() internal view returns (Period storage) {
        return currentPeriodName == PeriodName.A ? periodB : periodA;
    }

    function resetPeriod(Period period) internal view {
        period.index = currentPeriodIndex;
        period.start = now;
        period.reusableBottlePurchases = 0;
        period.thrownAwayOneWayBottles = 0;
    }

    function resetConsumer(Consumer consumer) internal {
        if (consumer.lastResetPeriodIndex > 0 && !consumer.hasClaimedReward && consumer.reusableBottlePurchases > 0) {
            unclaimedRewards = SafeMath.add(unclaimedRewards, getRewardAmount(consumer.reusableBottlePurchases, consumer.lastResetPeriodIndex));
        }

        consumer.reusableBottlePurchases = 0;
        consumer.hasClaimedReward = false;
        consumer.lastResetPeriodIndex = currentPeriodIndex;
    }

    function getRewardAmount(uint reusableBottlePurchases, uint periodIndex) internal view returns (uint amount) {
        uint totalReusableBottlePurchases = reusableBottlePurchasesInPeriod[periodIndex];
        uint thrownAwayOneWayBottles = thrownAwayOneWayBottlesInPeriod[periodIndex];

        // userShare * ((thrownAwayOneWayBottles * DEPOSIT_VALUE) / 2)
        amount = SafeMath.mul(SafeMath.div(reusableBottlePurchases, totalReusableBottlePurchases), SafeMath.div(SafeMath.mul(thrownAwayOneWayBottles, DEPOSIT_VALUE), 2));
    }

    function getDonationAmount() internal view returns (uint amount) {
        // agencyShare * agencyFund
        amount = SafeMath.mul(SafeMath.div(1, approvedAgencies), agencyFund);
    }

}