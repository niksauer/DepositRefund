pragma solidity ^0.4.23;

contract Escrow {

    // PRIVATE PROPERTIES
    address owner;

    mapping (address => uint) reusableBottlePurchases;
    // mapping (address => uint) claimedRewards;

    mapping (address => bool) isApprovedEnvironmentalAgency;
    mapping (address => bool) isAgencyApprovalPending;

    mapping (address => bool) isApprovedGarbageCollection;
    mapping (address => bool) isGarbageApprovalPending;

    // PUBLIC PROPERTIES
    uint public thrownAwayBottles;

    // uint public previouslyThrownAwayBottles;

    // uint public totalReusableBottleSales;
    // uint public rewards;
    // uint public unclaimedRewards;

    // EVENTS
    // TODO: define events

    // MODIFIER
    modifier restricted() {
        if (msg.sender == owner) _;
    }

    // INITIALIZATION
    // TODO: check proper constructor syntax
    function Escrow() {
        owner = msg.sender;
        // TODO: check initialization of properties
    }

    // DEPOSIT/REFUND
    // leave deposit upon buying newly introduced bottle (i.e. bottle put into circulation through purchase)
    function deposit() public payable {
        // TODO: use fallback function instead?
    }

    // refund take-back point up to the amount of bottles it accepted
    // refund = amount * 0.25€ (for one-way bottles)
    // TODO: how to limit refunds to take-back points (use signed receipts)? how to guarantee single refund (track used receipts)?
    function refund(string bottleCount) public {
        // TODO: how to calculate amount? how to account for fluctuation in ether's value?
    }

    // DATA REPORTING
    // TODO: how to prove count? how to guarantee single report?
    function reportThrownAwayBottles(uint count) public {
        require(isApprovedGarbageCollection[msg.sender] == true);

        thrownAwayBottles = thrownAwayBottles + count;
    }

    // TODO: how to prove count and purchaser? how to limit reporting to retailers? how to guarantee single report?
    function reportReusableBottlePurchase(address purchaser, uint count) public {
        reusableBottlePurchases[purchaser] = reusableBottlePurchases[purchaser] + count;
    }

    // REWARDS/DONATIONS
    function setReward() public {
        // TODO
    }

    function claimDonation() public {
        require(isApprovedEnvironmentalAgency[msg.sender] == true);

        // TODO
    }

    function claimReward() public {
        //uint unclaimedRewards = reusableBottlePurchases[msg.sender] - claimedRewards[msg.sender];
        //require(unclaimedRewards > 0);

        // TODO

        //claimedRewards[msg.sender] = claimedRewards[msg.sender] + unclaimedRewards;
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

