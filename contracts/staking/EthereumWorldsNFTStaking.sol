// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract EthereumWorldsNFTStaking is
    IERC721Receiver,
    EIP712,
    Ownable,
    Pausable,
    ReentrancyGuard
{
    using SafeCast for uint256;
    using SafeERC20 for IERC20;

    struct StakeInfo {
        bool rentable;
        uint16 tokenIndex;
        uint32 timestamp;
        uint32 minRentPeriod;
        uint32 rentableUntil;
        uint96 rentalDailyPrice;
        uint96 deposit;
        address owner;
    }

    struct StakeVoucher {
        uint256[] tokenIds;
        bool rentable;
        uint32 minRentPeriod;
        uint32 rentableUntil;
        uint96 rentalDailyPrice;
        uint96 deposit;
        uint256 nonce;
        address owner;
        bytes signature;
    }

    struct UnstakeVoucher {
        uint256[] tokenIds;
        uint256 nonce;
        address owner;
        bytes signature;
    }

    struct ClaimVoucher {
        uint256 amount;
        uint256 nonce;
        address owner;
        bytes signature;
    }

    string private constant SIGNING_DOMAIN = "EW_STAKING";
    string private constant SIGNATURE_VERSION = "1";

    uint256 private maxTokensInStake = 4388;
    uint256 private tokensInStake = 0;

    IERC20 immutable worldsToken;
    IERC721 immutable towersContract;

    address private serviceSigner;

    mapping(uint256 => StakeInfo) private stakes;
    mapping(address => uint256[]) private userTokens;
    mapping(bytes => bool) private signatureUsed;

    event ServiceSignerUpdated(address indexed newAddress);
    event TokenStaked(
        address indexed owner,
        uint256 indexed tokenId,
        bool rentable
    );
    event TokenUnstaked(address indexed owner, uint256 indexed tokenId);
    event TokenSetRentable(
        address indexed owner,
        uint256 indexed tokenId,
        bool rentable
    );
    event RewardClaimed(address indexed by, uint256 amount);

    constructor(
        address _worldsToken,
        address _towersContract,
        address _serviceSigner
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        require(_worldsToken != address(0), "EWStaking: zero address");
        require(_towersContract != address(0), "EWStaking: zero address");
        require(_serviceSigner != address(0), "EWStaking: zero address");

        worldsToken = IERC20(_worldsToken);
        towersContract = IERC721(_towersContract);
        serviceSigner = _serviceSigner;
    }

    modifier validDestination(address to) {
        require(to != address(0), "EWStaking: transfer to zero address");
        require(to != address(this), "EWStaking: transfer to contract");
        _;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function updateServiceSigner(address _serviceSigner) external onlyOwner {
        serviceSigner = _serviceSigner;

        emit ServiceSignerUpdated(_serviceSigner);
    }

    function updateMaxTokensInStake(uint256 _maxTokensInStake)
        external
        onlyOwner
    {
        maxTokensInStake = _maxTokensInStake;
    }

    function onERC721Received(
        address operator,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        if (operator == address(this)) {
            return this.onERC721Received.selector;
        } else {
            return 0x00000000;
        }
    }

    function stake(StakeVoucher calldata voucher)
        external
        whenNotPaused
        nonReentrant
    {
        require(voucher.tokenIds.length > 0, "EWStaking: nothing to stake");
        require(
            tokensInStake + voucher.tokenIds.length <= maxTokensInStake,
            "EWStaking: tokens in stake limit reached"
        );

        address signer = _verify(voucher);
        require(signer == serviceSigner, "EWStaking: invalid signature");
        require(
            !signatureUsed[voucher.signature],
            "EWStaking: this voucher already used"
        );

        require(_msgSender() == voucher.owner, "EWStaking: not your voucher");

        for (uint256 i = 0; i < voucher.tokenIds.length; ++i) {
            uint256 tokenId = voucher.tokenIds[i];

            require(
                towersContract.isApprovedForAll(_msgSender(), address(this)) ||
                    towersContract.getApproved(tokenId) == address(this),
                "EWStaking: not approved to transfer tokens"
            );

            require(
                towersContract.ownerOf(tokenId) == _msgSender(),
                "EWStaking: you are not an owner"
            );

            towersContract.safeTransferFrom(
                _msgSender(),
                address(this),
                tokenId
            );

            userTokens[_msgSender()].push(tokenId);
            uint256 index = userTokens[_msgSender()].length - 1;

            stakes[tokenId] = StakeInfo(
                voucher.rentable,
                index.toUint16(),
                block.timestamp.toUint32(),
                voucher.minRentPeriod,
                voucher.rentableUntil,
                voucher.rentalDailyPrice,
                voucher.deposit,
                _msgSender()
            );

            emit TokenStaked(_msgSender(), tokenId, voucher.rentable);
        }

        tokensInStake += voucher.tokenIds.length;

        signatureUsed[voucher.signature] = true;
    }

    function unstake(UnstakeVoucher calldata voucher, address to)
        external
        whenNotPaused
        validDestination(to)
        nonReentrant
    {
        require(voucher.tokenIds.length > 0, "EWStaking: nothing to unstake");

        address signer = _verify(voucher);
        require(signer == serviceSigner, "EWStaking: invalid signature");
        require(
            !signatureUsed[voucher.signature],
            "EWStaking: this voucher already used"
        );

        require(_msgSender() == voucher.owner, "EWStaking: not your voucher");

        for (uint256 i = 0; i < voucher.tokenIds.length; ++i) {
            uint256 tokenId = voucher.tokenIds[i];

            require(
                stakes[tokenId].owner == _msgSender(),
                "EWStaking: you are not an owner"
            );

            towersContract.safeTransferFrom(address(this), to, tokenId);

            _deleteFromTokensArray(_msgSender(), tokenId);
            delete stakes[tokenId];

            emit TokenUnstaked(_msgSender(), tokenId);
        }

        tokensInStake -= voucher.tokenIds.length;

        signatureUsed[voucher.signature] = true;
    }

    function claim(ClaimVoucher calldata voucher)
        external
        whenNotPaused
        nonReentrant
    {
        address signer = _verify(voucher);
        require(signer == serviceSigner, "EWStaking: invalid signature");

        require(
            !signatureUsed[voucher.signature],
            "EWStaking: this reward already claimed"
        );

        require(
            voucher.owner == _msgSender(),
            "EWStaking: not an owner of reward"
        );
        require(voucher.amount > 0, "EWStaking: nothing to claim");

        require(
            voucher.amount <= worldsToken.balanceOf(address(this)),
            "EWStaking: not enough funds to claim"
        );

        worldsToken.safeTransfer(_msgSender(), voucher.amount);

        signatureUsed[voucher.signature] = true;

        emit RewardClaimed(_msgSender(), voucher.amount);
    }

    function setRentable(
        uint256 tokenId,
        bool _rentable,
        uint32 _minRentPeriod,
        uint32 _rentableUntil,
        uint32 _rentalDailyPrice,
        uint96 _deposit
    ) external {
        require(
            stakes[tokenId].owner == _msgSender(),
            "EWStaking: you are not an owner"
        );

        stakes[tokenId].rentable = _rentable;
        stakes[tokenId].minRentPeriod = _minRentPeriod;
        stakes[tokenId].rentableUntil = _rentableUntil;
        stakes[tokenId].rentalDailyPrice = _rentalDailyPrice;
        stakes[tokenId].deposit = _deposit;

        emit TokenSetRentable(_msgSender(), tokenId, _rentable);
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function getStakeInfo(uint256 tokenId)
        external
        view
        returns (StakeInfo memory)
    {
        return stakes[tokenId];
    }

    function getTokensByOwner(address owner)
        external
        view
        returns (uint256[] memory)
    {
        return userTokens[owner];
    }

    function isRentable(uint256 tokenId) external view returns (bool) {
        return stakes[tokenId].rentable;
    }

    function _deleteFromTokensArray(address owner, uint256 tokenId) internal {
        if (userTokens[owner].length == 1) {
            userTokens[owner].pop();
            return;
        }

        uint256 tokenIndex = stakes[tokenId].tokenIndex;
        uint256 swapTokenId = userTokens[owner][userTokens[owner].length - 1];

        userTokens[owner][tokenIndex] = userTokens[owner][
            userTokens[owner].length - 1
        ];

        stakes[swapTokenId].tokenIndex = tokenIndex.toUint16();

        userTokens[owner].pop();
    }

    function _hash(StakeVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "StakeVoucher(uint256[] tokenIds,bool rentable,uint32 minRentPeriod,uint32 rentableUntil,uint96 rentalDailyPrice,uint96 deposit,uint256 nonce,address owner)"
                        ),
                        keccak256(abi.encodePacked(voucher.tokenIds)),
                        voucher.rentable,
                        voucher.minRentPeriod,
                        voucher.rentableUntil,
                        voucher.rentalDailyPrice,
                        voucher.deposit,
                        voucher.nonce,
                        voucher.owner
                    )
                )
            );
    }

    function _hash(UnstakeVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "UnstakeVoucher(uint256[] tokenIds,uint256 nonce,address owner)"
                        ),
                        keccak256(abi.encodePacked(voucher.tokenIds)),
                        voucher.nonce,
                        voucher.owner
                    )
                )
            );
    }

    function _hash(ClaimVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ClaimVoucher(uint256 amount,uint256 nonce,address owner)"
                        ),
                        voucher.amount,
                        voucher.nonce,
                        voucher.owner
                    )
                )
            );
    }

    function _verify(StakeVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function _verify(UnstakeVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function _verify(ClaimVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
