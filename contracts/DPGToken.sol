pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "./base/Ownable.sol";


contract DPGToken is ERC721Token, Ownable {
        
    // MARK: - Initialization
    // solhint-disable-next-line no-empty-blocks
    constructor() public ERC721Token("DPG Token", "DPG") Ownable(msg.sender) {}

    // MARK: - Public Methods
    function approve(address _to, uint256 _tokenId) public onlyOwner {
        super.approve(_to, _tokenId);
    }

    function setApprovalForAll(address _to, bool _approved) public onlyOwner {
        super.setApprovalForAll(_to, _approved);
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) public onlyOwner {
        super.transferFrom(_from, _to, _tokenId);
    }

    function safeTransferFrom(address _from, address _to, uint256 _tokenId) public onlyOwner {
        super.safeTransferFrom(_from, _to, _tokenId);
    }

    function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes _data) public onlyOwner {
        super.safeTransferFrom(_from, _to, _tokenId, _data);
    }

    // => tested
    function mint(address _to, uint256 _tokenId) public onlyOwner {
        _mint(_to, _tokenId);
    }

    // => tested
    function burn(address _owner, uint256 _tokenId) public onlyOwner {
        _burn(_owner, _tokenId);
    }

    function tokensOf(address _address) public view returns (uint256[]) {
        return ownedTokens[_address];
    }

    // MARK: - Private Methods
    function isApprovedOrOwner(address, uint256) internal view returns (bool) {
        return true;
    }

}