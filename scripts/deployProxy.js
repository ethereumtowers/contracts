const hre = require('hardhat')
let mainTower = '0x72b3B26848a30D3D76e5B67959a365B6aD388c49'
let proxyTower
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
  const tp = await TP.deploy("0x1944937643d8317D23bc49766412385F8ec6452F", '0x38De691413CC32d6354E27c93569d4275Fa7f984')
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
