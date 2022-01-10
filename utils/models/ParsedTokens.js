const mongoose = require('mongoose')
const Schema = mongoose.Schema

const tokenShema = new Schema({
    id: {
        type: String
    },
    token_id: {
        type: String
    },
    name: {
        type: String
    },
    description: {
        Type: String
    },
    ownerAddress: {
        type: String
    },
    ownerId:{
        type: String
    },
    authorAddress: {
        type: String
    },
    image_url: {
        type: String
    },
    traits: {
        type: Array
    }
})

const TokenParsed = mongoose.model('parsedTokens', tokenShema)
module.exports = TokenParsed
