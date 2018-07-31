pragma solidity ^0.4.23;

contract DPG {

    // MARK: - Private Properties
    address owner;

    // TODO: how to calculate deposit value? how to account for fluctuation in ether's value?
    uint depositValue = 1 ether;
    uint environmentalShare = 0.5;

    mapping (address => uint) currentReusableBottlePurchasesForAddress;
    mapping (address => uint) previousReusableBottlePurchasesForAddress;
    mapping (address => uint) didClaimReward;

    uint approvedEnvironmentalAgencies;
    mapping (address => bool) didClaimDonation;
    mapping (address => bool) isApprovedEnvironmentalAgency;
    mapping (address => bool) isAgencyApprovalPending;

    mapping (address => bool) isApprovedGarbageCollection;
    mapping (address => bool) isGarbageApprovalPending;

    // MARK: - Public Properties
    uint public currentReusableBottlePurchasesTotal;
    uint public previousReusableBottlePurchasesTotal;

    uint public currentThrownAwayOneWayBottleCount;
    uint public previousThrownAwayOneWayBottleCount;

    // EVENTS
    // TODO: define events (may be used as UI update notifications)

    // MODIFIER
    modifier restricted() {
        if (msg.sender == owner) _;
    }

    // INITIALIZATION
    // TODO: check proper constructor syntax
    function DPG() {
        owner = msg.sender;
        // TODO: check initialization of properties
    }

    // DEPOSIT/REFUND
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
        require(isApprovedGarbageCollection[msg.sender] == true);

        currentThrownAwayOneWayBottleCount = currentThrownAwayOneWayBottleCount + count;
    }

    // TODO: how to prove count and purchaser? how to limit reporting to retailers? how to guarantee single report?
    function reportReusableBottlePurchase(address purchaser, uint count) public {
        currentReusableBottlePurchasesForAddress[purchaser] = currentReusableBottlePurchasesForAddress[purchaser] + count;
        currentReusableBottlePurchasesTotal = currentReusableBottlePurchasesTotal + count;
    }

    // REWARDS/DONATIONS
    function unlockReward() public {
        // TODO
        previousThrownAwayOneWayBottleCount = currentThrownAwayOneWayBottleCount;
        previousReusableBottlePurchasesTotal = currentReusableBottlePurchasesTotal;
        previousReusableBottlePurchasesForAddress = currentReusableBottlePurchasesForAddress;

        currentThrownAwayOneWayBottleCount = 0;
        currentReusableBottlePurchasesTotal = 0;
        // TODO: reset purchases for address mapping
    }

    // TODO: how to handle remaining non-claimed rewards/donations?
    function claimDonation() public {
        require(isApprovedEnvironmentalAgency[msg.sender] == true);
        require(didClaimDonation[msg.sender] == false);

        uint share = 1 / approvedEnvironmentalAgencies;
        uint amount = share * (previousThrownAwayOneWayBottleCount * depositValue) * environmentalShare;
        msg.sender.transfer(amount);
        didClaimDonation[msg.sender] = true;
    }

    function claimReward() public {
        require(didClaimReward[msg.sender] == false);
        uint share = previousReusableBottlePurchasesForAddress[msg.sender] / previousReusableBottlePurchasesTotal;
        require(share > 0);

        uint amount = share * (previousThrownAwayOneWayBottleCount * depositValue) * (1 - environmentalShare);
        msg.sender.transfer(amount);
        didClaimReward[msg.sender] = true;
    }

    // ENVIRONMENTAL AGENCIES
    function registerAsEnvironmentalAgency() public {
        require(isApprovedEnvironmentalAgency[msg.sender] == false);
        require(isAgencyApprovalPending[msg.sender] == false);

        isAgencyApprovalPending[msg.sender] = true;
    }

    function unregisterAsEnvironmentalAgency() public {
        require(isApprovedEnvironmentalAgency[msg.sender] == true || isAgencyApprovalPending[msg.sender] == true);

        isApprovedEnvironmentalAgency[msg.sender] = false;
        isAgencyApprovalPending[msg.sender] = false;
    }

    function approve(address environmentalAgency) public restricted {
        require(isAgencyApprovalPending[environmentalAgency] == true);

        isApprovedEnvironmentalAgency[environmentalAgency] = true;
        isAgencyApprovalPending[environmentalAgency] = false;
        // TODO: delete isApprovalPending[environmentalAgency]
    }

    function add(address environmentalAgency) public restricted {
        require(isApprovedEnvironmentalAgency[environmentalAgency] == false);

        isApprovedEnvironmentalAgency[environmentalAgency] = true;
        // TODO: check how mapping is initialized
    }

    function remove(address environmentalAgency) public restricted {
        require(isApprovedEnvironmentalAgency[environmentalAgency] == true);

        isApprovedEnvironmentalAgency[environmentalAgency] = false;
        isAgencyApprovalPending[environmentalAgency] = false;
    }

    // GARBAGE COLLECTION
    function registerAsGarbageCollection() public {
        require(isApprovedGarbageCollection[msg.sender] == false);
        require(isGarbageApprovalPending[msg.sender] == false);

        isGarbageApprovalPending[msg.sender] = true;
    }

    function unregisterAsGarbageCollection() public {
        require(isApprovedGarbageCollection[msg.sender] == true || isGarbageApprovalPending[msg.sender] == true);

        isApprovedGarbageCollection[msg.sender] = false;
        isGarbageApprovalPending[msg.sender] = false;
    }

    function approve(address garbageCollection) public restricted {
        require(isGarbageApprovalPending[garbageCollection] == true);

        isApprovedGarbageCollection[garbageCollection] = true;
        isGarbageApprovalPending[garbageCollection] = false;
        // TODO: delete isApprovalPending[environmentalAgency]
    }

    function add(address garbageCollection) public restricted {
        require(isApprovedGarbageCollection[garbageCollection] == false);

        isApprovedGarbageCollection[environmentalAgency] = true;
        // TODO: check how mapping is initialized
    }

    function remove(address garbageCollection) public restricted {
        require(isApprovedGarbageCollection[garbageCollection] == true);

        isApprovedGarbageCollection[garbageCollection] = false;
        isGarbageApprovalPending[garbageCollection] = false;
    }

}