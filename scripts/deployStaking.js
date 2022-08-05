const hre = require('hardhat')

async function deployStakingV2() {
  const [deployer] = await ethers.getSigners();

  console.log('Deployer: ' + deployer.address);

  const stakingContractFactory = await hre.ethers.getContractFactory('EthereumWorldsNFTStaking');
  const staking = await stakingContractFactory.deploy(
    "0xcC2AA99C6c2a2558c9Fef23BEbf2AF3f29d38c1C", // ERC20
    "0xb91067aCE84a9f9432Cd8767F6559dD9f0cc4F47", // ERC721
    "0xaF24954097Bd1b4e9b52D6Dafea509ED5604bd46", // Service signer
  );
  await staking.deployed();

  console.log('Staking deployed to: ', staking.address);
}

deployStakingV2().then(() => {
  process.exit(0)
})
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
