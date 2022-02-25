const hre = require('hardhat')

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(
    'Deployer: ' + deployer.address
  )
  const ET = await hre.ethers.getContractFactory('EthereumTowers')
  const et = await ET.deploy('https://ipfs.io/ipfs/', 'QmRE6Uz3CPiEHebusH1sY9s6Qim6FxzJGK1boShBPtbhCC','0x38De691413CC32d6354E27c93569d4275Fa7f984')
  await et.deployed()
  console.log('Ethereum Towers deployed to:', et.address)
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
