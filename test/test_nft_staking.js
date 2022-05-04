const { expect } = require('chai');
const { ethers } = require('hardhat');
const { EIP712Signer, StakeVoucherType, UnstakeVoucherType, ClaimVoucherType } = require('../utils/EIP712Signer')

const stakingContractName = "EthereumWorldsNFTStaking";
const erc721ContractName = "TestERC721";
const erc20ContractName = "TestERC20";

const SIGNING_DOMAIN = "EW_STAKING";
const SIGNATURE_VERSION = "1";


async function check_stake_events(tx, testUsers, tokenIds, rentable, N) {
  const receipt = await tx.wait();
  let index_valid_event = 0;
  for (const event of receipt.events) {
    if (event.event) {
      expect(event.event).equal("TokenStaked");
      expect(event.args[0]).equal(testUsers[0].address);
      expect(event.args[1]).equal(tokenIds[index_valid_event]);
      expect(event.args[2]).equal(rentable);
      index_valid_event++;
    }
  }
  expect(index_valid_event).equal(N);
}

async function check_unstake_events(tx, testUsers, tokenIds, N) {
  const receipt = await tx.wait();
  let index_valid_event = 0;
  for (const event of receipt.events) {
    if (event.event) {
      expect(event.event).equal("TokenUnstaked");
      expect(event.args[0]).equal(testUsers[0].address);
      expect(event.args[1]).equal(tokenIds[index_valid_event]);
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

    it("should update service signer by contract owner", async function () {
      await expect(staking.updateServiceSigner(ethers.constants.AddressZero))
        .to.emit(staking, 'ServiceSignerUpdated').withArgs(ethers.constants.AddressZero);

      await expect(staking.updateServiceSigner(serviceSigner.address))
        .to.emit(staking, 'ServiceSignerUpdated').withArgs(serviceSigner.address);
    });

    it("should pause contract", async function () {
      await staking.pause();
      expect(await staking.paused()).to.be.true;
    });

    it("should unpause contract", async function () {
      await staking.unpause();
      expect(await staking.paused()).to.be.false;
    });

    it("should restrict calling stake if it is paused", async function () {
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

      await staking.pause();
      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("Pausable: paused");
      await staking.unpause();
    });

    it("should restrict calling stake for empty tokens array", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: [],
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

      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: nothing to stake");
    });

    it("should restrict calling stake when limit is reached", async function () {
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

      await staking.updateMaxTokensInStake(2);
      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: tokens in stake limit reached");
      await staking.updateMaxTokensInStake(100);
    });

    it("should restrict calling stake with invalid voucher signature", async function () {
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
        testUsers[10]
      );

      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: invalid signature");
    });

    it("should restrict calling stake with used voucher", async function () {
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

      await staking.stake(signedStakeVoucher);

      await expect(staking.stake(signedStakeVoucher)).to.be.revertedWith("EWStaking: this voucher already used");

      const unstakeVoucherData = {
        tokenIds: tokenIds,
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

      await expect(staking.connect(serviceSigner).stake(signedStakeVoucher))
        .to.be.revertedWith("EWStaking: not your voucher");
    });

    it("should restrict calling stake not for token owner", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: notApprovedTokenIds,
        rentable: true,
        minRentPeriod: 1,
        rentableUntil: 2,
        rentalDailyPrice: 3,
        deposit: 4,
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

      await erc721.setApprovalForAll(staking.address, false);

      await expect(staking.connect(staker).stake(signedStakeVoucher))
        .to.be.revertedWith("EWStaking: not approved to transfer tokens");
    });

    it("should restrict calling stake for non-existing token", async function () {
      const staker = testUsers[0];

      const stakeVoucherData = {
        tokenIds: [12345],
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

      await erc721.setApprovalForAll(staking.address, true);

      await expect(staking.stake(signedStakeVoucher))
        .to.be.revertedWith("ERC721: owner query for nonexistent token");

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

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events
      await check_stake_events(tx, testUsers, tokenIds, signedStakeVoucher.rentable, tokenIds.length);

      // check stack info owner and the number of tokens is 3
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(staker.address);
        expect((await staking.getStakeInfo(tokenIds[i])).rentable).to.equal(signedStakeVoucher.rentable);
        expect((await staking.getStakeInfo(tokenIds[i])).tokenIndex).to.equal(i);
        expect((await staking.getStakeInfo(tokenIds[i])).minRentPeriod).to.equal(signedStakeVoucher.minRentPeriod);
        expect((await staking.getStakeInfo(tokenIds[i])).rentableUntil).to.equal(signedStakeVoucher.rentableUntil);
        expect((await staking.getStakeInfo(tokenIds[i])).rentalDailyPrice).to.equal(signedStakeVoucher.rentalDailyPrice);
        expect((await staking.getStakeInfo(tokenIds[i])).deposit).to.equal(signedStakeVoucher.deposit);
      }
      expect((await staking.getTokensByOwner(staker.address)).length).to.equal(tokenIds.length);
    });

    it("should set token rentable", async function () {
      // check - staking is empty
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length);

      const tokenId = 11;
      const rentable = false;
      const minRentPeriod = 10;
      const rentableUntil = 20;
      const rentalDailyPrice = 5;
      const deposit = 100;
      await expect(staking.setRentable(tokenId, rentable, minRentPeriod, rentableUntil, rentalDailyPrice, deposit))
        .and.to.emit(staking, "TokenSetRentable").withArgs(testUsers[0].address, tokenId, rentable);

      expect(await staking.isRentable(tokenId)).to.equal(rentable);
      expect((await staking.getStakeInfo(tokenId)).minRentPeriod).to.equal(minRentPeriod);
      expect((await staking.getStakeInfo(tokenId)).rentableUntil).to.equal(rentableUntil);
      expect((await staking.getStakeInfo(tokenId)).rentalDailyPrice).to.equal(rentalDailyPrice);
      expect((await staking.getStakeInfo(tokenId)).deposit).to.equal(deposit);
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length);
    });

    it("should restrict calling setRentable not for token owner", async function () {
      expect((await staking.getTokensByOwner(testUsers[0].address)).length).to.equal(tokenIds.length);
      const tokenId = 2;
      await expect(staking.connect(testUsers[1]).setRentable(tokenId, false, 0, 0, 0, 0))
        .to.be.revertedWith("EWStaking: you are not an owner");
    });

    it("should restrict calling claim for invalid voucher signer", async function () {
      const rewardOwner = testUsers[5];

      const claimVoucherData = {
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
        .to.be.revertedWith("EWStaking: not an owner of reward");
    });

    it("should restrict claiming same reward twice", async function () {
      const rewardOwner = testUsers[5];

      const claimVoucherData = {
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
        .to.be.revertedWith("EWStaking: this reward already claimed");
    });

    it("should restrict calling claim for zero amount", async function () {
      const rewardOwner = testUsers[5];

      const claimVoucherData = {
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
      const rewardOwner = testUsers[5];

      const claimVoucherData = {
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

    it("should claim rewards", async function () {
      const rewardOwner = testUsers[5];

      const claimVoucherData = {
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
          claimVoucherData.amount
        );
    });

    it("should restrict calling unstake not for your voucher", async function () {
      const staker = testUsers[0];
      const unstakeVoucherData = {
        tokenIds: tokenIds,
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
        nonce: nonce++,
        owner: staker.address
      };
      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );
      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: you are not an owner");
    });

    it("should restrict calling unstake for empty token ids", async function () {
      const staker = testUsers[0];
      const unstakeVoucherData = {
        tokenIds: [],
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
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events for stake
      await check_stake_events(tx, testUsers, tokenIds, signedStakeVoucher.rentable, tokenIds.length);
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
        nonce: nonce++,
        owner: staker.address
      };
      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );
      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: you are not an owner");

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
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events for stake
      await check_stake_events(tx, testUsers, tokenIds, signedStakeVoucher.rentable, tokenIds.length);
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
        nonce: nonce++,
        owner: staker.address
      };
      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );
      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: you are not an owner");

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
      // check - staking is empty
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(ethers.constants.AddressZero);
      }

      // stake  tokens
      const tx = await staking.connect(staker).stake(signedStakeVoucher);

      // check all events for stake
      await check_stake_events(tx, testUsers, tokenIds, signedStakeVoucher.rentable, tokenIds.length);
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
        nonce: nonce++,
        owner: staker.address
      };
      const signedUnstakeVoucher = await eip712Signer.signVoucher(
        unstakeVoucherData,
        UnstakeVoucherType,
        serviceSigner
      );
      await expect(staking.unstake(signedUnstakeVoucher, staker.address))
        .to.be.revertedWith("EWStaking: you are not an owner");

      // check staking - has the same (3) tokenIds
      for (let i = 0; i < tokenIds.length; i++) {
        expect((await staking.getStakeInfo(tokenIds[i])).owner).to.equal(testUsers[0].address);
        expect((await staking.getTokensByOwner(testUsers[0].address))[i]).to.equal(ethers.BigNumber.from(tokenIds[i]));
      }
    });
  });
});
