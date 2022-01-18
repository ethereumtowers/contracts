const hre = require('hardhat')
// const ethers = require('ethers')
const crypto = require('crypto')
const mongoose = require('mongoose')
const Owner = require('../utils/models/ParsedTokens')
const Prepared = require('../utils/models/PreparedTokens')
var nft
async function Connect() {
  await mongoose
    .connect(
      'mongodb://kononov:291091@127.0.0.1:27017/ethereumTowers?authSource=admin',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    )
    .then(() =>
      console.log(
        'Connected to Mongoose to ' +
          'mongodb://kononov:291091@127.0.0.1:27017/ethereumTowers?authSource=admin',
      ),
    )
    .catch((error) => console.log(error))
}
Connect()
async function main() {
  const [deployer, testUser] = await ethers.getSigners()
  console.log(
    'Deployer: ' + deployer.address + ' Test User ' + testUser.address,
  )
  const ET = await hre.ethers.getContractFactory('EthereumTowers')
  const et = await ET.deploy('https://ipfs.io/ipfs/')
  await et.deployed()
  console.log('Ethereum Towers deployed to:', et.address)
  nft = et.address
  let tokens = await Prepared.find()
  for(let i = 0; i < tokens.length; i++) {
    let id = crypto.randomBytes(32).toString('hex')
    let privateKey = "0x"+id
    console.log("New wallet Private Key generated: ", privateKey)
    let wallet = new hre.ethers.Wallet(privateKey)
    console.log("Address: " + wallet.address)
    let url = tokens[i].external_url
    let tokenUri = url.split('/')[4]
    // await et.mint(tokens[i].owner, tokens[i].token_id, tokenUri)
    await et.mint(wallet.address, tokens[i].token_id, tokenUri, 1)
    console.log('New token minted with params: ', 'OWNER ', wallet.address,'ID ', tokens[i].token_id,'URL ', tokenUri)
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
