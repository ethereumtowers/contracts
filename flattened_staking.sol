pragma solidity ^0.8.0;
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}
pragma solidity ^0.8.0;
abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    constructor() {
        _transferOwnership(_msgSender());
    }
    function owner() public view virtual returns (address) {
        return _owner;
    }
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        _transferOwnership(newOwner);
    }
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
pragma solidity ^0.8.0;
abstract contract Pausable is Context {
    event Paused(address account);
    event Unpaused(address account);
    bool private _paused;
    constructor() {
        _paused = false;
    }
    function paused() public view virtual returns (bool) {
        return _paused;
    }
    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }
    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}
pragma solidity ^0.8.0;
abstract contract ReentrancyGuard {
                        uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    constructor() {
        _status = _NOT_ENTERED;
    }
    modifier nonReentrant() {
                require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
                _status = _ENTERED;
        _;
                        _status = _NOT_ENTERED;
    }
}
pragma solidity ^0.8.0;
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}
pragma solidity ^0.8.0;
library Address {
    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
    function sendValue(address payable recipient, uint256 amount) internal {
        require(
            address(this).balance >= amount,
            "Address: insufficient balance"
        );
        (bool success, ) = recipient.call{value: amount}("");
        require(
            success,
            "Address: unable to send value, recipient may have reverted"
        );
    }
    function functionCall(address target, bytes memory data)
        internal
        returns (bytes memory)
    {
        return functionCall(target, data, "Address: low-level call failed");
    }
    function functionCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }
    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value
    ) internal returns (bytes memory) {
        return
            functionCallWithValue(
                target,
                data,
                value,
                "Address: low-level call with value failed"
            );
    }
    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(
            address(this).balance >= value,
            "Address: insufficient balance for call"
        );
        require(isContract(target), "Address: call to non-contract");
        (bool success, bytes memory returndata) = target.call{value: value}(
            data
        );
        return verifyCallResult(success, returndata, errorMessage);
    }
    function functionStaticCall(address target, bytes memory data)
        internal
        view
        returns (bytes memory)
    {
        return
            functionStaticCall(
                target,
                data,
                "Address: low-level static call failed"
            );
    }
    function functionStaticCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal view returns (bytes memory) {
        require(isContract(target), "Address: static call to non-contract");
        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }
    function functionDelegateCall(address target, bytes memory data)
        internal
        returns (bytes memory)
    {
        return
            functionDelegateCall(
                target,
                data,
                "Address: low-level delegate call failed"
            );
    }
    function functionDelegateCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(isContract(target), "Address: delegate call to non-contract");
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResult(success, returndata, errorMessage);
    }
    function verifyCallResult(
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) internal pure returns (bytes memory) {
        if (success) {
            return returndata;
        } else {
                        if (returndata.length > 0) {
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}
pragma solidity ^0.8.0;
library SafeERC20 {
    using Address for address;
    function safeTransfer(
        IERC20 token,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(token.transfer.selector, to, value)
        );
    }
    function safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(token.transferFrom.selector, from, to, value)
        );
    }
    function safeApprove(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
                                require(
            (value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(token.approve.selector, spender, value)
        );
    }
    function safeIncreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        uint256 newAllowance = token.allowance(address(this), spender) + value;
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(
                token.approve.selector,
                spender,
                newAllowance
            )
        );
    }
    function safeDecreaseAllowance(
        IERC20 token,
        address spender,
        uint256 value
    ) internal {
        unchecked {
            uint256 oldAllowance = token.allowance(address(this), spender);
            require(
                oldAllowance >= value,
                "SafeERC20: decreased allowance below zero"
            );
            uint256 newAllowance = oldAllowance - value;
            _callOptionalReturn(
                token,
                abi.encodeWithSelector(
                    token.approve.selector,
                    spender,
                    newAllowance
                )
            );
        }
    }
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        bytes memory returndata = address(token).functionCall(
            data,
            "SafeERC20: low-level call failed"
        );
        if (returndata.length > 0) {
                        require(
                abi.decode(returndata, (bool)),
                "SafeERC20: ERC20 operation did not succeed"
            );
        }
    }
}
pragma solidity ^0.8.0;
interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
pragma solidity ^0.8.0;
interface IERC721 is IERC165 {
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId)
        external
        view
        returns (address operator);
    function setApprovalForAll(address operator, bool _approved) external;
    function isApprovedForAll(address owner, address operator)
        external
        view
        returns (bool);
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;
}
pragma solidity ^0.8.0;
interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
pragma solidity ^0.8.0;
library SafeCast {
    function toUint224(uint256 value) internal pure returns (uint224) {
        require(
            value <= type(uint224).max,
            "SafeCast: value doesn't fit in 224 bits"
        );
        return uint224(value);
    }
    function toUint128(uint256 value) internal pure returns (uint128) {
        require(
            value <= type(uint128).max,
            "SafeCast: value doesn't fit in 128 bits"
        );
        return uint128(value);
    }
    function toUint96(uint256 value) internal pure returns (uint96) {
        require(
            value <= type(uint96).max,
            "SafeCast: value doesn't fit in 96 bits"
        );
        return uint96(value);
    }
    function toUint64(uint256 value) internal pure returns (uint64) {
        require(
            value <= type(uint64).max,
            "SafeCast: value doesn't fit in 64 bits"
        );
        return uint64(value);
    }
    function toUint32(uint256 value) internal pure returns (uint32) {
        require(
            value <= type(uint32).max,
            "SafeCast: value doesn't fit in 32 bits"
        );
        return uint32(value);
    }
    function toUint16(uint256 value) internal pure returns (uint16) {
        require(
            value <= type(uint16).max,
            "SafeCast: value doesn't fit in 16 bits"
        );
        return uint16(value);
    }
    function toUint8(uint256 value) internal pure returns (uint8) {
        require(
            value <= type(uint8).max,
            "SafeCast: value doesn't fit in 8 bits"
        );
        return uint8(value);
    }
    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "SafeCast: value must be positive");
        return uint256(value);
    }
    function toInt128(int256 value) internal pure returns (int128) {
        require(
            value >= type(int128).min && value <= type(int128).max,
            "SafeCast: value doesn't fit in 128 bits"
        );
        return int128(value);
    }
    function toInt64(int256 value) internal pure returns (int64) {
        require(
            value >= type(int64).min && value <= type(int64).max,
            "SafeCast: value doesn't fit in 64 bits"
        );
        return int64(value);
    }
    function toInt32(int256 value) internal pure returns (int32) {
        require(
            value >= type(int32).min && value <= type(int32).max,
            "SafeCast: value doesn't fit in 32 bits"
        );
        return int32(value);
    }
    function toInt16(int256 value) internal pure returns (int16) {
        require(
            value >= type(int16).min && value <= type(int16).max,
            "SafeCast: value doesn't fit in 16 bits"
        );
        return int16(value);
    }
    function toInt8(int256 value) internal pure returns (int8) {
        require(
            value >= type(int8).min && value <= type(int8).max,
            "SafeCast: value doesn't fit in 8 bits"
        );
        return int8(value);
    }
    function toInt256(uint256 value) internal pure returns (int256) {
                require(
            value <= uint256(type(int256).max),
            "SafeCast: value doesn't fit in an int256"
        );
        return int256(value);
    }
}
pragma solidity 0.8.9;
contract EthereumWorldsNFTStaking is
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
    mapping(address => UserRewards) public rewards;     mapping(address => uint256[]) public userTokens;
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
                        //
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
            hoursInStake /= 1 hours; 
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
