const hre = require('hardhat')

async function deployERC20() {
  const [deployer] = await ethers.getSigners();

  console.log('Deployer: ' + deployer.address);

  const erc20Factory = await hre.ethers.getContractFactory('TestERC20');
  const erc20 = await erc20Factory.deploy();
  await erc20.deployed();

  console.log('ERC20 deployed to: ', erc20.address);
}

deployERC20().then(() => {
  process.exit(0)
})
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
