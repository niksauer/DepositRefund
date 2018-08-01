pragma solidity ^0.4.24;

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
    address owner;

    uint constant periodLength = 4 weeks;

    // TODO: how to calculate deposit value? how to account for fluctuation in ether's value?
    uint constant depositValue = 1 ether;

    // TODO: rationales are not supported
    uint constant shareOfAgencies = 0.5;
    uint approvedAgencies;
    mapping(address => EnvironmentalAgency) agencies;

    mapping(address => GarbageCollector) collectors;

    uint[] reusableBottlePurchasesInPeriod;
    uint[] thrownAwayOneWayBottlesInPeriod;

    // MARK: - Public Properties
    uint currentPeriodIndex;
    PeriodName public currentPeriodName;
    Period public periodA;
    Period public periodB;

    uint public unclaimedRewards;
    uint public agencyFund;

    // MARK: - Events
    // TODO: define events (may be used as UI update notifications)

    // MARK: - Modifier
    modifier onlyOwner() {
        if (msg.sender == owner) _;
    }

    modifier timeDependent() {
        Period memory period = getAccountingPeriod();

        if (now < period.start + periodLength) {
            _;
        } else {
            setNextPeriod();
            _;
        }
    }

    // MARK: - Initialization
    constructor() {
        owner = msg.sender;
        currentPeriodIndex = 1;
        currentPeriodName = PeriodName.A;
        periodA.index = currentPeriodIndex;
        periodA.start = now;
        unclaimedRewards = 0;
    }

    // MARK: - Private Methods
    function setNextPeriod() internal {
        Period storage period = getAccountingPeriod();
        require(now >= period.start + periodLength);

        reusableBottlePurchasesInPeriod.push(period.reusableBottlePurchases);
        thrownAwayOneWayBottlesInPeriod.push(period.thrownAwayOneWayBottles);

        if (currentPeriodName == PeriodName.A) {
            currentPeriodName = PeriodName.B;
        } else {
            currentPeriodName = PeriodName.A;
        }

        currentPeriodIndex = currentPeriodIndex + 1;

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

    function resetPeriod(Period period) internal {
        period.index = currentPeriodIndex;
        period.start = now;
        period.reusableBottlePurchases = 0;
        period.thrownAwayOneWayBottles = 0;
    }

    function resetConsumer(Consumer consumer) internal {
        if (consumer.lastResetPeriodIndex > 0 && !consumer.hasClaimedReward && consumer.reusableBottlePurchases > 0) {
            unclaimedRewards = unclaimedRewards + getRewardAmount(consumer.reusableBottlePurchases, consumer.lastResetPeriodIndex);
        }

        consumer.reusableBottlePurchases = 0;
        consumer.hasClaimedReward = false;
        consumer.lastResetPeriodIndex = currentPeriodIndex;
    }

    function getRewardAmount(uint reusableBottlePurchases, uint periodIndex) internal view returns (uint amount) {
        uint consumerShare = reusableBottlePurchases / reusableBottlePurchasesInPeriod[periodIndex];
        amount = consumerShare * (thrownAwayOneWayBottlesInPeriod[periodIndex] * depositValue) * (1 - shareOfAgencies);
    }

    function getDonationAmount() internal view returns (uint amount) {
        uint singleAgencyShare = (1 / approvedAgencies);
        amount = singleAgencyShare * agencyFund;
    }

    // MARK: - Public Methods
    // MARK: Deposit/Refund
    // leave deposit upon buying newly introduced bottle (i.e. bottle put into circulation through purchase)
    // TODO: use fallback function instead?
    function deposit(uint bottleCount) public payable {
        require(msg.value == bottleCount * depositValue);
    }

    // refund take-back point up to the amount of bottles it accepted
    // refund = amount * 0.25€ (for one-way bottles)
    // TODO: how to limit refunds to take-back points (use signed receipts)? how to guarantee single refund (track used receipts)?
    function refund(uint bottleCount) public {
        uint amount = bottleCount * depositValue;
        msg.sender.transfer(amount);
    }

    // MARK: Data Reporting
    // TODO: how to prove count and purchaser? how to limit reporting to retailers? how to guarantee single report?
    function reportReusableBottlePurchase(address _address, uint count) public timeDependent {
        Period storage period = getAccountingPeriod();
        Consumer storage consumer = period.consumers[_address];

        if (consumer.lastResetPeriodIndex < period.index) {
            resetConsumer(consumer);
        }

        consumer.reusableBottlePurchases = consumer.reusableBottlePurchases + count;
        period.reusableBottlePurchases = period.reusableBottlePurchases + count;
    }

    // TODO: how to prove count? how to guarantee single report?
    function reportThrownAwayBottles(uint count) public timeDependent {
        require(collectors[msg.sender].isApproved);

        Period storage period = getAccountingPeriod();
        period.thrownAwayOneWayBottles = period.thrownAwayOneWayBottles + count;

        agencyFund = agencyFund + (count * depositValue) * shareOfAgencies;
    }

    // MARK: Reward/Donation
    function claimReward() public timeDependent {
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

    function claimDonation() public timeDependent {
        require(currentPeriodIndex > 1);

        EnvironmentalAgency storage agency = agencies[msg.sender];
        require(agency.isApproved);
        require(agency.joined < now - periodLength);

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
            approvedAgencies = approvedAgencies - 1;
        }

        agency.isApproved = false;
        agency.isApprovalPending = false;
    }

    function addEnvironmentalAgency(address _address) public onlyOwner {
        EnvironmentalAgency storage agency = agencies[_address];
        require(!agency.isApproved);

        approvedAgencies = approvedAgencies + 1;

        agency.isApproved = true;
        agency.isApprovalPending = false;
        agency.joined = now;
    }

    // TODO: check if deletion makes sense here (delete agencies[_address])
    function removeEnvironmentalAgency(address _address) public onlyOwner {
        EnvironmentalAgency storage agency = agencies[_address];
        require(agency.isApproved);

        approvedAgencies = approvedAgencies - 1;

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

}