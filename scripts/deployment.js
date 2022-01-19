const hre = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(
    'Deployer: ' + deployer.address
  )
  const ET = await hre.ethers.getContractFactory('EthereumTowers')
  const et = await ET.deploy('https://ipfs.io/ipfs/', 'QmWt1RtuGxzZC53u3UidtP3zP68Z5UMNg3zHZ6kvtzCZ9Z')
  await et.deployed()
  console.log('Ethereum Towers deployed to:', et.address)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
