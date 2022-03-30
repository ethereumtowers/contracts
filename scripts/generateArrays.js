const hre = require('hardhat')
var fs = require('fs')
const mongoose = require('mongoose')
const Owner = require('../utils/models/ParsedTokens')
const Prepared = require('../utils/models/PreparedTokens')
const ipfs = require('nano-ipfs-store').at('https://ipfs.beeple.one')
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
async function generateJson() {
  let tokens = await Owner.find().lean()
  let owners = []
  let ids = []
  console.log('DD')
  let all = await Owner.find()
  let page = 1
  let limit = 10
  let startIndex = (page - 1) * limit
  let endIndex = page * limit
  let paginatedAll = all.slice(startIndex, endIndex)
  let items = all.length
  let pageCount = Math.ceil(items / limit)
  for (let i = 1; i <= pageCount; i++) {
    page = i
    console.log(paginatedAll)
    for (let i = 0; i < paginatedAll.length; i++) {
      owners.push(paginatedAll[i].ownerAddress)
      ids.push(paginatedAll[i].id)
    }
    content = {
      addresses: owners,
      ids: ids,
      urls: urls
    }
    fs.writeFile(`/arrays/${i}.txt`, owners, function (err) {
      if (err) {
        console.log(err)
      } else {
        console.log('File saved')
      }
    })
    ids = []
    owners = []
    if(i === pageCount){
      process.exit(0)
    }
  }
}
generateJson()
