const hre = require('hardhat')
var fs = require('fs')
const path = require('path')
const directoryPath = path.join(__dirname, 'token_metadata')
const mongoose = require('mongoose')
const ParsedTokens = require('../utils/models/ParsedTokens')
const PreparedTokens = require('../utils/models/PreparedTokens')
const NotValidTokens = require('../utils/models/NotValidTokens')
const MapedTokens = require('../utils/models/MapedTokens')
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
async function mapTokens() {
  let tokens = await PreparedTokens.find().lean()
  let addresses = []
  let ids = []
  tokens.forEach(async function (token) {
    if (
      token.attributes.length === 4 &&
      token.attributes[2].trait_type === 'Apartment' &&
      token.attributes[0].trait_type === 'Tower' &&
      token.attributes[1].trait_type === 'Type' &&
      token.attributes[3].trait_type === 'Floor'
    ) {
      let floor = token.attributes[3].value
      let tower = token.attributes[0].value
      let apartment = token.attributes[2].value
      let padderSettings = new Padder(3)
      let floorPadded = padderSettings.pad(floor)
      let padderApartment = new Padder(2)
      let apartmentPadded = padderApartment.pad(apartment)
      let tokenMapped = new MapedTokens({
        token_id: tower + floorPadded + apartmentPadded,
        owner: token.owner,
        token_id_old: token.token_id,
        description: token.description
      })
      await tokenMapped.save()
      addresses.push(tokenMapped.owner)
      ids.push(tokenMapped.token_id)
      const limit = 50
      let filesCount = tokens.length / limit
      for (let i = 1; i < filesCount; i++) {
        let page = i
        let startIndex = (page - 1) * limit
        let endIndex = page * limit
        let decomposited = addresses.slice(startIndex, endIndex)
        // console.log(`ADDRESSES ${i}`, decomposited)
        fs.writeFile(`addresses_${i}.txt`, decomposited.toString(), function (err) {
          if (err) return console.log(err)
          console.log(`Addresses_${i} > addresses${i}.txt`)
        })
      }
      for (let i = 1; i < filesCount; i++) {
        let page = i
        let startIndex = (page - 1) * limit
        let endIndex = page * limit
        let decomposited = ids.slice(startIndex, endIndex)
        // console.log(`IDS ${i}`, decomposited)
        fs.writeFile(`ids_${i}.txt`, decomposited.toString(), function (err) {
          if (err) return console.log(err)
          console.log(`ids_${i} > ids${i}.txt`)
        })
      }
    } else {
      new NotValidTokens({
          token_id: token.token_id,
          description: token.description,
          external_url: token.external_url,
          image: token.image,
          name: token.name,
          attributes: token.attributes,
          owner: token.owner
      }).save()
    }
  })
}
mapTokens()
function Padder(len, pad) {
  if (len === undefined) {
    len = 1
  } else if (pad === undefined) {
    pad = '0'
  }
  var pads = ''
  while (pads.length < len) {
    pads += pad
  }
  this.pad = function (what) {
    var s = what.toString()
    return pads.substring(0, pads.length - s.length) + s
  }
}
