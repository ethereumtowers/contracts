const { expect } = require("chai");
const { ethers } = require("hardhat");

const ethWorldsContractName = "EthereumWorlds";
const tokensCap = ethers.utils.parseEther("1000000000");

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
    expect(await tokenContract.totalSupply()).to.be.equal(tokensCap);
  });

  it('should mint all tokens to distributor address', async function () {
    expect(await tokenContract.balanceOf(distributor.address)).to.be.equal(tokensCap);
  });

  it('should transfer tokens', async function () {
    const amount = ethers.utils.parseEther('250');
    const receiver = testUsers[10];

    await tokenContract.connect(distributor).transfer(receiver.address, amount);

    expect(await tokenContract.balanceOf(receiver.address)).to.be.equal(amount);
  });
});
