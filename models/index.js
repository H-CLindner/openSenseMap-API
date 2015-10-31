var mongoose = require('mongoose')
var userSchema = require('./schema/user')
var boxSchema = require('./schema/box')
var measurementSchema = require('./schema/measurement')
var sensorSchema = require('./schema/sensor')

var Measurement = mongoose.model('Measurement', measurementSchema)
var Box = mongoose.model('Box', boxSchema)
var Sensor = mongoose.model('Sensor', sensorSchema)
var User = mongoose.model('User', userSchema)

module.exports.User = User
module.exports.Box = Box
module.exports.Sensor = Sensor
module.exports.Measurement = Measurement
