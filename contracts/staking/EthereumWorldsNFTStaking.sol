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
        address owner;
        uint32 tokenIndex;
        uint32 stakeTimestamp;
        uint32 rewardClaimTimestamp;
    }

    struct ClaimInfo {
        uint224 totalClaimed;
        uint32 lastClaimTimestamp;
    }

    struct StakeVoucher {
        uint256[] tokenIds;
        address owner;
        uint256 nonce;
        bytes signature;
    }

    struct UnstakeVoucher {
        uint256[] tokenIds;
        address owner;
        uint256 claimAmount;
        uint256 nonce;
        bytes signature;
    }

    struct ClaimVoucher {
        uint256 tokenId;
        uint256 amount;
        uint256 nonce;
        address owner;
        bytes signature;
    }

    struct ClaimAllVoucher {
        uint256 amount;
        uint256 nonce;
        address owner;
        bytes signature;
    }

    string private constant SIGNING_DOMAIN = "EW_STAKING";
    string private constant SIGNATURE_VERSION = "1";

    uint256 public maxTokensInStake = 4388;
    uint256 public tokensInStake = 0;

    /**
     * @dev this limitation was added to avoid out of gas issues
     * if user have a lot of tokens staked.
     * Unstake of 20 tokens will require approx. 700k-800k gas.
     */
    uint256 private constant maxTokensPerUnstake = 20;

    IERC20 immutable worldsToken;
    IERC721 immutable towersContract;

    address private serviceSigner;

    mapping(uint256 => StakeInfo) private stakes;
    mapping(address => uint256[]) private userTokens;
    mapping(address => ClaimInfo) private claims;
    mapping(bytes => bool) private signatureUsed;

    bool public shutdown = false;

    event ServiceSignerUpdated(address indexed newAddress);
    event MaxTokensInStakeUpdated(uint256 newValue);
    event ToggleStakingShutdown(bool shutdown);
    event TokenStaked(
        address indexed owner,
        uint256 indexed tokenId,
        uint32 timestamp
    );
    event TokenUnstaked(address indexed owner, uint256 indexed tokenId);
    event RewardClaimed(address indexed by, uint256 amount);
    event TokenRescue(
        address indexed token,
        address indexed to,
        uint256 amount
    );

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
        require(_serviceSigner != address(0), "EWStaking: zero address");

        serviceSigner = _serviceSigner;

        emit ServiceSignerUpdated(_serviceSigner);
    }

    function updateMaxTokensInStake(uint256 _maxTokensInStake)
        external
        onlyOwner
    {
        maxTokensInStake = _maxTokensInStake;

        emit MaxTokensInStakeUpdated(maxTokensInStake);
    }

    function toggleShutdown(bool _shutdown) external onlyOwner {
        shutdown = _shutdown;

        emit ToggleStakingShutdown(shutdown);
    }

    function rescueERC20(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner validDestination(to) {
        require(token != address(0), "EWStaking: zero token address");
        require(amount > 0, "EWStaking: zero amount");

        IERC20(token).safeTransfer(to, amount);

        emit TokenRescue(token, to, amount);
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
        require(!shutdown, "EWStaking: shut down");

        require(voucher.tokenIds.length > 0, "EWStaking: nothing to stake");
        require(
            tokensInStake + voucher.tokenIds.length <= maxTokensInStake,
            "EWStaking: tokens in stake limit reached"
        );

        address signer = _verify(voucher);
        _validateVoucherParams(signer, voucher.owner, voucher.signature);

        uint32 timestamp = block.timestamp.toUint32();

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
                _msgSender(),
                index.toUint32(),
                timestamp,
                0
            );

            emit TokenStaked(_msgSender(), tokenId, timestamp);
        }

        tokensInStake += voucher.tokenIds.length;

        _markSignatureUsed(voucher.signature);
    }

    function unstake(UnstakeVoucher calldata voucher, address to)
        external
        whenNotPaused
        validDestination(to)
        nonReentrant
    {
        require(voucher.tokenIds.length > 0, "EWStaking: nothing to unstake");

        address signer = _verify(voucher);
        _validateVoucherParams(signer, voucher.owner, voucher.signature);

        for (uint256 i = 0; i < voucher.tokenIds.length; ++i) {
            _unstakeSingle(voucher.tokenIds[i], to);
        }

        if (voucher.claimAmount > 0) {
            _transferReward(_msgSender(), voucher.claimAmount);
            _markRewardClaimed(voucher.claimAmount);

            emit RewardClaimed(_msgSender(), voucher.claimAmount);
        }

        tokensInStake -= voucher.tokenIds.length;

        _markSignatureUsed(voucher.signature);
    }

    function claim(ClaimVoucher calldata voucher)
        external
        whenNotPaused
        nonReentrant
    {
        address signer = _verify(voucher);

        require(voucher.amount > 0, "EWStaking: nothing to claim");

        _validateVoucherParams(signer, voucher.owner, voucher.signature);

        require(
            stakes[voucher.tokenId].owner == _msgSender(),
            "EWStaking: wrong stake owner"
        );

        stakes[voucher.tokenId].rewardClaimTimestamp = block
            .timestamp
            .toUint32();

        _transferReward(_msgSender(), voucher.amount);

        _markRewardClaimed(voucher.amount);
        _markSignatureUsed(voucher.signature);

        emit RewardClaimed(_msgSender(), voucher.amount);
    }

    function claimAll(ClaimAllVoucher calldata voucher)
        external
        whenNotPaused
        nonReentrant
    {
        address signer = _verify(voucher);

        require(voucher.amount > 0, "EWStaking: nothing to claim");

        _validateVoucherParams(signer, voucher.owner, voucher.signature);

        uint256[] memory ids = userTokens[_msgSender()];
        uint32 timestamp = block.timestamp.toUint32();

        require(ids.length > 0, "EWStaking: no tokens in stake");

        for (uint256 i = 0; i < ids.length; ++i) {
            stakes[ids[i]].rewardClaimTimestamp = timestamp;
        }

        _transferReward(_msgSender(), voucher.amount);

        _markRewardClaimed(voucher.amount);
        _markSignatureUsed(voucher.signature);

        emit RewardClaimed(_msgSender(), voucher.amount);
    }

    function emergencyUnstake() external whenNotPaused nonReentrant {
        require(shutdown, "EWStaking: contract should be shut down");

        uint256[] memory ids = userTokens[_msgSender()];

        require(ids.length > 0, "EWStaking: nothing to unstake");

        uint256 unstakeAmount = ids.length > maxTokensPerUnstake
            ? maxTokensPerUnstake
            : ids.length;

        for (uint256 i = 0; i < unstakeAmount; ++i) {
            _unstakeSingle(ids[i], _msgSender());
        }

        tokensInStake -= unstakeAmount;
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

    function getTokensByOwner(address stakeOwner)
        external
        view
        returns (uint256[] memory)
    {
        return userTokens[stakeOwner];
    }

    function getClaimsInfo(address stakeOwner)
        external
        view
        returns (ClaimInfo memory)
    {
        return claims[stakeOwner];
    }

    function _validateVoucherParams(
        address signer,
        address voucherOwner,
        bytes calldata signature
    ) internal view {
        require(signer == serviceSigner, "EWStaking: invalid signature");
        require(
            !signatureUsed[signature],
            "EWStaking: this voucher already used"
        );

        require(_msgSender() == voucherOwner, "EWStaking: not your voucher");
    }

    function _unstakeSingle(uint256 tokenId, address to) internal {
        require(
            stakes[tokenId].owner == _msgSender(),
            "EWStaking: wrong stake owner"
        );

        towersContract.safeTransferFrom(address(this), to, tokenId);

        _deleteFromTokensArray(_msgSender(), tokenId);
        delete stakes[tokenId];

        emit TokenUnstaked(_msgSender(), tokenId);
    }

    function _transferReward(address rewardOwner, uint256 claimAmount)
        internal
    {
        require(
            claimAmount <= worldsToken.balanceOf(address(this)),
            "EWStaking: not enough funds to claim"
        );

        worldsToken.safeTransfer(rewardOwner, claimAmount);
    }

    function _markRewardClaimed(uint256 amount) internal {
        claims[_msgSender()].totalClaimed += amount.toUint224();
        claims[_msgSender()].lastClaimTimestamp = block.timestamp.toUint32();
    }

    function _markSignatureUsed(bytes memory signature) internal {
        signatureUsed[signature] = true;
    }

    function _deleteFromTokensArray(address stakeOwner, uint256 tokenId)
        internal
    {
        if (userTokens[stakeOwner].length == 1) {
            userTokens[stakeOwner].pop();
            return;
        }

        uint256 tokenIndex = stakes[tokenId].tokenIndex;
        uint256 swapTokenId = userTokens[stakeOwner][
            userTokens[stakeOwner].length - 1
        ];

        userTokens[stakeOwner][tokenIndex] = userTokens[stakeOwner][
            userTokens[stakeOwner].length - 1
        ];

        stakes[swapTokenId].tokenIndex = tokenIndex.toUint16();

        userTokens[stakeOwner].pop();
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
                            "StakeVoucher(uint256[] tokenIds,address owner,uint256 nonce)"
                        ),
                        keccak256(abi.encodePacked(voucher.tokenIds)),
                        voucher.owner,
                        voucher.nonce
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
                            "UnstakeVoucher(uint256[] tokenIds,address owner,uint256 claimAmount,uint256 nonce)"
                        ),
                        keccak256(abi.encodePacked(voucher.tokenIds)),
                        voucher.owner,
                        voucher.claimAmount,
                        voucher.nonce
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
                            "ClaimVoucher(uint256 tokenId,uint256 amount,uint256 nonce,address owner)"
                        ),
                        voucher.tokenId,
                        voucher.amount,
                        voucher.nonce,
                        voucher.owner
                    )
                )
            );
    }

    function _hash(ClaimAllVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ClaimAllVoucher(uint256 amount,uint256 nonce,address owner)"
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

    function _verify(ClaimAllVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
