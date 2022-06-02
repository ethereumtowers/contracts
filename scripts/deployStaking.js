const hre = require('hardhat')

async function deployStakingV2() {
  const [deployer] = await ethers.getSigners();

  console.log('Deployer: ' + deployer.address);

  const stakingContractFactory = await hre.ethers.getContractFactory('EthereumWorldsNFTStaking');
  const staking = await stakingContractFactory.deploy(
    "0xEBF2b3F77022fB9b45C400E8597E55e207973144",
    "0x1944937643d8317D23bc49766412385F8ec6452F",
    "0xf11b2cE99AF0506317f2EE28ADb47ee94B08Cd02",
  );
  await staking.deployed();

  console.log('Staking V2 deployed to: ', staking.address);
}

deployStakingV2().then(() => {
  process.exit(0)
})
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
