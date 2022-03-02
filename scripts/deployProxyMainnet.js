const hre = require('hardhat')
let mainTower = '0x72b3B26848a30D3D76e5B67959a365B6aD388c49'
let servicePublicKey = '0x38De691413CC32d6354E27c93569d4275Fa7f984'

async function proxy() {
  const [deployer] = await ethers.getSigners()
  console.log(
    'Deployer: ' + deployer.address
  )
  const TP = await hre.ethers.getContractFactory('TowersProxy')
  const tp = await TP.deploy(mainTower, servicePublicKey)
  await tp.deployed()
  console.log('Ethereum Proxy deployed to:', tp.address)
  proxyTower = tp.address
}
    proxy().then(()=>{
      process.exit(0)
    })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
