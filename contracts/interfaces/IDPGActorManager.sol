pragma solidity 0.4.24;


interface IDPGActorManager {
    function getCountOfApprovedAgencies() external view returns (uint);
    function getJoinedTimestampForAgency(address _address) external view returns (uint);
    function isApprovedEnvironmentalAgency(address _address) external view returns (bool);
    function isApprovedGarbageCollector(address _address) external view returns (bool);
}