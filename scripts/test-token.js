const hre = require('hardhat')
const axios = require('axios')

async function testUri(){
const [deployer, testUser] =  await ethers.getSigners()
const token = await hre.ethers.getContractFactory('EthereumTowers')
const live = await token.attach("0x5b956D5699753a575Af9743f90aC804c933Ce5DF")
let tokenId = 74135256
 await live.mint(testUser.address, 156141177)
// let data = await live.tokenURI(tokenId)
// console.log('Token Url from BC', data)
// let tokenInfo = await axios.get('http://127.0.0.1:5000/api/item/'+ tokenId)
// let params = await tokenInfo.data.token.traits
// console.log('Token Info: ', tokenInfo.data, params)
}
testUri()