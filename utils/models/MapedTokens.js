const mongoose = require('mongoose')
const Schema = mongoose.Schema

const tokenShema = new Schema({
    token_id: {
        type: Number
    },
    owner: {
        type: String
    }
})

const MapedTokens = mongoose.model('mapedTokens', tokenShema)
module.exports = MapedTokens
