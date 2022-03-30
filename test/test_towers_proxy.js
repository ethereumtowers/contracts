const { expect } = require('chai');
const { ethers } = require('hardhat');
const hre = require('hardhat');

const ettContractName = "EthereumTowers";
const ettProxyContractName = "TowersProxy";

const SIGNING_DOMAIN = "EthereumTower";
const SIGNATURE_VERSION = "1";

let ettContractAddress;
let ettProxyContractAddress;

async function createAndSignVoucher(tokenId, contract, signer) {
  const chainId = await contract.getChainId();

  const signingDomain = {
    name: SIGNING_DOMAIN,
    version: SIGNATURE_VERSION,
    verifyingContract: contract.address,
    chainId
  };

  const types = {
    EthereumTowerVoucher: [
      { name: "tokenId", type: "uint256" }
    ]
  };

  const voucher = {
    tokenId: tokenId
  };

  const signature = await signer._signTypedData(signingDomain, types, voucher);

  return {
    ...voucher,
    signature: signature
  };
}

describe("TowersProxy contract", function () {
  it("should deploy the new TowersProxy smart contract", async function () {
    const testUsers = await ethers.getSigners();

    const feeAddress = testUsers[1].address;
    const serviceAddress = testUsers[2].address;

    const ettContractFactory = await ethers.getContractFactory(ettContractName);
    const ethereumTowers = await ettContractFactory.deploy("https://ipfs.io/ipfs/", "folder-cid", feeAddress);
    await ethereumTowers.deployed();

    ettContractAddress = ethereumTowers.address

    await ethereumTowers.changeTower(2);

    const proxyContractFactory = await ethers.getContractFactory(ettProxyContractName);
    const proxyContract = await proxyContractFactory.deploy(ettContractAddress, serviceAddress);
    await proxyContract.deployed();

    ettProxyContractAddress = proxyContract.address;

    expect(await ethereumTowers.name()).to.equal(ettContractName);
  })

  describe("Contract functions", function () {
    var ettContract;
    var ettProxyContract;
    var testUsers;

    var serviceAccount;
    var newServiceAccount;

    var whitelistedRole;
    var testRole;

    before(async () => {
      const ettContractFactory = await ethers.getContractFactory(ettContractName);
      ettContract = ettContractFactory.attach(ettContractAddress);

      const ettProxyContractFactory = await ethers.getContractFactory(ettProxyContractName);
      ettProxyContract = ettProxyContractFactory.attach(ettProxyContractAddress);

      testUsers = await ethers.getSigners();

      whitelistedRole = await ettContract.WHITELISTED();

      testRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TEST_ROLE"));

      serviceAccount = testUsers[2];
      newServiceAccount = testUsers[8];
    });

    it("should grant admin role to TowersProxy contract", async function () {
      const adminRole = await ettContract.DEFAULT_ADMIN_ROLE();

      await ettContract.grantRole(adminRole, ettProxyContract.address);

      expect(await ettContract.hasRole(adminRole, ettProxyContract.address)).to.be.true;
    });

    it("should get chain id", async function () {
      const network = await ethers.provider.getNetwork();

      expect(await ettProxyContract.getChainId()).to.equal(network.chainId);
    });

    it("should restrict calling addRoleForStage to owner only", async function () {
      await expect(ettProxyContract.connect(testUsers[1]).addRoleForStage(1, whitelistedRole))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling resetOwnerOf to owner only", async function () {
      await expect(ettProxyContract.connect(testUsers[1]).resetOwnerOf(testUsers[10].address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling resetTokenCount to owner only", async function () {
      await expect(ettProxyContract.connect(testUsers[1]).resetTokenCount(0))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling disableContract to owner only", async function () {
      await expect(ettProxyContract.connect(testUsers[1]).disableContract())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling enableContract to owner only", async function () {
      await expect(ettProxyContract.connect(testUsers[1]).enableContract())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling changeServiceAddress to owner only", async function () {
      await expect(ettProxyContract.connect(testUsers[1]).changeServiceAddress(testUsers[10].address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling withdraw to owner only", async function () {
      await expect(ettProxyContract.connect(testUsers[1]).withdraw(ethers.utils.parseEther("0.1")))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should reset token count", async function () {
      expect(await ettProxyContract.resetTokenCount(0));
    });

    it("should add role for stage", async function () {
      await ettContract.changeRound(10, false);
      await ettContract.changeStage(0, ethers.utils.parseEther('1'));

      expect(await ettProxyContract.addRoleForStage(0, whitelistedRole));
    });

    it("should redeem token and transfer ETH to contract", async function () {
      const redeemer = testUsers[5];
      const tokenId = 0;
      const sendValue = ethers.utils.parseEther("1");
      const voucher = await createAndSignVoucher(tokenId, ettProxyContract, serviceAccount);

      let contractBalanceBefore = await ethers.provider.getBalance(ettProxyContract.address);

      await ettProxyContract.connect(redeemer).redeem(voucher, { value: sendValue });

      let contractBalanceAfter = await ethers.provider.getBalance(ettProxyContract.address);

      expect(await ettContract.ownerOf(tokenId)).to.be.equal(redeemer.address)
        && expect(contractBalanceAfter).to.be.equal(contractBalanceBefore.add(sendValue));
    });

    it("should get withdrawable ETH balance from contract", async function () {
      let contractBalance = await ethers.provider.getBalance(ettProxyContract.address);

      expect(await ettProxyContract.withdrawableBalance()).to.be.equal(contractBalance);
    });

    it("should revert withdraw ETH for insufficient funds amount", async function () {
      let contractBalance = await ethers.provider.getBalance(ettProxyContract.address);
      let withdrawAmount = contractBalance.add(ethers.utils.parseEther('0.1'));

      await expect(ettProxyContract.withdraw(withdrawAmount))
        .to.be.revertedWith("Insufficient funds to withdraw");
    });

    it("should withdraw ETH from contract", async function () {
      let withdrawAmount = await ethers.provider.getBalance(ettProxyContract.address);
      let ownerBalanceBefore = await ethers.provider.getBalance(testUsers[0].address);

      const tx = await ettProxyContract.withdraw(withdrawAmount);

      const receipt = await tx.wait();
      const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

      let ownerBalanceAfter = await ethers.provider.getBalance(testUsers[0].address);

      expect(await ettProxyContract.withdrawableBalance()).to.be.equal(ethers.utils.parseEther('0'))
        && expect(ownerBalanceAfter).to.be.equal(ownerBalanceBefore.add(withdrawAmount).sub(gasUsed));
    });

    it("should revert redeem of the same token twice", async function () {
      const redeemer = testUsers[6];
      const tokenId = 0;
      const voucher = await createAndSignVoucher(tokenId, ettProxyContract, serviceAccount);

      await expect(ettProxyContract.connect(redeemer).redeem(
        voucher,
        { value: ethers.utils.parseEther("1") }
      )).to.be.revertedWith("ERC721: token already minted");
    });

    it("should revert redeem if address already owns token", async function () {
      const redeemer = testUsers[5];
      const tokenId = 1000;
      const voucher = await createAndSignVoucher(tokenId, ettProxyContract, serviceAccount);

      await expect(ettProxyContract.connect(redeemer).redeem(
        voucher,
        { value: ethers.utils.parseEther("1") }
      )).to.be.revertedWith("User can have only one of the nft on the tower");
    });

    it("should revert redeem with voucher data changed after signing", async function () {
      const redeemer = testUsers[6];
      const tokenId = 1;

      const voucher = await createAndSignVoucher(tokenId, ettProxyContract, serviceAccount);
      voucher.tokenId = 2;

      await expect(ettProxyContract.connect(redeemer).redeem(
        voucher,
        { value: ethers.utils.parseEther("1") }
      )).to.be.revertedWith("Signature not valid");
    });

    it("should revert redeem with insufficient msg.value", async function () {
      const redeemer = testUsers[6];
      const tokenId = 1;

      const voucher = await createAndSignVoucher(tokenId, ettProxyContract, serviceAccount);

      const stagePrice = await ettContract.stagePrice();
      const sendValue = stagePrice.div(2);

      await expect(ettProxyContract.connect(redeemer).redeem(
        voucher,
        { value: sendValue }
      )).to.be.revertedWith("The price is incorrect");
    });

    it("should disable contract", async function () {
      expect(await ettProxyContract.disableContract());
    });

    it("should revert redeem if contract is disabled", async function () {
      const voucher = await createAndSignVoucher(10, ettProxyContract, serviceAccount);

      await expect(ettProxyContract.connect(testUsers[11]).redeem(
        voucher,
        { value: ethers.utils.parseEther("1") }
      )).to.be.revertedWith("Try agan later,for now contract is disabled by Administrator!");
    });

    it("should enable contract", async function () {
      expect(await ettProxyContract.enableContract());
    });

    it("should allow redeem if contract is enabled again", async function () {
      const voucher = await createAndSignVoucher(10, ettProxyContract, serviceAccount);

      expect(await ettProxyContract.connect(testUsers[11]).redeem(
        voucher,
        { value: ethers.utils.parseEther("1") }
      ));
    });

    it("should allow redeem after owner reset", async function () {
      const tokenOwner = testUsers[12];

      const voucher = await createAndSignVoucher(20, ettProxyContract, serviceAccount);

      await ettProxyContract.connect(tokenOwner).redeem(
        voucher,
        { value: ethers.utils.parseEther("1") }
      );

      await ettProxyContract.resetOwnerOf(tokenOwner.address);

      const secondVoucher = await createAndSignVoucher(21, ettProxyContract, serviceAccount);

      expect(await ettProxyContract.connect(tokenOwner).redeem(
        secondVoucher,
        { value: ethers.utils.parseEther("1") }
      ));
    });

    it("should change service address", async function () {
      await ettProxyContract.changeServiceAddress(newServiceAccount.address);
    });

    it("should revert redeem with voucher signed by old service account", async function () {
      const voucher = await createAndSignVoucher(50, ettProxyContract, serviceAccount);

      await expect(ettProxyContract.connect(testUsers[13]).redeem(
        voucher,
        { value: ethers.utils.parseEther("1") }
      )).to.be.revertedWith("Signature not valid");
    });

    it("should redeem with voucher signer by new service account", async function () {
      const voucher = await createAndSignVoucher(61, ettProxyContract, newServiceAccount);

      expect(await ettProxyContract.connect(testUsers[16]).redeem(
        voucher,
        { value: ethers.utils.parseEther("1") }
      ));
    });

    it("should revert redeem for not allowed role on private sale", async function () {
      const redeemer = testUsers[7];
      const tokenId = 1;

      await ettContract.changeRound(10, true);
      await ettContract.changeStage(1, ethers.utils.parseEther('1'));
      await ettContract.grantRole(testRole, redeemer.address);

      await ettProxyContract.addRoleForStage(1, whitelistedRole);

      const voucher = await createAndSignVoucher(tokenId, ettProxyContract, newServiceAccount);

      await expect(ettProxyContract.connect(redeemer).redeem(
        voucher,
        { value: ethers.utils.parseEther('1') }
      )).to.be.revertedWith("You do not have role for the current stage");
    });

    it("should revert redeem for incorrect stage", async function () {
      const redeemer = testUsers[7];
      const tokenId = 77;

      await ettContract.changeRound(10, false);
      await ettContract.changeStage(2, ethers.utils.parseEther('1'));
      await ettContract.grantRole(whitelistedRole, redeemer.address);

      const voucher = await createAndSignVoucher(tokenId, ettProxyContract, newServiceAccount);

      await expect(ettProxyContract.connect(redeemer).redeem(
        voucher,
        { value: ethers.utils.parseEther('1') }
      )).to.be.revertedWith("Incorrect stage on proxy contract");
    });

    it("should revert redeem to not exceed MAX_ITEMS_IN_TOWER", async function () {
      await ettContract.changeStage(1, ethers.utils.parseEther('1'));

      let maxItemsInTower = await ettProxyContract.MAX_ITEMS_IN_TOWER();

      await ettProxyContract.resetTokenCount(maxItemsInTower);

      const voucher = await createAndSignVoucher(120, ettProxyContract, newServiceAccount);

      await expect(ettProxyContract.connect(testUsers[13]).redeem(
        voucher,
        { value: ethers.utils.parseEther('1') }
      )).to.be.revertedWith("Max tokens on this tower has alredy minted");
    });
  });
});
