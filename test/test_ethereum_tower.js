const { expect } = require('chai');
const { ethers } = require('hardhat');
const hre = require('hardhat');
const consola = require('consola');

const contractName = "EthereumTowers";

const SIGNING_DOMAIN = "ETT_VOUCHER";
const SIGNATURE_VERSION = "1";

let towersContractAddress;

async function createAndSignVoucher(tokenId, tokenUri, contract, signer) {
  const chainId = await contract.getChainId();

  const signingDomain = {
    name: SIGNING_DOMAIN,
    version: SIGNATURE_VERSION,
    verifyingContract: contract.address,
    chainId
  };

  const types = {
    EttVoucher: [
      { name: "tokenId", type: "uint256" },
      { name: "uri", type: "string" }
    ]
  };

  const voucher = {
    tokenId: tokenId,
    uri: tokenUri
  };

  const signature = await signer._signTypedData(signingDomain, types, voucher);

  return {
    ...voucher,
    signature: signature
  };
}

describe("EthereumTower contract", function () {
  it("should deploy the new EthereumTower smart contract", async function () {
    const testUsers = await ethers.getSigners();

    const ET = await ethers.getContractFactory(contractName);
    const ethereumTowers = await ET.deploy("https://ipfs.io/ipfs/", "folder-cid", testUsers[8].address);

    await ethereumTowers.deployed();
    towersContractAddress = ethereumTowers.address

    expect(await ethereumTowers.name()).to.equal(contractName);
  })

  describe("Contract functions", function () {
    var contractFactory;
    var ethereumTowers;
    var whitelistedRole;
    var testUsers;

    before(async () => {
      contractFactory = await ethers.getContractFactory(contractName);
      ethereumTowers = contractFactory.attach(towersContractAddress);
      whitelistedRole = await ethereumTowers.WHITELISTED();
      testUsers = await ethers.getSigners();
    });

    it("should get contract owner address", async function() {
      expect(await ethereumTowers.owner()).to.be.equal(testUsers[0].address);
    });

    it("should restrict calling updateProjectAddress to admin role only", async function () {
      await expect(ethereumTowers.connect(testUsers[1]).updateProjectAddress(testUsers[2].address))
        .to.be.revertedWith("EthereumTowers: must have admin role");
    });

    it("should change projectAddress by updateProjectAddress", async function() {
      expect(await ethereumTowers.updateProjectAddress(testUsers[8].address));
    });

    it("should revert changeTower to unsupported tower", async function () {
      await expect(ethereumTowers.changeTower(3))
        .to.be.revertedWith("Ethereum tower: available number 1 or 2");
    });

    it("should restrict calling changeTower to admin role only", async function () {
      await expect(ethereumTowers.connect(testUsers[1]).changeTower(2))
        .to.be.revertedWith("EthereumTowers: must have admin role");
    });

    it("should change active stage to 15 and price to 1 ETH", async function () {
      await ethereumTowers.changeStage(15, ethers.utils.parseEther("1"));

      let activeStage = await ethereumTowers.activeStage();
      let stagePrice = await ethereumTowers.stagePrice();

      expect(activeStage == 15).to.be.true
        && expect(stagePrice.toString() == ethers.utils.parseEther("1").toString()).to.be.true;
    });

    it("should restrict calling changeStage to admin role only", async function () {
      await expect(ethereumTowers.connect(testUsers[1]).changeStage(15, ethers.utils.parseEther("1")))
        .to.be.revertedWith("EthereumTowers: must have admin role");
    });

    it("should start private sale round for 10 items", async function () {
      await ethereumTowers.changeRound(10, true);

      let isPrivateRound = await ethereumTowers.isPrivateRound();
      let availableItemsOnRound = await ethereumTowers.availableItemsOnRound();

      expect(isPrivateRound == true).to.be.true && expect(availableItemsOnRound == 10).to.be.true;
    });

    it("should start public sale round for 50 items", async function () {
      await ethereumTowers.changeRound(50, false);

      let isPrivateRound = await ethereumTowers.isPrivateRound();
      let availableItemsOnRound = await ethereumTowers.availableItemsOnRound();

      expect(isPrivateRound == false).to.be.true && expect(availableItemsOnRound == 50).to.be.true;
    });

    it("should restrict calling changeRound to admin role only", async function () {
      await expect(ethereumTowers.connect(testUsers[1]).changeRound(100, true))
        .to.be.revertedWith("EthereumTowers: must have admin role");
    });

    it("should add WHITELISTED role to stage 0", async function () {
      expect(await ethereumTowers.addStageRole(0, whitelistedRole));
    });

    it("should restrict calling addStageRole to admin role only", async function () {
      await expect(ethereumTowers.connect(testUsers[1]).addStageRole(0, whitelistedRole))
        .to.be.revertedWith("EthereumTowers: must have admin role");
    });

    it("should get chain id", async function () {
      const network = await ethers.provider.getNetwork();

      expect(await ethereumTowers.getChainId()).to.equal(network.chainId);
    });

    it("should grant roles using batchRoles", async function () {
      const wallets = Array.from({ length: 10 }, () => ethers.Wallet.createRandom().address);

      await ethereumTowers.batchRoles(wallets, whitelistedRole);

      var walletRoles = [];

      for (let wallet of wallets) {
        let res = await ethereumTowers.hasRole(whitelistedRole, wallet);
        walletRoles.push(res);
      }

      const expected = Array(10).fill(true);

      expect(walletRoles).to.deep.equal(expected);
    });

    it("should restrict calling batchRoles to admin role only", async function () {
      const wallets = Array.from({ length: 10 }, () => ethers.Wallet.createRandom().address);

      await expect(ethereumTowers.connect(testUsers[1]).batchRoles(wallets, whitelistedRole))
        .to.be.revertedWith("EthereumTowers: must have admin role");
    });

    it("should revert get tokenURI for non-existing token", async function () {
      await expect(ethereumTowers.tokenURI(31337))
        .to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
    });

    it("should restrict calling mintBatch to admin role only", async function () {
      const wallets = Array.from({ length: 10 }, () => ethers.Wallet.createRandom().address);
      const tokens = [...Array(10).keys()];

      await expect(ethereumTowers.connect(testUsers[1]).mintBatch(wallets, tokens))
        .to.be.revertedWith("EthereumTowers: must have admin role");
    });

    it("should revert calling mintBatch for different wallets and tokens count", async function () {
      const wallets = Array.from({ length: 30 }, () => ethers.Wallet.createRandom().address);
      const tokens = [...Array(30).keys()].slice(20);

      await expect(ethereumTowers.mintBatch(wallets, tokens))
        .to.be.revertedWith("Please check address & id count");
    });

    it("should mintBatch 50 tokens to 50 addresses", async function () {
      const wallets = Array.from({ length: 50 }, () => ethers.Wallet.createRandom().address);
      const tokens = [...Array(100).keys()].slice(50);

      expect(await ethereumTowers.mintBatch(wallets, tokens));
    });

    it("should restrict calling mintByAdmin to admin role only", async function () {
      await expect(ethereumTowers.connect(testUsers[1]).mintByAdmin(testUsers[2].address, 10001))
        .to.be.revertedWith("EthereumTowers: must have admin role");
    });

    it("should mint token using mintByAdmin and emit events", async function () {
      await expect(ethereumTowers.mintByAdmin(testUsers[2].address, 10001))
        .to.emit(ethereumTowers, "Transfer")
        .withArgs("0x0000000000000000000000000000000000000000", testUsers[2].address, 10001);
    });

    it("should burn own token", async function () {
      expect(await ethereumTowers.connect(testUsers[2]).burn(10001));
    });

    it("should revert burn of not-existing token", async function () {
      await expect(ethereumTowers.connect(testUsers[2]).burn(10001))
        .to.be.revertedWith("ERC721: operator query for nonexistent token");
    });
  });

  describe("Ethereum Tower 1", function () {
    var contractFactory;
    var ethereumTowers;
    var whitelistedRole;
    var testUsers;

    before(async () => {
      contractFactory = await ethers.getContractFactory(contractName);
      ethereumTowers = contractFactory.attach(towersContractAddress);
      whitelistedRole = await ethereumTowers.WHITELISTED();
      testUsers = await ethers.getSigners();
    });

    it("should enable mint for Tower 1", async function () {
      await ethereumTowers.changeTower(1);
      let tower = await ethereumTowers.activeTower();

      expect(tower.toString()).to.equal("1");
    });

    it("should add WHITELISTED role to stage 101", async function () {
      expect(await ethereumTowers.addStageRole(101, whitelistedRole));
    });

    it("should revert mint for not WHITELISTED addresses", async function () {
      await expect(ethereumTowers.connect(testUsers[3]).mint(testUsers[3].address, 0, 101))
        .to.be.revertedWith("EthereumTowers: must have minter role to mint on this tower");
    });

    it("should mint token with id 0 on Tower 1 for WHITELISTED address", async function () {
      await ethereumTowers.batchRoles([testUsers[3].address], whitelistedRole);

      expect(await ethereumTowers.connect(testUsers[3]).mint(testUsers[3].address, 0, 101));
    });

    it("should get tokenUrl for token with id 0", async function () {
      expect(await ethereumTowers.tokenURI(0)).to.equal("https://ipfs.io/ipfs/folder-cid/0.json");
    });

    it("should update baseCid in contract", async function () {
      await ethereumTowers.updateBaseCid("new-base-cid");

      expect(await ethereumTowers.tokenURI(0)).to.equal("https://ipfs.io/ipfs/new-base-cid/0.json");
    });

    it("should mint token with id 1 on Tower 1 for WHITELISTED address and emit events", async function () {
      await ethereumTowers.changeStage(0, ethers.utils.parseEther("1"));

      await expect(ethereumTowers.connect(testUsers[3]).mint(testUsers[3].address, 1, 101))
        .to.emit(ethereumTowers, "MintingInfo")
        .withArgs(testUsers[3].address, 1, false, 0, ethers.utils.parseEther("1"))
        .and.to.emit(ethereumTowers, "Transfer")
        .withArgs("0x0000000000000000000000000000000000000000", testUsers[3].address, 1);
    });

    it("should mint new token for free for random user", async function () {
      const wallet = ethers.Wallet.createRandom();

      expect(await ethereumTowers.connect(testUsers[3]).mint(wallet.address, 2, 101));
    });

    it("should redeem token with id 3", async function () {
      const voucher = await createAndSignVoucher(3, "https://ipfs.io/ipfs/0x3", ethereumTowers, testUsers[0]);

      expect(await ethereumTowers.connect(testUsers[1]).redeem(testUsers[2].address, voucher));
    });

    it("should revert redeem token with id 3 for address who already owns token", async function () {
      const voucher = await createAndSignVoucher(3, "https://ipfs.io/ipfs/0x3", ethereumTowers, testUsers[0]);

      await expect(ethereumTowers.connect(testUsers[1]).redeem(testUsers[1].address, voucher))
        .to.be.revertedWith("User can have only one of the nft");
    });

    it("should revert redeem for unauthorized address", async function () {
      const voucher = await createAndSignVoucher(4, "https://ipfs.io/ipfs/0x4", ethereumTowers, testUsers[2]);

      await expect(ethereumTowers.connect(testUsers[0]).redeem(testUsers[1].address, voucher))
        .to.be.revertedWith("Signature invalid or unauthorized");
    });
  });

  describe("Ethereum Tower 2", function () {
    var contractFactory;
    var ethereumTowers;
    var whitelistedRole;
    var testUsers;
    var projectAddress;

    before(async () => {
      contractFactory = await ethers.getContractFactory(contractName);
      ethereumTowers = contractFactory.attach(towersContractAddress);
      whitelistedRole = await ethereumTowers.WHITELISTED();

      testUsers = await ethers.getSigners();
      projectAddress = testUsers[8].address;

      await ethereumTowers.changeStage(5, ethers.utils.parseEther("1", "ether"));
      await ethereumTowers.changeRound(100, true);
    });

    it("should enable mint for Tower 2 by admin", async function () {
      await ethereumTowers.changeTower(2);

      const tower = await ethereumTowers.activeTower();

      expect(tower.toString()).to.equal("2");
    });

    it("should revert mint on incorrect stage", async function () {
      await expect(ethereumTowers.connect(testUsers[4]).mint(testUsers[4].address, 199, 10))
        .to.be.revertedWith("Incorrect stage");
    });

    it("should be in private sale round", async function () {
      expect(await ethereumTowers.isPrivateRound()).to.equal(true);
    });

    it("should edit settings of private sale", async function () {
      expect(await ethereumTowers.changeStage(1, ethers.utils.parseEther("0.2")));
    });

    it("should get status of private sale with stage and price 0.2 ether", async function () {
      expect(await ethereumTowers.activeStage()).to.equal(1);
      expect(await ethereumTowers.stagePrice()).to.equal(ethers.utils.parseEther("0.2"));
    });

    it("should grant WHITELISTED role by admin", async function () {
      expect(await ethereumTowers.grantRole(whitelistedRole, testUsers[4].address));
    });

    it("should revert mint without WHITELISTED role enabled on active stage", async function () {
      const randomWallet = ethers.Wallet.createRandom();

      await expect(ethereumTowers.connect(testUsers[4]).mint(randomWallet.address, 222, 1))
        .to.be.revertedWith("EthereumTowers: must have minter role to mint on this tower");
    });

    it("should revert mint without sending 0.2 ETH", async function () {
      const randomWallet = ethers.Wallet.createRandom();

      await ethereumTowers.addStageRole(1, whitelistedRole);

      await expect(ethereumTowers.connect(testUsers[4]).mint(randomWallet.address, 222, 1))
        .to.be.revertedWith("You must send funds to mint on this tower");
    });

    it("should mint token 222 with granted role and payable price 0.2 ETH", async function () {
      const randomWallet = ethers.Wallet.createRandom();

      expect(await ethereumTowers.connect(testUsers[4]).mint(randomWallet.address, 222, 1, {
        value: ethers.utils.parseEther("0.2")
      }));
    });

    it("should transfer 0.2 ETH to projectAddress on mint in private sale round", async function() {
      const randomWallet = ethers.Wallet.createRandom();

      const balanceBefore = await ethers.provider.getBalance(projectAddress);

      await ethereumTowers.connect(testUsers[4]).mint(randomWallet.address, 888, 1, {
        value: ethers.utils.parseEther("0.2")
      });

      const balanceAfter = await ethers.provider.getBalance(projectAddress);

      expect(balanceAfter == balanceBefore + ethers.utils.parseEther("0.2"));
    });

    it("should revert mint new token for address that already has a token", async function () {
      const randomWallet = ethers.Wallet.createRandom();

      await ethereumTowers.connect(testUsers[4]).mint(randomWallet.address, 223, 1, {
        value: ethers.utils.parseEther("0.2")
      });

      await expect(ethereumTowers.connect(testUsers[4]).mint(randomWallet.address, 224, 1, {
        value: ethers.utils.parseEther("0.2")
      }))
        .to.be.revertedWith("User can have only one of the nft");
    });

    it("should revert mint when there is no more available items for sale", async function () {
      const randomWallet = ethers.Wallet.createRandom();

      await ethereumTowers.changeRound(1, true);

      await expect(ethereumTowers.connect(testUsers[4]).mint(randomWallet.address, 334, 1, {
        value: ethers.utils.parseEther("0.2")
      }))
        .to.be.revertedWith("Please wait for the next round to begin");
    });

    it("should enable public sale by admin", async function () {
      await ethereumTowers.changeRound(100, false);

      expect(await ethereumTowers.isPrivateRound()).to.equal(false);
    });

    it("should revert mint on public sale without sending 0.2 ETH", async function () {
      await expect(ethereumTowers.connect(testUsers[5]).mint(testUsers[5].address, 444, 1))
        .to.be.revertedWith("You must send funds to mint on this tower");
    });

    it("should mint on public sale for any user", async function () {
      const randomWallet = ethers.Wallet.createRandom();

      expect(await ethereumTowers.connect(testUsers[6]).mint(randomWallet.address, 555, 1, {
        value: ethers.utils.parseEther("0.2", "ether")
      }));
    });

    it("should transfer 0.2 ETH to projectAddress on mint in public sale round", async function() {
      const randomWallet = ethers.Wallet.createRandom();

      const balanceBefore = await ethers.provider.getBalance(projectAddress);

      await ethereumTowers.connect(testUsers[4]).mint(randomWallet.address, 101010, 1, {
        value: ethers.utils.parseEther("0.2")
      });

      const balanceAfter = await ethers.provider.getBalance(projectAddress);

      expect(balanceAfter == balanceBefore + ethers.utils.parseEther("0.2"));
    });

    it("should revert mint of new token on public sale for address that already has a token", async function () {
      const randomWallet = ethers.Wallet.createRandom();

      await ethereumTowers.connect(testUsers[7]).mint(randomWallet.address, 777, 1, {
        value: ethers.utils.parseEther("0.2")
      });

      await expect(ethereumTowers.connect(testUsers[7]).mint(randomWallet.address, 778, 1, {
        value: ethers.utils.parseEther("0.2")
      }))
        .to.be.revertedWith("The user has already owns the token");
    });
  });
});
