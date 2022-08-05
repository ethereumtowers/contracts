const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  EIP712Signer,
  StakeVoucherType,
  UnstakeVoucherType,
  ClaimVoucherType,
  ClaimAllVoucherType
} = require('../utils/EIP712Signer')

const stakingContractName = "EthereumWorldsNFTStaking";
const erc721ContractName = "TestERC721";
const erc20ContractName = "TestERC20";

const SIGNING_DOMAIN = "EW_STAKING";
const SIGNATURE_VERSION = "1";


async function check_stake_events(tx, testUsers, tokenIds, N) {
  const receipt = await tx.wait();
  let index_valid_event = 0;

  const latestBlock = await ethers.provider.getBlock("latest");

  for (const event of receipt.events) {
    if (event.event) {
      expect(event.event).equal("TokenStaked");
      expect(event.args[0]).equal(testUsers[0].address);
      expect(event.args[1]).equal(tokenIds[index_valid_event]);
      expect(event.args[2]).equal(latestBlock.timestamp);
      index_valid_event++;
    }
  }

  expect(index_valid_event).equal(N);
}

async function check_unstake_events(tx, testUsers, tokenIds, N) {
  const receipt = await tx.wait();
  let index_valid_event = 0;

  const latestBlock = await ethers.provider.getBlock("latest");

  for (const event of receipt.events) {
    if (event.event) {
      expect(event.event).equal("TokenUnstaked");
      expect(event.args[0]).equal(testUsers[0].address);
      expect(event.args[1]).equal(tokenIds[index_valid_event]);
      expect(event.args[2]).equal(latestBlock.timestamp);
      index_valid_event++;
    }
  }

  expect(index_valid_event).equal(N);
}

describe(`${stakingContractName} contract`, function () {
  it("should revert deploy with zero ERC20 contract address", async function () {
    const testUsers = await ethers.getSigners();
    const serviceAddress = testUsers[2].address;

    const erc721ContractFactory = await ethers.getContractFactory(erc721ContractName);
    const erc721 = await erc721ContractFactory.deploy();
    await erc721.deployed();

    const stakingContractFactory = await ethers.getContractFactory(stakingContractName);

    await expect(stakingContractFactory.deploy(
      ethers.constants.AddressZero,
      erc721.address,
      serviceAddress,
    )).to.be.revertedWith("EWStaking: zero address");
  });

  it(`should revert deploy with zero ERC721 contract address`, async function () {
    const testUsers = await ethers.getSigners();
    const serviceAddress = testUsers[2].address;

    const erc20ContractFactory = await ethers.getContractFactory(erc20ContractName);
    const erc20 = await erc20ContractFactory.deploy();
    await erc20.deployed();

    const stakingContractFactory = await ethers.getContractFactory(stakingContractName);

    await expect(stakingContractFactory.deploy(
      erc20.address,
      ethers.constants.AddressZero,
      serviceAddress,
    )).to.be.revertedWith("EWStaking: zero address");
  });

  it(`should revert deploy with zero service signer address`, async function () {
    const erc20ContractFactory = await ethers.getContractFactory(erc20ContractName);
    const erc20 = await erc20ContractFactory.deploy();
    await erc20.deployed();

    const erc721ContractFactory = await ethers.getContractFactory(erc721ContractName);
    const erc721 = await erc721ContractFactory.deploy();
    await erc721.deployed();

    const stakingContractFactory = await ethers.getContractFactory(stakingContractName);

    await expect(stakingContractFactory.deploy(
      erc20.address,
      erc721.address,
      ethers.constants.AddressZero,
    )).to.be.revertedWith("EWStaking: zero address");
  });

  it(`should deploy the new ${stakingContractName} smart contract`, async function () {
    const testUsers = await ethers.getSigners();
    const serviceAddress = testUsers[1].address;

    const erc20ContractFactory = await ethers.getContractFactory(erc20ContractName);
    const erc20 = await erc20ContractFactory.deploy();
    await erc20.deployed();

    const erc721ContractFactory = await ethers.getContractFactory(erc721ContractName);
    const erc721 = await erc721ContractFactory.deploy();
    await erc721.deployed();

    const stakingContractFactory = await ethers.getContractFactory(stakingContractName);
    const staking = await stakingContractFactory.deploy(
      erc20.address,
      erc721.address,
      serviceAddress,
    );

    expect(await staking.deployed());
  });

  describe("Contract functions", function () {
    let testUsers;
    let erc20;
    let erc721;
    let staking;

    let serviceSigner;

    let tokenIds = [1, 11, 21];
    let notApprovedTokenIds = [997, 998, 999];

    let eip712Signer;

    let nonce = 0;

    before(async () => {
      testUsers = await ethers.getSigners();
      serviceSigner = testUsers[1];

      const erc20ContractFactory = await ethers.getContractFactory(erc20ContractName);
      erc20 = await erc20ContractFactory.deploy();
      await erc20.deployed();

      const erc721ContractFactory = await ethers.getContractFactory(erc721ContractName);
      erc721 = await erc721ContractFactory.deploy();
      await erc721.deployed();

      const stakingContractFactory = await ethers.getContractFactory(stakingContractName);
      staking = await stakingContractFactory.deploy(
        erc20.address,
        erc721.address,
        serviceSigner.address,
      );

      await staking.deployed();

      eip712Signer = new EIP712Signer({
        signing_domain: SIGNING_DOMAIN,
        signature_version: SIGNATURE_VERSION,
        contract: staking
      });

      // prepare stake for tokens
      for (let i = 0; i < tokenIds.length; i++) {
        await erc721.mint(testUsers[0].address, tokenIds[i]);
        await erc721.mint(testUsers[15].address, notApprovedTokenIds[i]);
        await erc721.approve(staking.address, tokenIds[i]);
      }
      // transfer 1000000 ether = 1e24
      erc20.transfer(staking.address, ethers.utils.parseEther("1000000"));
    });

    it("should get chain id", async function () {
      const network = await ethers.provider.getNetwork();
      const chainId = await staking.getChainId();

      expect(chainId.toNumber()).to.equal(network.chainId);
    });

    it("should restrict calling pause to contract owner", async function () {
      await expect(staking.connect(testUsers[1]).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling unpause to contract owner", async function () {
      await expect(staking.connect(testUsers[1]).unpause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling updateServiceSigner to contract owner", async function () {
      await expect(staking.connect(testUsers[1]).updateServiceSigner(ethers.constants.AddressZero))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling updateMaxTokensInStake to contract owner", async function () {
      await expect(staking.connect(testUsers[1]).updateMaxTokensInStake(10))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling toggleShutdown to owner only", async function () {
      await expect(staking.connect(testUsers[1]).toggleShutdown(true))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict calling rescueERC20 to owner only", async function () {
      await expect(staking.connect(testUsers[1]).rescueERC20(
        ethers.constants.AddressZero,
        100,
        testUsers[1].address
      ))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert direct token transfer to contract", async function () {
      const tokenOwner = testUsers[10];
      const tokenId = 1993;

      await erc721.connect(tokenOwner).mint(tokenOwner.address, tokenId);

      await expect(erc721.connect(tokenOwner)["safeTransferFrom(address,address,uint256)"](
        tokenOwner.address,
        staking.address,
        tokenId,
      ))
        .to.be.revertedWith("ERC721: transfer to non ERC721Receiver implementer");
    });

    it("should revert update service signer with zero address", async function () {
      await expect(staking.updateServiceSigner(ethers.constants.AddressZero))
        .to.be.revertedWith("EWStaking: zero address");
    });

    it("should update service signer by contract owner", async function () {
      await expect(staking.updateServiceSigner(testUsers[5].address))
        .to.emit(staking, 'ServiceSignerUpdated').withArgs(testUsers[5].address);

      await expect(staking.updateServiceSigner(serviceSigner.address))
        .to.emit(staking, 'ServiceSignerUpdated').withArgs(serviceSigner.address);
    });

    it("should update max tokens in stake and emit event", async function () {
      const previousValue = await staking.maxTokensInStake();
      const newValue = 1;

      await expect(staking.updateMaxTokensInStake(newValue))
        .to.emit(staking, 'MaxTokensInStakeUpdated').withArgs(newValue);

      expect(await staking.maxTokensInStake()).to.equal(newValue);

      await expect(staking.updateMaxTokensInStake(previousValue))
        .to.emit(staking, 'MaxTokensInStakeUpdated').withArgs(previousValue);
    });

    it("should pause contract", async function () {
      await staking.pause();
      expect(await staking.paused()).to.be.true;
    });

    it("should unpause contract", async function () {
      await staking.unpause();
      expect(await staking.paused()).to.be.false;
    });

    it("should toggleShutdown to true", async function () {
      await expect(staking.toggleShutdown(true))
        .to.emit(staking, 'ToggleStakingShutdown').withArgs(true);

      expect(await staking.shutdown()).to.be.true;
    });

    it("should toggleShutdown to false", async function () {
      await expect(staking.toggleShutdown(false))
        .to.emit(staking, 'ToggleStakingShutdown').withArgs(false);

      expect(await staking.shutdown()).to.be.false;
    });

    it("should restrict calling rescueERC20 with token address = address(0)", async function () {
      await expect(staking.rescueERC20(ethers.constants.AddressZero, 100, testUsers[1].address))
        .to.be.revertedWith("EWStaking: zero token address");
    });

    it("should restrict calling rescueERC20 with zero amount", async function () {
      await expect(staking.rescueERC20(erc20.address, 0, testUsers[1].address))
        .to.be.revertedWith("EWStaking: zero amount");
    });

    it("should restrict calling rescueERC20 with destination address = address(0)", async function () {
      await expect(staking.rescueERC20(erc20.address, 100, ethers.constants.AddressZero))
        .to.be.revertedWith("EWStaking: transfer to zero address");
    });

    it("should restrict calling rescueERC20 with destination address = address(this)", async function () {
      await expect(staking.rescueERC20(erc20.address, 100, staking.address))
        .to.be.revertedWith("EWStaking: transfer to contract");
    });

    it("should rescue ERC20 tokens stucked on contract wallet", async function () {
      const stuckAmount = ethers.utils.parseEther('10');
      const destination = testUsers[5].address;

      const contractBalanceBefore = await erc20.balanceOf(staking.address);

      await erc20.mint(staking.address, stuckAmount);

      expect(await erc20.balanceOf(staking.address)).to.be.equal(contractBalanceBefore.add(stuckAmount));
      expect(await staking.rescueERC20(erc20.address, stuckAmount, destination));
      expect(await erc20.balanceOf(staking.address)).to.be.equal(contractBalanceBefore);
      expect(await erc20.balanceOf(destination)).to.be.equal(stuckAmount);
    });

    it("should restrict calling stake if contract is paused", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await staking.pause();
      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("Pausable: paused");
      await staking.unpause();
    });

    it("should restrict calling stake when contract is shut down", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: [1],
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await staking.toggleShutdown(true);

      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: shut down");

      await staking.toggleShutdown(false);
    });

    it("should restrict calling stake for empty tokens array", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: [],
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: nothing to stake");
    });

    it("should restrict calling stake when limit is reached", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await staking.updateMaxTokensInStake(2);
      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: tokens in stake limit reached");
      await staking.updateMaxTokensInStake(100);
    });

    it("should restrict calling stake with invalid voucher signature", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        testUsers[10]
      );

      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: invalid signature");
    });

    it("should restrict calling stake with used voucher", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await staking.stake(signedStakeVoucher);

      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: this voucher already used");

      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await staking.unstake(signedUnstakeVoucher, staker.address);
    });

    it("should restrict calling stake with wrong voucher owner", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await expect(staking.connect(serviceSigner).stake(signedStakeVoucher))
        .to.be.revertedWith("EWStaking: not your voucher");
    });

    it("should restrict calling stake not for token owner", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: notApprovedTokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      await erc721.setApprovalForAll(staking.address, true);

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await expect(staking.connect(staker).stake(signedStakeVoucher))
        .to.be.revertedWith("EWStaking: you are not an owner");

      await erc721.setApprovalForAll(staking.address, false);
    });

    it("should restrict calling stake for not approved tokens", async function () {
      const staker = testUsers[15];

      const stakeVoucherData = {
        tokenIds: notApprovedTokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await erc721.setApprovalForAll(staking.address, false);

      await expect(staking.connect(staker).stake(signedStakeVoucher))
        .to.be.revertedWith("EWStaking: not approved to transfer tokens");
    });

    it("should restrict calling stake for non-existing token", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: [12345],
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await erc721.setApprovalForAll(staking.address, true);

      await expect(staking.stake(signedStakeVoucher))
        .to.be.revertedWith("ERC721: invalid token ID");

      await erc721.setApprovalForAll(staking.address, false);
    });

    it("should stake 3 tokens", async function () {
      const staker = testUsers[0];
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await erc721.connect(staker).setApprovalForAll(staking.address, true);

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events
      await check_stake_events(tx, testUsers, tokenIds, tokenIds.length);

      const latestBlock = await ethers.provider.getBlock("latest")

      // check stack info owner and the number of tokens is 3
      for (let i = 0; i < tokenIds.length; ++i) {
        const stakeInfo = await staking.getStakeInfo(tokenIds[i]);

        expect(stakeInfo.owner).to.equal(staker.address);
        expect(stakeInfo.stakeTimestamp).to.equal(latestBlock.timestamp);
        expect(stakeInfo.rewardClaimTimestamp).to.equal(0);
      }
      expect((await staking.getTokensByOwner(staker.address)).length).to.equal(tokenIds.length);
    });

    it("should restrict calling claim for invalid voucher signer", async function () {
      const rewardOwner = testUsers[0];

      const claimVoucherData = {
        tokenId: 1,
        amount: 10000,
        nonce: nonce++,
        owner: rewardOwner.address
      };

      const signedClaimVoucher = await eip712Signer.signVoucher(
        claimVoucherData,
        ClaimVoucherType,
        testUsers[10]
      );

      await expect(staking.connect(rewardOwner).claim(signedClaimVoucher))
        .to.be.revertedWith("EWStaking: invalid signature");
    });

    it("should restrict calling claim for wrong owner", async function () {
      const rewardOwner = testUsers[5];

      const claimVoucherData = {
        tokenId: 1,
        amount: 10000,
        nonce: nonce++,
        owner: rewardOwner.address
      };

      const signedClaimVoucher = await eip712Signer.signVoucher(
        claimVoucherData,
        ClaimVoucherType,
        serviceSigner
      );

      await expect(staking.connect(testUsers[1]).claim(signedClaimVoucher))
        .to.be.revertedWith("EWStaking: not your voucher");
    });

    it("should restrict claiming same reward twice", async function () {
      const rewardOwner = testUsers[0];

      const claimVoucherData = {
        tokenId: 1,
        amount: 10000,
        nonce: nonce++,
        owner: rewardOwner.address
      };

      const signedClaimVoucher = await eip712Signer.signVoucher(
        claimVoucherData,
        ClaimVoucherType,
        serviceSigner
      );

      await staking.connect(rewardOwner).claim(signedClaimVoucher);

      await expect(staking.connect(rewardOwner).claim(signedClaimVoucher))
        .to.be.revertedWith("EWStaking: this voucher already used");
    });

    it("should restrict calling claim for zero amount", async function () {
      const rewardOwner = testUsers[5];

      const claimVoucherData = {
        tokenId: 11,
        amount: 0,
        nonce: nonce++,
        owner: rewardOwner.address
      };

      const signedClaimVoucher = await eip712Signer.signVoucher(
        claimVoucherData,
        ClaimVoucherType,
        serviceSigner
      );

      await expect(staking.connect(rewardOwner).claim(signedClaimVoucher))
        .to.be.revertedWith("EWStaking: nothing to claim");
    });

    it("should restrict calling claim for the huge amount", async function () {
      const rewardOwner = testUsers[0];

      const claimVoucherData = {
        tokenId: 11,
        amount: ethers.utils.parseEther("1000000000000"),
        nonce: nonce++,
        owner: rewardOwner.address
      };

      const signedClaimVoucher = await eip712Signer.signVoucher(
        claimVoucherData,
        ClaimVoucherType,
        serviceSigner
      );

      await expect(staking.connect(rewardOwner).claim(signedClaimVoucher))
        .to.be.revertedWith("EWStaking: not enough funds to claim");
    });

    it("should restrict calling claim for wrong token id", async function () {
      const rewardOwner = testUsers[0];

      const claimVoucherData = {
        tokenId: 1113,
        amount: ethers.utils.parseEther("1"),
        nonce: nonce++,
        owner: rewardOwner.address
      };

      const signedClaimVoucher = await eip712Signer.signVoucher(
        claimVoucherData,
        ClaimVoucherType,
        serviceSigner
      );

      await expect(staking.connect(rewardOwner).claim(signedClaimVoucher))
        .to.be.revertedWith("EWStaking: wrong stake owner");
    });

    it("should claim rewards", async function () {
      const rewardOwner = testUsers[0];

      const claimVoucherData = {
        tokenId: 1,
        amount: ethers.utils.parseEther("1"),
        nonce: nonce++,
        owner: rewardOwner.address
      };

      const signedClaimVoucher = await eip712Signer.signVoucher(
        claimVoucherData,
        ClaimVoucherType,
        serviceSigner
      );

      await expect(staking.connect(rewardOwner).claim(signedClaimVoucher))
        .to.emit(staking, "RewardClaimed").withArgs(
          rewardOwner.address,
          claimVoucherData.tokenId,
          signedClaimVoucher.signature,
          claimVoucherData.amount
        );
    });

    it("should emit event after claim", async function () {
      const rewardOwner = testUsers[0];

      const claimVoucherData = {
        tokenId: 21,
        amount: ethers.utils.parseEther("1"),
        nonce: nonce++,
        owner: rewardOwner.address
      };

      const claimInfoBefore = await staking.getClaimsInfo(rewardOwner.address);

      const signedClaimVoucher = await eip712Signer.signVoucher(
        claimVoucherData,
        ClaimVoucherType,
        serviceSigner
      );

      await expect(staking.connect(rewardOwner).claim(signedClaimVoucher))
        .to.emit(staking, "RewardClaimed").withArgs(
          rewardOwner.address,
          claimVoucherData.tokenId,
          signedClaimVoucher.signature,
          claimVoucherData.amount
        );

      const block = await ethers.provider.getBlock("latest");

      const claimInfoAfter = await staking.getClaimsInfo(rewardOwner.address);

      expect(claimInfoAfter.totalClaimed).to.equal(claimInfoBefore.totalClaimed.add(claimVoucherData.amount));
      expect(claimInfoAfter.lastClaimTimestamp).to.equal(block.timestamp);
    });

    it("should restrict calling unstake for wrong voucher owner", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await expect(staking.connect(testUsers[1]).unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: not your voucher");
    });

    it("should restrict calling unstake for wrong token id", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [12345],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: wrong stake owner");
    });

    it("should restrict calling unstake for empty token ids", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: nothing to unstake");
    });

    it("should restrict calling unstake for invalid destination", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await expect(staking.unstake(signedUnstakeVoucher, ethers.constants.AddressZero))
        .to.be.revertedWith("EWStaking: transfer to zero address");
      await expect(staking.unstake(signedUnstakeVoucher, staking.address))
        .to.be.revertedWith("EWStaking: transfer to contract");
    });

    it("should restrict calling unstake for invalid signature", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        testUsers[10]
      );

      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: invalid signature");
    });

    it("should unstake tokens", async function () {
      // check stack info owner and the number of tokens is 3
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length);

      const staker = testUsers[0];
      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events
      await check_unstake_events(tx, testUsers, tokenIds, tokenIds.length);

      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(0);

      // check unstake with already used voucher
      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: this voucher already used");
    });

    it("should unstake tokens and claim reward", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      }

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: ethers.utils.parseEther('1'),
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await staking.stake(signedStakeVoucher);

      const stakerBalanceBefore = await erc20.balanceOf(staker.address);

      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.emit(staking, 'RewardClaimedAll').withArgs(
          staker.address,
          signedUnstakeVoucher.signature,
          unstakeVoucherData.claimAmount
        );

      const stakerBalanceAfter = await erc20.balanceOf(staker.address);

      expect(stakerBalanceAfter).to.equal(stakerBalanceBefore.add(unstakeVoucherData.claimAmount));
    });

    it("should restrict calling emergencyUnstake when contract is not shut down", async function () {
      await expect(staking.emergencyUnstake()).to.be.revertedWith("EWStaking: contract should be shut down");
    });

    it("should revert calling emergencyUnstake if caller not staked tokens", async function () {
      const staker = testUsers[10];

      await staking.toggleShutdown(true);

      await expect(staking.connect(staker).emergencyUnstake())
        .to.be.revertedWith("EWStaking: nothing to unstake");

      await staking.toggleShutdown(false);
    });

    it("should unstake tokens using emergencyUnstake", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: tokenIds,
        rentable: true,
        minRentPeriod: 1,
        rentableUntil: 2,
        rentalDailyPrice: 3,
        deposit: 4,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await erc721.connect(staker).setApprovalForAll(staking.address, true);

      await staking.connect(staker).stake(signedStakeVoucher);
      await staking.toggleShutdown(true);

      await staking.connect(staker).emergencyUnstake();

      expect((await staking.getTokensByOwner(staker.address)).length).to.be.equal(0);

      await staking.toggleShutdown(false);
    });

    it("should unstake 20 tokens per transaction using emergencyUnstake", async function () {
      const staker = testUsers[5];

      const mintTokensAmount = 30;
      const maxTokensPerUnstake = 20;
      const stakeTokenIds = new Array();

      for (let i = 0; i < mintTokensAmount; ++i) {
        await erc721.connect(staker).mint(staker.address, 500 + i);
        stakeTokenIds.push(500 + i);
      }

      await erc721.connect(staker).setApprovalForAll(staking.address, true);

      const stakeVoucherData = {
        tokenIds: stakeTokenIds,
        rentable: false,
        minRentPeriod: 1,
        rentableUntil: 2,
        rentalDailyPrice: 3,
        deposit: 4,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await staking.connect(staker).stake(signedStakeVoucher);

      const tokensInStakeBeforeEmergencyUnstake = await staking.tokensInStake();

      await staking.toggleShutdown(true);
      await staking.connect(staker).emergencyUnstake();

      expect((await staking.getTokensByOwner(staker.address)).length).to.be.equal(mintTokensAmount - maxTokensPerUnstake);
      expect(await staking.tokensInStake()).to.equal(tokensInStakeBeforeEmergencyUnstake - maxTokensPerUnstake);

      await staking.toggleShutdown(false);
    });
  });

  describe("Different unstakes for single token id", function () {
    let testUsers;
    let erc20;
    let erc721;
    let staking;

    let serviceSigner;

    let tokenIds = [123];

    let eip712Signer;

    let nonce = 0;

    beforeEach(async () => {
      testUsers = await ethers.getSigners();
      serviceSigner = testUsers[1];

      const erc20ContractFactory = await ethers.getContractFactory(erc20ContractName);
      erc20 = await erc20ContractFactory.deploy();
      await erc20.deployed();

      const erc721ContractFactory = await ethers.getContractFactory(erc721ContractName);
      erc721 = await erc721ContractFactory.deploy();
      await erc721.deployed();

      const stakingContractFactory = await ethers.getContractFactory(stakingContractName);
      staking = await stakingContractFactory.deploy(
        erc20.address,
        erc721.address,
        serviceSigner.address,
      );

      await staking.deployed();

      eip712Signer = new EIP712Signer({
        signing_domain: SIGNING_DOMAIN,
        signature_version: SIGNATURE_VERSION,
        contract: staking
      });

      // prepare stake for tokens
      for (let i = 0; i < tokenIds.length; i++) {
        await erc721.mint(testUsers[0].address, tokenIds[i]);
        await erc721.approve(staking.address, tokenIds[i]);
      }
      // transfer 1000000 ether = 1e24
      erc20.transfer(staking.address, ethers.utils.parseEther("1000000"));

      const staker = testUsers[0];
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await erc721.connect(staker).setApprovalForAll(staking.address, true);
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events for stake
      await check_stake_events(tx, testUsers, tokenIds, tokenIds.length);
      // check stack info owner and the number of tokens
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length);
    });

    it("unstake all (1) token", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events
      await check_unstake_events(tx, testUsers, tokenIds, tokenIds.length);

      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(0);
    });

    it("unstake all (1) and the wrong token ids", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [tokenIds[0], 12345],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: wrong stake owner");

      // check staking - has the same, single tokenId
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
        expect((await staking.getTokensByOwner(testUsers[0].address))[i]).to.equal(ethers.BigNumber.from(tokenIds[i]));
      }
    });
  });

  describe("Different unstakes for 2 token ids", function () {
    let testUsers;
    let erc20;
    let erc721;
    let staking;

    let serviceSigner;

    let tokenIds = [111, 222];

    let eip712Signer;

    let nonce = 0;

    beforeEach(async () => {
      testUsers = await ethers.getSigners();
      serviceSigner = testUsers[1];

      const erc20ContractFactory = await ethers.getContractFactory(erc20ContractName);
      erc20 = await erc20ContractFactory.deploy();
      await erc20.deployed();

      const erc721ContractFactory = await ethers.getContractFactory(erc721ContractName);
      erc721 = await erc721ContractFactory.deploy();
      await erc721.deployed();

      const stakingContractFactory = await ethers.getContractFactory(stakingContractName);
      staking = await stakingContractFactory.deploy(
        erc20.address,
        erc721.address,
        serviceSigner.address,
      );

      await staking.deployed();

      eip712Signer = new EIP712Signer({
        signing_domain: SIGNING_DOMAIN,
        signature_version: SIGNATURE_VERSION,
        contract: staking
      });

      // prepare stake for tokens
      for (let i = 0; i < tokenIds.length; i++) {
        await erc721.mint(testUsers[0].address, tokenIds[i]);
        await erc721.approve(staking.address, tokenIds[i]);
      }
      // transfer 1000000 ether = 1e24
      erc20.transfer(staking.address, ethers.utils.parseEther("1000000"));

      const staker = testUsers[0];
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await erc721.connect(staker).setApprovalForAll(staking.address, true);
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events for stake
      await check_stake_events(tx, testUsers, tokenIds, tokenIds.length);
      // check stack info owner and the number of tokens
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length);
    });

    it("unstake all (2) token", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events
      await check_unstake_events(tx, testUsers, tokenIds, tokenIds.length);

      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }
      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(0);
    });

    it("unstake all (2) tokens in the reverse order", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: tokenIds.slice().reverse(),
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events
      await check_unstake_events(tx, testUsers, tokenIds.slice().reverse(), tokenIds.length);

      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }
      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(0);
    });

    it("unstake only the first one", async function () {
      const staker = testUsers[0];
      const unstakeVoucherData = {
        tokenIds: [tokenIds[0]],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events
      await check_unstake_events(tx, testUsers, [tokenIds[0]], 1);

      // check staking - has single tokenId
      expect((await staking.getStakeInfo(tokenIds[0])).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getStakeInfo(tokenIds[1])).owner).to.equal(testUsers[0].address);
      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length - 1);
      expect((await staking.getTokensByOwner(testUsers[0].address))[0]).to.equal(ethers.BigNumber.from(tokenIds[1]));
    });

    it("unstake only the last one", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [tokenIds[tokenIds.length - 1]],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events for unstake
      await check_unstake_events(tx, testUsers, [tokenIds[tokenIds.length - 1]], 1);

      // check staking - has single tokenIds
      expect((await staking.getStakeInfo(tokenIds[0])).owner).to.equal(testUsers[0].address);
      expect((await staking.getStakeInfo(tokenIds[1])).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length - 1);
      expect((await staking.getTokensByOwner(testUsers[0].address))[0]).to.equal(ethers.BigNumber.from(tokenIds[0]));
    });

    it("unstake the first and the wrong token ids", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [tokenIds[0], 12345],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: wrong stake owner");

      // check staking - has the same (3) tokenIds
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
        expect((await staking.getTokensByOwner(testUsers[0].address))[i]).to.equal(ethers.BigNumber.from(tokenIds[i]));
      }
    });
  });

  describe("Different unstakes for 3 token ids", function () {
    let testUsers;
    let erc20;
    let erc721;
    let staking;

    let serviceSigner;

    let tokenIds = [111, 222, 333];

    let eip712Signer;

    let nonce = 0;

    beforeEach(async () => {
      testUsers = await ethers.getSigners();
      serviceSigner = testUsers[1];

      const erc20ContractFactory = await ethers.getContractFactory(erc20ContractName);
      erc20 = await erc20ContractFactory.deploy();
      await erc20.deployed();

      const erc721ContractFactory = await ethers.getContractFactory(erc721ContractName);
      erc721 = await erc721ContractFactory.deploy();
      await erc721.deployed();

      const stakingContractFactory = await ethers.getContractFactory(stakingContractName);
      staking = await stakingContractFactory.deploy(
        erc20.address,
        erc721.address,
        serviceSigner.address,
      );

      await staking.deployed();

      eip712Signer = new EIP712Signer({
        signing_domain: SIGNING_DOMAIN,
        signature_version: SIGNATURE_VERSION,
        contract: staking
      });

      // prepare stake for tokens
      for (let i = 0; i < tokenIds.length; i++) {
        await erc721.mint(testUsers[0].address, tokenIds[i]);
        await erc721.approve(staking.address, tokenIds[i]);
      }
      // transfer 1000000 ether = 1e24
      erc20.transfer(staking.address, ethers.utils.parseEther("1000000"));

      const staker = testUsers[0];
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await erc721.connect(staker).setApprovalForAll(staking.address, true);
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events for stake
      await check_stake_events(tx, testUsers, tokenIds, tokenIds.length);
      // check stack info owner and the number of tokens
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length);
    });

    it("unstake all (3) token", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: tokenIds,
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events
      await check_unstake_events(tx, testUsers, tokenIds, tokenIds.length);

      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(0);
    });

    it("unstake all (3) tokens in the reverse order", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: tokenIds.slice().reverse(),
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events
      await check_unstake_events(tx, testUsers, tokenIds.slice().reverse(), tokenIds.length);

      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(0);
    });

    it("unstake only the first one", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [tokenIds[0]],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events
      await check_unstake_events(tx, testUsers, [tokenIds[0]], 1);

      // check staking - has 2 tokenIds
      expect((await staking.getStakeInfo(tokenIds[0])).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getStakeInfo(tokenIds[1])).owner).to.equal(testUsers[0].address);
      expect((await staking.getStakeInfo(tokenIds[2])).owner).to.equal(testUsers[0].address);
      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length - 1);
      // take into account the order is different
      expect((await staking.getTokensByOwner(testUsers[0].address))[0]).to.equal(ethers.BigNumber.from(tokenIds[2]));
      expect((await staking.getTokensByOwner(testUsers[0].address))[1]).to.equal(ethers.BigNumber.from(tokenIds[1]));
    });

    it("unstake only the last one", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [tokenIds[tokenIds.length - 1]],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events for unstake
      await check_unstake_events(tx, testUsers, [tokenIds[tokenIds.length - 1]], 1);

      // check staking - has 2 tokenIds
      expect((await staking.getStakeInfo(tokenIds[0])).owner).to.equal(testUsers[0].address);
      expect((await staking.getStakeInfo(tokenIds[1])).owner).to.equal(testUsers[0].address);
      expect((await staking.getStakeInfo(tokenIds[2])).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length - 1);
      expect((await staking.getTokensByOwner(testUsers[0].address))[0]).to.equal(ethers.BigNumber.from(tokenIds[0]));
      expect((await staking.getTokensByOwner(testUsers[0].address))[1]).to.equal(ethers.BigNumber.from(tokenIds[1]));
    });

    it("unstake only the middle one", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [tokenIds[1]],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      const tx = await staking.unstake(signedUnstakeVoucher, staker.address);

      // check all events for unstake
      await check_unstake_events(tx, testUsers, [tokenIds[1]], 1);

      // check staking - has 2 tokenIds
      expect((await staking.getStakeInfo(tokenIds[0])).owner).to.equal(testUsers[0].address);
      expect((await staking.getStakeInfo(tokenIds[1])).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getStakeInfo(tokenIds[2])).owner).to.equal(testUsers[0].address);
      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length - 1);
      expect((await staking.getTokensByOwner(testUsers[0].address))[0]).to.equal(ethers.BigNumber.from(tokenIds[0]));
      expect((await staking.getTokensByOwner(testUsers[0].address))[1]).to.equal(ethers.BigNumber.from(tokenIds[2]));
    });

    it("unstake the first and the wrong token ids", async function () {
      const staker = testUsers[0];

      const unstakeVoucherData = {
        tokenIds: [tokenIds[0], 12345],
        claimAmount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );

      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: wrong stake owner");

      // check staking - has the same (3) tokenIds
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
        expect((await staking.getTokensByOwner(testUsers[0].address))[i]).to.equal(ethers.BigNumber.from(tokenIds[i]));
      }
    });
  });

  describe("Claim all rewards", function () {
    let testUsers;
    let erc20;
    let erc721;
    let staking;

    let serviceSigner;

    let tokenIds = [111, 222, 333];

    let eip712Signer;

    let nonce = 0;

    beforeEach(async () => {
      testUsers = await ethers.getSigners();
      serviceSigner = testUsers[1];

      const erc20ContractFactory = await ethers.getContractFactory(erc20ContractName);
      erc20 = await erc20ContractFactory.deploy();
      await erc20.deployed();

      const erc721ContractFactory = await ethers.getContractFactory(erc721ContractName);
      erc721 = await erc721ContractFactory.deploy();
      await erc721.deployed();

      const stakingContractFactory = await ethers.getContractFactory(stakingContractName);
      staking = await stakingContractFactory.deploy(
        erc20.address,
        erc721.address,
        serviceSigner.address,
      );

      await staking.deployed();

      eip712Signer = new EIP712Signer({
        signing_domain: SIGNING_DOMAIN,
        signature_version: SIGNATURE_VERSION,
        contract: staking
      });

      // prepare stake for tokens
      for (let i = 0; i < tokenIds.length; i++) {
        await erc721.mint(testUsers[0].address, tokenIds[i]);
        await erc721.approve(staking.address, tokenIds[i]);
      }
      // transfer 1000000 ether = 1e24
      erc20.transfer(staking.address, ethers.utils.parseEther("1000000"));

      const staker = testUsers[0];
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      const stakeVoucherData = {
        tokenIds: tokenIds,
        nonce: nonce++,
        owner: staker.address
      };

      const signedStakeVoucher = await eip712Signer.signVoucher(
        stakeVoucherData,
        StakeVoucherType,
        serviceSigner
      );

      await erc721.connect(staker).setApprovalForAll(staking.address, true);
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events for stake
      await check_stake_events(tx, testUsers, tokenIds, tokenIds.length);
      // check stack info owner and the number of tokens
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
      }

      expect((await staking.getStakeInfo(0)).owner).to.equal(ethers.constants.AddressZero);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length);
    });

    it("should revert claim all for zero amount", async function () {
      const staker = testUsers[0];

      const claimAllData = {
        amount: 0,
        nonce: nonce++,
        owner: staker.address
      };

      const signedClaimAllVoucher = await eip712Signer.signVoucher(
        claimAllData,
        ClaimAllVoucherType,
        serviceSigner
      );

      await expect(staking.claimAll(signedClaimAllVoucher))
        .to.be.revertedWith("EWStaking: nothing to claim");
    });

    it("should revert claim all with wrong voucher signature", async function () {
      const staker = testUsers[0];

      const claimAllData = {
        amount: ethers.utils.parseEther('100'),
        nonce: nonce++,
        owner: staker.address
      };

      const signedClaimAllVoucher = await eip712Signer.signVoucher(
        claimAllData,
        ClaimAllVoucherType,
        testUsers[11]
      );

      await expect(staking.claimAll(signedClaimAllVoucher))
        .to.be.revertedWith("EWStaking: invalid signature");
    });

    it("should revert claim all with already used voucher", async function () {
      const staker = testUsers[0];

      const claimAllData = {
        amount: ethers.utils.parseEther('100'),
        nonce: nonce++,
        owner: staker.address
      };

      const signedClaimAllVoucher = await eip712Signer.signVoucher(
        claimAllData,
        ClaimAllVoucherType,
        serviceSigner
      );

      await staking.claimAll(signedClaimAllVoucher);

      await expect(staking.claimAll(signedClaimAllVoucher))
        .to.be.revertedWith("EWStaking: this voucher already used");
    });

    it("should revert claim all for wrong caller", async function () {
      const staker = testUsers[0];

      const claimAllData = {
        amount: ethers.utils.parseEther('100'),
        nonce: nonce++,
        owner: staker.address
      };

      const signedClaimAllVoucher = await eip712Signer.signVoucher(
        claimAllData,
        ClaimAllVoucherType,
        serviceSigner
      );

      await expect(staking.connect(testUsers[3]).claimAll(signedClaimAllVoucher))
        .to.be.revertedWith("EWStaking: not your voucher");
    });

    it("should revert claim all for zero staked tokens", async function () {
      const claimer = testUsers[2];

      const claimAllData = {
        amount: ethers.utils.parseEther('100'),
        nonce: nonce++,
        owner: claimer.address
      };

      const signedClaimAllVoucher = await eip712Signer.signVoucher(
        claimAllData,
        ClaimAllVoucherType,
        serviceSigner
      );

      await expect(staking.connect(claimer).claimAll(signedClaimAllVoucher))
        .to.be.revertedWith("EWStaking: no tokens in stake");
    });

    it("should claim all rewards", async function () {
      const staker = testUsers[0];

      const claimAllData = {
        amount: ethers.utils.parseEther('100'),
        nonce: nonce++,
        owner: staker.address
      };

      const signedClaimAllVoucher = await eip712Signer.signVoucher(
        claimAllData,
        ClaimAllVoucherType,
        serviceSigner
      );

      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).rewardClaimTimestamp).to.equal(0);
      }

      await expect(staking.claimAll(signedClaimAllVoucher))
        .to.emit(staking, 'RewardClaimedAll').withArgs(
          staker.address,
          signedClaimAllVoucher.signature,
          claimAllData.amount
        );

      const latestBlock = await ethers.provider.getBlock("latest");

      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).rewardClaimTimestamp).to.equal(latestBlock.timestamp);
      }
    });
  });
});
