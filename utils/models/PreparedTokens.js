const mongoose = require('mongoose')
const Schema = mongoose.Schema

const tokenShema = new Schema({
    token_id: String,
    description: String,
    external_url: String,
    image: String,
    name: String,
    attributes: Array,
    owner: String
})

const TokenPrepared = mongoose.model('preparedTokens', tokenShema)
module.exports = TokenPrepared
