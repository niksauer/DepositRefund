pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./base/ActorManager.sol";
import "./base/Ownable.sol";
import "./interface/IDPGActorManager.sol";


contract DPGActorManager is ActorManager, Ownable, IDPGActorManager {
    using SafeMath for uint;

    // MARK: - Internal Properties
    uint internal approvedAgencies;
    uint internal approvedCollectors;

    // MARK: - Private Properties
    mapping(address => Actor) private agencies;
    mapping(address => Actor) private collectors;

    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor() public ActorManager() Ownable(msg.sender) {}

    // MARK: - IDPGActorManager
    function getCountOfApprovedAgencies() external view returns (uint) {
        return approvedAgencies;
    }

    function getCountOfApprovedCollectors() external view returns (uint) {
        return approvedCollectors;
    }

    function getJoinedTimestampForAgency(address _address) external view returns (uint) {
        return agencies[_address].joined;
    }

    function getJoinedTimestampForCollector(address _address) external view returns (uint) {
        return collectors[_address].joined;
    }

    function isApprovedAgency(address _address) external view returns (bool) {
        return agencies[_address].isApproved;
    }

    function isApprovedCollector(address _address) external view returns (bool) {
        return collectors[_address].isApproved;
    }

    // MARK: - Public Methods
    // MARK: Environmental Agencies
    // => tested
    function addAgency(address _address) public onlyOwner {
        require(_address != address(0));

        Actor storage agency = agencies[_address];
        approve(agency);
        approvedAgencies = approvedAgencies.add(1);
    }

    function removeAgency(address _address) public onlyOwner {
        require(_address != address(0));

        Actor storage agency = agencies[_address];
        deny(agency);
        approvedAgencies = approvedAgencies.sub(1);
    }

    // MARK: Garbage Collectors
    // => tested
    function addCollector(address _address) public onlyOwner {
        require(_address != address(0));

        Actor storage collector = collectors[_address];
        approve(collector);
        approvedCollectors = approvedCollectors.add(1);
    }

    function removeCollector(address _address) public onlyOwner {
        require(_address != address(0));

        Actor storage collector = collectors[_address];
        deny(collector);
        approvedCollectors = approvedCollectors.sub(1);
    }
  
}