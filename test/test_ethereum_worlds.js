const { expect } = require("chai");
const { ethers } = require("hardhat");

const ethWorldsContractName = "EthereumWorlds";

describe(`${ethWorldsContractName} contract`, function () {
  var tokenContract;
  var distributor;

  var testUsers

  it(`should deploy ${ethWorldsContractName} contract`, async function () {
    testUsers = await ethers.getSigners();
    distributor = testUsers[1];

    const tokenFactory = await ethers.getContractFactory(ethWorldsContractName);
    tokenContract = await tokenFactory.deploy(distributor.address);
    await tokenContract.deployed();

    expect(await tokenContract.name()).to.equal("Ethereum Worlds");
    expect(await tokenContract.symbol()).to.equal("TWR");
    expect(await tokenContract.decimals()).to.equal(18);
  });

  it('should mint all tokens', async function () {
    const tokensCap = await tokenContract.cap();

    expect(await tokenContract.totalSupply()).to.be.equal(tokensCap);
  });

  it('should mint all tokens to distributor address', async function () {
    const tokensCap = await tokenContract.cap();

    expect(await tokenContract.balanceOf(distributor.address)).to.be.equal(tokensCap);
  });

  it('should transfer tokens', async function () {
    const amount = ethers.utils.parseEther('250');
    const receiver = testUsers[10];

    await tokenContract.connect(distributor).transfer(receiver.address, amount);

    expect(await tokenContract.balanceOf(receiver.address)).to.be.equal(amount);
  });

  it('should transfer ownership', async function() {
    const newOwner = testUsers[15];

    await tokenContract.transferOwnership(newOwner.address);

    expect(await tokenContract.owner()).to.be.equal(newOwner.address);
  });
});
