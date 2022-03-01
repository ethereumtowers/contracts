//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./EthereumTower.sol";

contract TowersProxy is EIP712, Ownable, ReentrancyGuard {
    string private constant SIGNING_DOMAIN = "EthereumTower";
    string private constant SIGNATURE_VERSION = "1";
    uint256 public MAX_ITEMS_IN_TOWER = 50; //Max token count on tower 2
    bool public isActive = true; //Smart contract status
    address public serviceAddress; //Backend signer address

    address public TowersContract; //Ethereum tower main contract
    uint256 public currentStage; //Current stage setted on addStageRole
    uint256 public tokenCount = 34; //Minted on tower 2 tokens

    mapping(uint256 => bytes32) public currentStageRole;
    mapping(address => bool) public ownerOfToken;

    constructor(
        address _towersContract,
        address _serviceAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        TowersContract = _towersContract;
        serviceAddress = _serviceAddress;
    }

    struct EthereumTowerVoucher {
        uint256 tokenId;
        bytes signature;
    }

    function redeem(EthereumTowerVoucher calldata ethereumtowervoucher)
        public
        payable
        nonReentrant
        returns (uint256)
    {
        //Check that contract is enabled
        require(isActive, "Try agan later,for now contract is disabled by Administrator!");
        //Check user that is not have nft on tower 2
        require(!ownerOfToken[msg.sender], "User can have only one of the nft on the tower");
        //Check tokencount on contract
        require(tokenCount < MAX_ITEMS_IN_TOWER, "Max tokens on this tower has alredy minted");
        uint256 stage = EthereumTowers(TowersContract).activeStage();
        //check that stage on proxy == stage on main
        require(currentStage == stage, "Incorrect stage on proxy contract");
        //Check private or public round on main contract
        bool isPrivate = EthereumTowers(TowersContract).isPrivateRound();
        //If private active check user role
        if (isPrivate) {
            bool success = EthereumTowers(TowersContract).hasRole(
                currentStageRole[currentStage],
                msg.sender
            );
            require(success, "You do not have role for the current stage");
        }
        //Check price of token on main contract
        uint256 priceFrom = EthereumTowers(TowersContract).stagePrice();
        require(msg.value == priceFrom, "The price is incorrect");
        //check that signature signer == service address
        address signer = _verify(ethereumtowervoucher);
        require(signer == serviceAddress, "Signature not valid");
        //Mint token to msg.sender
        EthereumTowers(TowersContract).mintByAdmin(
            msg.sender,
            ethereumtowervoucher.tokenId
        );
        //Mark user as owner of token on tower 2
        ownerOfToken[msg.sender] = true;
        //Incrase token count on tower 2
        tokenCount++;
        //return tokenId
        return ethereumtowervoucher.tokenId;
    }

    function _hash(EthereumTowerVoucher calldata ethereumtowervoucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256("EthereumTowerVoucher(uint256 tokenId)"),
                        ethereumtowervoucher.tokenId
                    )
                )
            );
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function _verify(EthereumTowerVoucher calldata ethereumtowervoucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(ethereumtowervoucher);
        return ECDSA.recover(digest, ethereumtowervoucher.signature);
    }

    function withdrawableBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient funds to withdraw");
        payable(msg.sender).transfer(amount);
    }

    //Add role and stage similar main contract 
    function addRoleForStage(uint256 _stage, bytes32 _role) public onlyOwner {
        currentStageRole[_stage] = _role;
        currentStage = _stage;
    }
    //Clear token ownership on tower 2
    function resetOwnerOf(address _user) public onlyOwner {
      ownerOfToken[_user] = false;
    }
    //Reset minted token count on tower 2
    function resetTokenCount(uint256 _count) public onlyOwner {
      tokenCount = _count;
    }
    //Disable contract
    function disableContract() public onlyOwner {
      isActive = false;
    }
    //Enable contract
    function enableContract() public onlyOwner {
      isActive = true;
    }
    //Change service address wich sign signature at backend
    function changeServiceAddress(address _serviceAddress) public onlyOwner {
      serviceAddress = _serviceAddress;
    }
}
