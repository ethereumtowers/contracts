const mongoose = require('mongoose')
const Schema = mongoose.Schema

const tokenShema = new Schema({
    token_id: {
        type: Number
    },
    owner: {
        type: String
    },
    token_id_old: String,
    description: String,
})

const MapedTokens = mongoose.model('mapedTokens', tokenShema)
module.exports = MapedTokens

