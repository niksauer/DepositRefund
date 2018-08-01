pragma solidity ^0.4.24;

contract DPG {

    // MARK: - Types
    enum Period { A, B }

    struct Consumer {
        uint reusableBottlePurchases;
        bool hasClaimedReward;
    }

    struct AccountingPeriod {
        uint startTime;
        uint reusableBottlePurchases;
        uint thrownAwayOneWayBottles;
        mapping(address => Consumer) consumers;
    }

    struct EnvironmentalAgency {
        bool isApproved;
        bool isApprovalPending;
        bool hasClaimedDonation;
    }

    struct GarbageCollector {
        bool isApproved;
        bool isApprovalPending;
    }

    // MARK: - Private Properties
    address owner;

    // TODO: how to calculate deposit value? how to account for fluctuation in ether's value?
    uint depositValue = 1 ether;

    // TODO: rationales are not supported
    uint shareOfAgencies = 0.5;
    uint approvedAgencies;
    mapping(address => EnvironmentalAgency) agencies;

    mapping(address => GarbageCollector) collectors;

    // MARK: - Public Properties
    uint periodLength = 4 weeks;
    Period public currentPeriod;
    AccountingPeriod public periodA;
    AccountingPeriod public periodB;

    // MARK: - Events
    // TODO: define events (may be used as UI update notifications)

    // MARK: - Modifier
    modifier onlyOwner() {
        if (msg.sender == owner) _;
    }

    // MARK: - Initialization
    constructor() {
        owner = msg.sender;
        currentPeriod = Period.A;
        periodA.starTime = now;
        // TODO: check initialization of properties
    }

    // MARK: - Private Methods
    function getCurrentPeriod() internal returns (AccountingPeriod storage) {
        return currentPeriod == Period.A ? periodA : periodB;
    }

    function getRewardPeriod() internal returns (AccountingPeriod storage) {
        return currentPeriod == Period.A ? periodB : periodA;
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

    // DATA REPORTING
    // TODO: how to prove count? how to guarantee single report?
    function reportThrownAwayBottles(uint count) public {
        require(collectors[msg.sender].isApproved);

        AccountingPeriod storage period = getCurrentPeriod();
        period.thrownAwayOneWayBottles = period.thrownAwayOneWayBottles + count;
    }

    // TODO: how to prove count and purchaser? how to limit reporting to retailers? how to guarantee single report?
    function reportReusableBottlePurchase(address purchaser, uint count) public {
        AccountingPeriod storage period = getCurrentPeriod();
        period.consumers[msg.sender].reusableBottlePurchases = period.consumers[msg.sender].reusableBottlePurchases + count;
        period.reusableBottlePurchases = period.reusableBottlePurchases + count;
    }

    // REWARDS/DONATIONS
    function unlockReward() public {
        
        /*if (currentPeriod == Period.A) {
            currentPeriod = Period.B;
        } else {
            currentPeriod = Period.A;
        }*/

        // previousThrownAwayOneWayBottleCount = currentThrownAwayOneWayBottleCount;
        //previousReusableBottlePurchasesTotal = currentReusableBottlePurchasesTotal;
        // TODO: can't assign mappings
        //previousReusableBottlePurchasesForAddress = currentReusableBottlePurchasesForAddress;

        //currentThrownAwayOneWayBottleCount = 0;
        //currentReusableBottlePurchasesTotal = 0;
        // TODO: reset mapping purchases count to addresses
    }

    // TODO: how to handle remaining non-claimed rewards/donations?
    function claimDonation() public {
        EnvironmentalAgency storage agency = agencies[msg.sender];
        require(agency.isApproved && !agency.hasClaimedDonation);

        AccountingPeriod storage period = getRewardPeriod();
        uint share = 1 / approvedAgencies;
        uint amount = share * (period.thrownAwayOneWayBottles * depositValue) * shareOfAgencies;
        msg.sender.transfer(amount);
        agency.hasClaimedDonation = true;
    }

    function claimReward() public {
        AccountingPeriod storage period = getRewardPeriod();
        Consumer storage sender = period.consumers[msg.sender];
        require(!sender.hasClaimedReward);
        uint share = sender.reusableBottlePurchases / period.reusableBottlePurchases;
        require(share > 0);

        uint amount = share * (period.thrownAwayOneWayBottles * depositValue) * (1 - shareOfAgencies);
        msg.sender.transfer(amount);
        sender.hasClaimedReward = true;
    }

    // ENVIRONMENTAL AGENCIES
    function registerAsEnvironmentalAgency() public {
        EnvironmentalAgency storage sender = agencies[msg.sender];
        require(!sender.isApproved && !sender.isApprovalPending);

        sender.isApprovalPending = true;
    }

    function unregisterAsEnvironmentalAgency() public {
        EnvironmentalAgency storage sender = agencies[msg.sender];
        require(sender.isApproved || sender.isApprovalPending);

        if (sender.isApproved) {
            approvedAgencies = approvedAgencies - 1;
        }

        sender.isApproved = false;
        sender.isApprovalPending = false;
        // TODO: check if deletion makes sense here (delete collectors[_address])
    }

    function addEnvironmentalAgency(address _address) public onlyOwner {
        EnvironmentalAgency storage sender = agencies[msg.sender];
        require(!sender.isApproved);

        sender.isApproved = true;
        sender.isApprovalPending = false;
        approvedAgencies = approvedAgencies + 1;
    }

    function removeEnvironmentalAgency(address _address) public onlyOwner {
        EnvironmentalAgency storage sender = agencies[msg.sender];
        require(sender.isApproved);

        sender.isApproved = false;
        sender.isApprovalPending = false;
        // TODO: check if deletion makes sense here (delete collectors[_address])
        approvedAgencies = approvedAgencies - 1;
    }

    // GARBAGE COLLECTION
    function registerAsGarbageCollector() public {
        GarbageCollector storage sender = collectors[msg.sender];
        require(!sender.isApproved && !sender.isApprovalPending);

        sender.isApprovalPending = true;
    }

    function unregisterAsGarbageCollector() public {
        GarbageCollector storage sender = collectors[msg.sender];
        require(sender.isApproved || sender.isApprovalPending);

        sender.isApproved = false;
        sender.isApprovalPending = false;
        // TODO: check if deletion makes sense here (delete collectors[_address])
    }

    function addGarbageCollector(address _address) public onlyOwner {
        GarbageCollector storage sender = collectors[msg.sender];
        require(!sender.isApproved);

        sender.isApproved = true;
        sender.isApprovalPending = false;
    }

    function removeGarbageCollector(address _address) public onlyOwner {
        GarbageCollector storage sender = collectors[msg.sender];
        require(sender.isApproved);

        sender.isApproved = false;
        sender.isApprovalPending = false;
        // TODO: check if deletion makes sense here (delete collectors[_address])
    }

}