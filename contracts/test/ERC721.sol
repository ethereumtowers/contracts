//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract TestERC721 is ERC721Burnable {
    string private constant _baseTokenURI = "https://base.uri/";

    constructor() ERC721("TEST", "TST") {}

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function mint(address to, uint256 tokenId) external returns (uint256) {
        _mint(to, tokenId);
        return tokenId;
    }

    function mintBatch(uint256[] calldata tokenIds, address to) external {
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            _mint(to, tokenIds[i]);
        }
    }

    function burn(uint256 tokenId) public virtual override {
        _burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
