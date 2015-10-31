var Schema = require('mongoose').Schema
var locationSchema = require('./location')
var sensorSchema = require('./sensor')

var boxSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  loc: {
    type: [locationSchema],
    required: true
  },
  boxType: {
    type: String,
    required: true
  },
  exposure: {
    type: String,
    required: false
  },
  grouptag: {
    type: String,
    required: false
  },
  model: {
    type: String,
    required: false
  },
  sensors: [sensorSchema]
}, { strict: false })

module.exports = boxSchema
