const hre = require('hardhat')

async function deployERC721() {
  const [deployer] = await ethers.getSigners();

  console.log('Deployer: ' + deployer.address);

  const erc721Factory = await hre.ethers.getContractFactory('TestERC721');
  const erc721 = await erc721Factory.deploy();
  await erc721.deployed();

  console.log('ERC721 deployed to: ', erc721.address);
}

deployERC721().then(() => {
  process.exit(0)
})
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
