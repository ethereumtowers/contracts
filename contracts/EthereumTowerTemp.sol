// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract EthereumTowerss is ERC721Enumerable, ReentrancyGuard, Ownable {
    uint256 public maxMints = 5;
    uint256 public maxPerTx = 1;
    bool public mintActive = false;
    bool public mintingTowerTwo = false;

    uint256 public maxStandard = 1980;
    uint256 public maxLuxury = 198;
    uint256 public maxPenthouse = 16;

    uint256 public tokenIndexStandard = 1;
    uint256 public tokenIndexLuxury = 1981;
    uint256 public tokenIndexPenthouse = 2179;

    uint256 public counterStandard = 0;
    uint256 public counterLuxury = 0;
    uint256 public counterPenthouse = 0;

    mapping(address => bool) public whitelist;

    address[] whitelistAddresses;

    // Collection metatdata URI
    string private _baseURIExtended;

    mapping(address => uint256) private addressToMintCount;

    function addAddressToWhitelist(address _addr) public onlyOwner {
        require(!isWhitelisted(_addr), "Already whitelisted");
        whitelist[_addr] = true;
    }

    function isWhitelisted(address addr) public view returns (bool) {
        return whitelist[addr] == true;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIExtended;
    }

    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseURIExtended = baseURI_;
    }

    function flipMint() public onlyOwner {
        mintActive = !mintActive;
    }

    function mint(uint256 amount) public nonReentrant {
        require(mintActive, "Minting not active");
        require(whitelist[msg.sender], "You are not whitelisted");

        require(amount <= maxPerTx, "Exceeds max mint per transaction!");
        require(
            addressToMintCount[msg.sender] + amount <= maxMints,
            "Exceeded wallet mint limit!"
        );
        require(amount + counterStandard <= maxStandard, "Exceeds max supply!");

        for (uint256 i = 1; i <= amount; i++) {
            _mintApartment(msg.sender, 1);
        }
        addressToMintCount[msg.sender] += amount;
    }

    function adminMint(address _to, uint256 _aptType) external onlyOwner {
        // Mint apartment
        if (_aptType == 1) {
            require(
                counterStandard + 1 <= maxStandard,
                "Exceeds max standard supply!"
            );
            _mintApartment(_to, _aptType);
        }
        // Mint luxury apartment
        if (_aptType == 2) {
            require(
                counterLuxury + 1 <= maxLuxury,
                "Exceeds max luxury supply!"
            );
            _mintApartment(_to, _aptType);
        }
        //Mint penthouse
        if (_aptType == 3) {
            require(
                counterPenthouse + 1 <= maxPenthouse,
                "Exceeds max penthouse supply!"
            );
            _mintApartment(_to, _aptType);
        }
    }

    function _mintApartment(address _to, uint256 _aptType) internal {
        // Mint apartment
        if (_aptType == 1) {
            require(!_exists(tokenIndexStandard), "Token already exists");
            _safeMint(_to, tokenIndexStandard);
            tokenIndexStandard++;
            counterStandard++;
        }
        // Mint luxury apartment
        if (_aptType == 2) {
            require(!_exists(tokenIndexLuxury), "Token already exists");
            _safeMint(_to, tokenIndexLuxury);
            tokenIndexLuxury++;
            counterLuxury++;
        }
        //Mint penthouse
        if (_aptType == 3) {
            require(!_exists(tokenIndexPenthouse), "Token already exists");
            _safeMint(_to, tokenIndexPenthouse);
            tokenIndexPenthouse++;
            counterPenthouse++;
        }
    }

    function apartmentExists(uint256 _tokenId) public view returns (bool) {
        return _exists(_tokenId);
    }

    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    constructor(string memory metadataBaseURI)
        ERC721("Ethereum Towers", "ETHT")
    {
        _baseURIExtended = metadataBaseURI;
    }
}