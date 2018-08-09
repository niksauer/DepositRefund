pragma solidity 0.4.24;


interface IDPGActorManager {
    function getCountOfApprovedAgencies() external view returns (uint);
    function getCountOfApprovedCollectors() external view returns (uint);
    function getJoinedTimestampForAgency(address _address) external view returns (uint);
    function getJoinedTimestampForCollector(address _address) external view returns (uint);
    function isApprovedAgency(address _address) external view returns (bool);
    function isApprovedCollector(address _address) external view returns (bool);
}