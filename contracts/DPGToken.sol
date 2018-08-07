pragma solidity 0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "./interfaces/Ownable.sol";


contract DPGToken is ERC721Token, Ownable {
        
    // MARK: - Private Properties
    string internal name_ = "DPG Token";
    string internal symbol_ = "DPG";

    // MARK: - Public Methods
    function mint(address _to, uint256 _tokenId) public {
        _mint(_to, _tokenId);

    }

    function burn(address _owner, uint256 _tokenId) public {
        _burn(_owner, _tokenId);
    }

}