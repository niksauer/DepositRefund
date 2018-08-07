pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./interfaces/IDPGActorManager.sol";
import "./interfaces/Ownable.sol";


contract DPGActorManager is IDPGActorManager, Ownable {
    using SafeMath for uint;

    // MARK: - Types
    struct EnvironmentalAgency {
        bool isApproved;
        bool isApprovalPending;
        uint joined;
    }

    struct GarbageCollector {
        bool isApproved;
        bool isApprovalPending;
        uint joined;
    }

    // MARK: - Private Properties
    uint internal approvedAgencies;
    mapping(address => EnvironmentalAgency) internal agencies;

    mapping(address => GarbageCollector) internal collectors;

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor() public Ownable(msg.sender) {}

    // MARK: - IDPGActorManager
    function getCountOfApprovedAgencies() external view returns (uint) {
        return approvedAgencies;
    }

    function getJoinedTimestampForAgency(address _address) external view returns (uint) {
        return agencies[_address].joined;
    }

    function isApprovedEnvironmentalAgency(address _address) external view returns (bool) {
        return agencies[_address].isApproved;
    }

    function isApprovedGarbageCollector(address _address) external view returns (bool) {
        return collectors[_address].isApproved;
    }

    // MARK: - Public Methods
    // MARK: Environmental Agencies
    function registerAsEnvironmentalAgency() public {
        EnvironmentalAgency storage requester = agencies[msg.sender];
        require(!requester.isApproved && !requester.isApprovalPending);

        requester.isApprovalPending = true;
    }

    function unregisterAsEnvironmentalAgency() public {
        EnvironmentalAgency storage agency = agencies[msg.sender];
        require(agency.isApproved || agency.isApprovalPending);

        if (agency.isApproved) {
            approvedAgencies = approvedAgencies.sub(1);
        }

        agency.isApproved = false;
        agency.isApprovalPending = false;
    }

    // => tested
    function addEnvironmentalAgency(address _address) public onlyOwner {
        require(_address != address(0));
        
        EnvironmentalAgency storage agency = agencies[_address];
        require(!agency.isApproved);

        approvedAgencies = approvedAgencies.add(1);

        agency.isApproved = true;
        agency.isApprovalPending = false;
        agency.joined = now;
    }

    function removeEnvironmentalAgency(address _address) public onlyOwner {
        EnvironmentalAgency storage agency = agencies[_address];
        require(agency.isApproved);

        approvedAgencies = approvedAgencies.sub(1);

        agency.isApproved = false;
        agency.isApprovalPending = false;
    }

    // MARK: Garbage Collectors
    function registerAsGarbageCollector() public {
        GarbageCollector storage requester = collectors[msg.sender];
        require(!requester.isApproved && !requester.isApprovalPending);

        requester.isApprovalPending = true;
    }

    function unregisterAsGarbageCollector() public {
        GarbageCollector storage collector = collectors[msg.sender];
        require(collector.isApproved || collector.isApprovalPending);

        collector.isApproved = false;
        collector.isApprovalPending = false;
    }

    // => tested
    function addGarbageCollector(address _address) public onlyOwner {
        require(_address != address(0));

        GarbageCollector storage collector = collectors[_address];
        require(!collector.isApproved);

        collector.isApproved = true;
        collector.isApprovalPending = false;
        collector.joined = now;
    }

    function removeGarbageCollector(address _address) public onlyOwner {
        GarbageCollector storage collector = collectors[_address];
        require(collector.isApproved);

        collector.isApproved = false;
        collector.isApprovalPending = false;
    }

}
