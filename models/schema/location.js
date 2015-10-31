var Schema = require('mongoose').Schema

var locationSchema = new Schema({
  type: {
    type: String,
    required: true,
    default: 'Feature'
  },
  geometry: {
    type: {
      type: String,
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: Array,
      required: true
    }
  },
  properties: Schema.Types.Mixed
})

// LocationSchema.index({ 'geometry': '2dsphere' })

module.exports = locationSchema
