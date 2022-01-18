//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract EthereumTowers is
    Context,
    AccessControlEnumerable,
    ERC721Enumerable,
    ERC721Burnable,
    EIP712
{
    address immutable contractOwner;
    string private constant SIGNING_DOMAIN = "ETT_VOUCHER";
    string private constant SIGNATURE_VERSION = "1";
    bytes32 public constant WHITELISTED = keccak256("WHITELISTED");

    uint256 public MAX_ITEMS_IN_TOWER = 2178;
    string private _baseTokenURI;
    uint256 public activeTower;
    uint256 public activeStage;
    uint256 public stagePrice;
    bool public isPrivateRound;
    uint256 public aveliableItemsOnRound;
    uint256 public participantCount = 0;
    uint256 public firstTowerCounter;
    uint256 public secondTowerCounter;

    struct EttVoucher {
        uint256 tokenId;
        string uri;
        bytes signature;
    }

    mapping(uint256 => string) public tokenUrl;
    mapping(address => bool) internal ownerOfToken;
    mapping(uint256 => bytes32) internal stageAccessRole;
    mapping(uint256 => bool) public tokenExists;

    constructor(string memory baseTokenURI)
        ERC721("EthereumTowers", "ETT")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        _baseTokenURI = baseTokenURI;
        activeStage = 0;
        activeTower = 1;
        contractOwner = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(WHITELISTED, _msgSender());
    }

    event MintingInfo(
        address to,
        uint256 tokenId,
        string tokenUri,
        bool isPrivateRound,
        uint256 activeStage,
        uint256 stagePrice
    );

    function addStageRole(uint256 _stage, bytes32 _role) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "EthereumTowers: must have admin role"
        );
        stageAccessRole[_stage] = _role;
    }

    function redeem(address redeemer, EttVoucher calldata ettvoucher)
        public
        payable
        returns (uint256)
    {
        require(!ownerOfToken[msg.sender], "User can have only one of the nft");
        address signer = _verify(ettvoucher);
        require(
            firstTowerCounter < MAX_ITEMS_IN_TOWER + 1,
            "Max tokens on the contract has already minted"
        );
        require(
            hasRole(WHITELISTED, signer),
            "Signature invalid or unauthorized"
        );
        require(activeTower == 1, "This phase has already ended!");

        _mint(signer, ettvoucher.tokenId);
        tokenUrl[ettvoucher.tokenId] = ettvoucher.uri;
        tokenExists[ettvoucher.tokenId] = true;

        _transfer(signer, redeemer, ettvoucher.tokenId);
        firstTowerCounter++;
        ownerOfToken[msg.sender] = true;
        return ettvoucher.tokenId;
    }

    function _hash(EttVoucher calldata ettvoucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256("EttVoucher(uint256 tokenId,string uri)"),
                        ettvoucher.tokenId,
                        keccak256(bytes(ettvoucher.uri))
                    )
                )
            );
    }

    function getChainId() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    function _verify(EttVoucher calldata ettvoucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(ettvoucher);
        return ECDSA.recover(digest, ettvoucher.signature);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenUrl[tokenId]))
                : "";
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function changeStage(uint256 _stage, uint256 _stagePrice) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "EthereumTowers: must have admin role"
        );
        activeStage = _stage;
        stagePrice = _stagePrice;
        participantCount = 0;
    }

    function changeRound(uint256 itemsForSale, bool privateRound) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "EthereumTowers: must have admin role"
        );
        isPrivateRound = privateRound;
        aveliableItemsOnRound = itemsForSale;
    }

    function updateTokenUrl(uint256 tokenId, string memory newUrl) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "EthereumTowers: must have admin role"
        );
        require(tokenExists[tokenId], "EthereumTowers: token not found");
        tokenUrl[tokenId] = newUrl;
    }

    function changeTower(uint256 _tower) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "EthereumTowers: must have admin role"
        );
        require(
            _tower == 1 || _tower == 2,
            "Ethereum tower: aveiable number 1 or 2"
        );
        activeTower = _tower;
    }

    function mint(
        address to,
        uint256 tokenId,
        string memory tokenUri,
        uint256 stage
    ) public payable virtual returns (uint256) {
        if (activeTower == 1) {
            require(
                hasRole(stageAccessRole[stage], _msgSender()),
                "EthereumTowers: must have minter role to mint on this tower"
            );
            require(
                firstTowerCounter < MAX_ITEMS_IN_TOWER + 1,
                "Max tokens on the contract has already minted"
            );
            _mint(to, tokenId);
            tokenUrl[tokenId] = tokenUri;
            tokenExists[tokenId] = true;
            ownerOfToken[to] = true;
            emit MintingInfo(
                to,
                tokenId,
                tokenUri,
                isPrivateRound,
                activeStage,
                stagePrice
            );
            return tokenId;
        }
        if (activeTower == 2) {
            require(activeStage == stage, "Incorrect stage");
            require(
                secondTowerCounter < MAX_ITEMS_IN_TOWER + 1,
                "Max tokens on the contract has already minted"
            );
            if (isPrivateRound) {
                require(
                    hasRole(stageAccessRole[stage], _msgSender()),
                    "EthereumTowers: must have minter role to mint on this tower"
                );
                require(
                    msg.value == stagePrice,
                    "You must send funds to mint on this tower"
                );
                require(!ownerOfToken[to], "User can have only one of the nft");
                require(
                    participantCount < aveliableItemsOnRound,
                    "Please wait for the next round to begin"
                );
                _mint(to, tokenId);
                tokenUrl[tokenId] = tokenUri;
                tokenExists[tokenId] = true;
                ownerOfToken[to] = true;
                participantCount++;
                emit MintingInfo(
                    to,
                    tokenId,
                    tokenUri,
                    isPrivateRound,
                    activeStage,
                    stagePrice
                );
                return tokenId;
            } else {
                require(
                    msg.value == stagePrice,
                    "You must send funds to mint on this tower"
                );
                require(
                    !ownerOfToken[to],
                    "The user has already owns the token"
                );
                _mint(to, tokenId);
                tokenUrl[tokenId] = tokenUri;
                tokenExists[tokenId] = true;
                ownerOfToken[to] = true;
                emit MintingInfo(
                    to,
                    tokenId,
                    tokenUri,
                    isPrivateRound,
                    activeStage,
                    stagePrice
                );
                return tokenId;
            }
        }
        return tokenId;
    }

    function batchRoles(address[] memory user, bytes32 role) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "EthereumTowers: must have admin role"
        );
        for (uint256 i = 0; i < user.length; i++) {
            grantRole(role, user[i]);
        }
    }

    function mintBatch(
        address[] memory to,
        uint256[] memory id,
        string[] memory tokenUri
    ) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "EthereumTowers: must have admin role"
        );
        require(to.length == id.length, "Please check address & id count");
        for (uint256 i = 0; i < id.length; i++) {
            _mint(to[i], id[i]);
            tokenUrl[id[i]] = tokenUri[i];
            ownerOfToken[to[i]] = true;
            tokenExists[id[i]] = true;
        }
    }

    function mintByAdmin(
        address to,
        uint256 tokenId,
        string memory tokenUri
    ) public {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "EthereumTowers: must have admin role"
        );
        tokenUrl[tokenId] = tokenUri;
        _mint(to, tokenId);
        tokenExists[tokenId] = true;
    }

    function burn(uint256 tokenId) public virtual override {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "EthereumTowers: caller is not owner nor approved."
        );
        _burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerable, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function owner() public view returns (address) {
        return contractOwner;
    }
}
