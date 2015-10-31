var Schema = require('mongoose').Schema
var timestamp = require('mongoose-timestamp')

var measurementSchema = new Schema({
  value: {
    type: String,
    required: true
  },
  sensor_id: {
    type: Schema.Types.ObjectId,
    ref: 'Sensor',
    required: true
  }
})

module.exports = measurementSchema.plugin(timestamp)
