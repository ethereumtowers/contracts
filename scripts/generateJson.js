const hre = require('hardhat')
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
  let tokens = await Owner.find()
  for (let i = 0; i < tokens.length; i++) {
    let token = await Prepared({
      token_id: tokens[i].id,
      description: tokens[i].name,
      external_url: null,
      image: tokens[i].image_url,
      name: tokens[i].name,
      attributes: tokens[i].traits,
      owner: tokens[i].ownerAddress,
    })
    await token.save()

  }
}
generateJson()
