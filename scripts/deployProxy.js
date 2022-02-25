const hre = require('hardhat')
let mainTower
let proxyTower
async function main() {
  const [deployer] = await ethers.getSigners()
  console.log(
    'Deployer: ' + deployer.address
  )
  const ET = await hre.ethers.getContractFactory('EthereumTowers')
  const et = await ET.deploy('https://ipfs.io/ipfs/', 'QmRE6Uz3CPiEHebusH1sY9s6Qim6FxzJGK1boShBPtbhCC', '0x38De691413CC32d6354E27c93569d4275Fa7f984')
  await et.deployed()
  console.log('Ethereum Towers deployed to:', et.address)
  mainTower = et.address
}
async function proxy() {
  const [deployer] = await ethers.getSigners()
  console.log(
    'Deployer: ' + deployer.address
  )
    // address _towersContract,
    // address _feeAddress,
    // uint256 _price,
    // uint64 subscriptionId
  const TP = await hre.ethers.getContractFactory('TowersProxy')
  const tp = await TP.deploy("0x1944937643d8317D23bc49766412385F8ec6452F", '0x38De691413CC32d6354E27c93569d4275Fa7f984', 1000000000000000, '0x38De691413CC32d6354E27c93569d4275Fa7f984')
  await tp.deployed()
  console.log('Ethereum Proxy deployed to:', tp.address)
  proxyTower = tp.address
}
// main()
//   .then(() => {
    proxy().then(()=>{
      process.exit(0)
    })
  // })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
