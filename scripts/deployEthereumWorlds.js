const hre = require('hardhat')

async function deployEthereumWorlds() {
  const [deployer, distributor] = await ethers.getSigners();

  console.log('Deployer: ' + deployer.address);
  console.log('Distributor address: ' + distributor.address);

  const worldsContractFactory = await hre.ethers.getContractFactory('EthereumWorlds');
  const worldsContract = await worldsContractFactory.deploy(distributor.address);
  await worldsContract.deployed();

  console.log('Ethereum Worlds deployed to: ', worldsContract.address);
}

deployEthereumWorlds().then(() => {
  process.exit(0)
})
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
