const hre = require('hardhat')

async function deployEthereumWorlds() {
  const [deployer] = await ethers.getSigners();

  const distributor = "0x76a74e14D5345939c770A5be979494A824a3C06E";

  console.log('Deployer: ' + deployer.address);
  console.log('Distributor address: ' + distributor);

  const worldsContractFactory = await hre.ethers.getContractFactory('EthereumWorlds');
  const worldsContract = await worldsContractFactory.deploy(distributor);
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
