// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract EthereumWorldsNFTStakingOld is
    IERC721Receiver,
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
        uint32 fromRewardsIndex;
        uint32 minRentPeriod;
        uint32 rentableUntil;
        uint96 rentalDailyPrice;
        uint96 deposit;
        address owner;
    }

    struct UserRewards {
        uint128 accumulated;
        uint128 claimed;
    }

    struct RewardParams {
        uint128 baseReward;
        uint32 standardMultiplier;
        uint32 luxuryMultiplier;
        uint32 startTimestamp;
        uint32 endTimestamp;
    }

    uint256 private maxTokensInStake = 4388;
    uint256 private tokensInStake = 0;

    IERC20 immutable worldsToken;
    IERC721 immutable towersContract;

    uint256 public rewardParamsIndex = 0;
    uint256 private nextRewardParamsIndex = 0;

    mapping(uint256 => StakeInfo) private stakes;
    mapping(uint256 => RewardParams) public rewardParams;
    mapping(address => UserRewards) public rewards; // should be private, public for testing
    mapping(address => uint256[]) public userTokens;

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
    event RewardParamsUpdate(
        uint256 indexed idx,
        uint256 baseReward,
        uint256 standardMultiplier,
        uint256 luxuryMultiplier
    );
    event RewardClaimed(
        address indexed by,
        address indexed receiver,
        uint256 amount
    );

    constructor(address _worldsToken, address _towersContract) {
        require(_worldsToken != address(0), "EWStaking: zero address");
        require(_towersContract != address(0), "EWStaking: zero address");

        worldsToken = IERC20(_worldsToken);
        towersContract = IERC721(_towersContract);
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

    function setRewardParams(
        uint128 _baseReward,
        uint32 _standardMultiplier,
        uint32 _luxuryMultiplier
    ) external onlyOwner {
        rewardParams[nextRewardParamsIndex] = RewardParams(
            _baseReward,
            _standardMultiplier,
            _luxuryMultiplier,
            block.timestamp.toUint32(),
            0
        );

        if (nextRewardParamsIndex != 0) {
            rewardParams[rewardParamsIndex].endTimestamp = block
                .timestamp
                .toUint32();
        }

        rewardParamsIndex = nextRewardParamsIndex;
        nextRewardParamsIndex += 1;

        emit RewardParamsUpdate(
            rewardParamsIndex,
            _baseReward,
            _standardMultiplier,
            _luxuryMultiplier
        );
    }

    function stake(
        uint256[] calldata tokens,
        bool rentable,
        uint32 minRentPeriod,
        uint32 rentableUntil,
        uint96 rentalDailyPrice,
        uint96 deposit
    ) external whenNotPaused nonReentrant {
        require(
            tokensInStake + tokens.length <= maxTokensInStake,
            "EWStaking: tokens in stake limit reached"
        );

        for (uint256 i = 0; i < tokens.length; ++i) {
            uint256 tokenId = tokens[i];

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
                rentable,
                index.toUint16(),
                block.timestamp.toUint32(),
                rewardParamsIndex.toUint32(),
                minRentPeriod,
                rentableUntil,
                rentalDailyPrice,
                deposit,
                _msgSender()
            );

            emit TokenStaked(_msgSender(), tokenId, rentable);
        }

        tokensInStake += tokens.length;
    }

    function unstake(uint256[] calldata tokenIds, address to)
        external
        whenNotPaused
        validDestination(to)
        nonReentrant
    {
        uint256 accumulated = 0;

        for (uint256 i = 0; i < tokenIds.length; ++i) {
            uint256 tokenId = tokenIds[i];

            require(
                stakes[tokenId].owner == _msgSender(),
                "EWStaking: you are not an owner"
            );

            // here should be require to revert unstake of currently rented tokens
            //
            // require(rentingContract.isActiveRent(tokenId), "Unstake rented token");

            accumulated += getRewardsByToken(tokenId);
            towersContract.safeTransferFrom(address(this), to, tokenId);

            _deleteFromTokensArray(_msgSender(), stakes[tokenId].tokenIndex);
            delete stakes[tokenId];

            emit TokenUnstaked(_msgSender(), tokenId);
        }

        rewards[_msgSender()].accumulated += accumulated.toUint128();

        _updateTokensIndex(_msgSender());

        tokensInStake -= tokenIds.length;
    }

    function claim(address to) external whenNotPaused nonReentrant {
        uint256 amount = claimableAmount();

        require(amount > 0, "EWStaking: nothing to claim");
        require(
            amount <= worldsToken.balanceOf(address(this)),
            "EWStaking: not enough funds to claim"
        );

        _updateStakesRewardTimestamp(_msgSender());

        rewards[_msgSender()].accumulated = 0;
        rewards[_msgSender()].claimed += amount.toUint128();

        worldsToken.safeTransfer(to, amount);

        emit RewardClaimed(_msgSender(), to, amount);
    }

    function claimableAmount() public view returns (uint256 total) {
        total = rewards[_msgSender()].accumulated;

        if (userTokens[_msgSender()].length > 0) {
            total += _getRewardsByOwner(_msgSender());
        }
    }

    function setRentable(
        uint256 tokenId,
        bool _rentable,
        uint32 _minRentPeriod,
        uint32 _rentableUntil,
        uint32 _rentalDailyPrice,
        uint96 _deposit
    ) external whenNotPaused {
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

    function getStakeInfo(uint256 tokenId)
        external
        view
        returns (StakeInfo memory)
    {
        return stakes[tokenId];
    }

    function isRentable(uint256 tokenId) external view returns (bool) {
        return stakes[tokenId].rentable;
    }

    function getRewardsByToken(uint256 tokenId)
        public
        view
        returns (uint256 totalRewards)
    {
        bool isLuxury = _isLuxuryApartment(tokenId);

        for (
            uint256 i = stakes[tokenId].fromRewardsIndex;
            i <= rewardParamsIndex;
            ++i
        ) {
            uint256 startTimestamp = 0;

            if (i == stakes[tokenId].fromRewardsIndex) {
                startTimestamp = stakes[tokenId].timestamp;
            } else {
                startTimestamp = rewardParams[i].startTimestamp;
            }

            uint256 hoursInStake = 0;

            if (rewardParams[i].endTimestamp == 0) {
                hoursInStake = block.timestamp - startTimestamp;
            } else {
                hoursInStake = rewardParams[i].endTimestamp - startTimestamp;
            }

            hoursInStake /= 1 hours; // full hours in stake

            uint256 rewardsMultiplier = rewardParams[i].standardMultiplier +
                (isLuxury ? rewardParams[i].luxuryMultiplier : 0);

            totalRewards +=
                (hoursInStake *
                    (rewardParams[i].baseReward * rewardsMultiplier)) /
                24;
        }
    }

    function _getRewardsByOwner(address owner)
        internal
        view
        returns (uint256 totalRewards)
    {
        for (uint256 i = 0; i < userTokens[owner].length; ++i) {
            totalRewards += getRewardsByToken(userTokens[owner][i]);
        }
    }

    function _isLuxuryApartment(uint256 tokenId) internal pure returns (bool) {
        return tokenId % 100 == 21 || tokenId % 100 == 22;
    }

    function _deleteFromTokensArray(address owner, uint256 index) internal {
        userTokens[owner][index] = userTokens[owner][
            userTokens[owner].length - 1
        ];
        userTokens[owner].pop();
    }

    function _updateTokensIndex(address owner) internal {
        for (uint16 i = 0; i < userTokens[owner].length; ++i) {
            uint256 tokenId = userTokens[owner][i];

            stakes[tokenId].tokenIndex = i;
        }
    }

    function _updateStakesRewardTimestamp(address owner) internal {
        if (userTokens[owner].length == 0) {
            return;
        }

        uint32 timestamp = block.timestamp.toUint32();
        uint32 rewardsIndex = rewardParamsIndex.toUint32();

        for (uint256 i = 0; i < userTokens[owner].length; ++i) {
            uint256 tokenId = userTokens[owner][i];

            stakes[tokenId].timestamp = timestamp;
            stakes[tokenId].fromRewardsIndex = rewardsIndex;
        }
    }
}
