var restify = require('restify')
var _ = require('lodash')
var GeoJSON = require('geojson')
var json2csv = require('json2csv')
var fs = require('fs')
var cfg = require('./config')
var User = require('../models').User
var Box = require('../models').Box
var Measurement = require('../models').Measurement
var Utils = require('../utils')
var Types = require('mongoose').Types

// TODO require utils/logger.js

module.exports.findAllBoxes = function findAllBoxes (req, res, next) {
  Box.find({}).populate('sensors.lastMeasurement').exec(function (err, boxes) {
    // TODO catch error

    if (req.params[1] === 'json' || req.params[1] === undefined) {
      res.send(boxes)
    } else if (req.params[1] === 'geojson') {
      var tmp = JSON.stringify(boxes)
      tmp = JSON.parse(tmp)
      var geojson = _.transform(tmp, function (result, n) {
        var lat = n.loc[0].geometry.coordinates[1]
        var lng = n.loc[0].geometry.coordinates[0]
        delete n['loc']
        n['lat'] = lat
        n['lng'] = lng
        return result.push(n)
      })
      res.send(GeoJSON.parse(geojson, {Point: ['lat', 'lng']}))
    }
  })
}

module.exports.findBox = function findBox (req, res, next) {
  var id = req.params.boxId.split('.')[0]
  var format = req.params.boxId.split('.')[1]
  if (Utils.isEmptyObject(req.query)) {
    Box.findOne({_id: id}).populate('sensors.lastMeasurement').exec(function (error, box) {
      if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
      if (box) {
        if (format === 'json' || format === undefined) {
          res.send(box)
        } else if (format === 'geojson') {
          var tmp = JSON.stringify(box)
          tmp = JSON.parse(tmp)
          var lat = tmp.loc[0].geometry.coordinates[1]
          var lng = tmp.loc[0].geometry.coordinates[0]
          delete tmp['loc']
          tmp['lat'] = lat
          tmp['lng'] = lng
          var geojson = [tmp]
          res.send(GeoJSON.parse(geojson, {Point: ['lat', 'lng']}))
        }
      } else {
        res.send(404)
      }
    })
  } else {
    res.send(box)
  }
}

module.exports.getMeasurement = function getMeasurements (req, res, next) {
  Box.findOne({_id: req.params.boxId}, {sensors: 1}).populate('sensors.lastMeasurement').exec(function (error, sensors) {
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
    } else {
      res.send(201, sensors)
    }
  })
}

module.exports.getData = function getData (req, res, next) {
  // default to now
  var toDate = (typeof req.params['to-date'] === 'undefined' || req.params['to-date'] === '') ? new Date() : new Date(req.params['to-date'])
  // default to 24 hours earlier
  var fromDate = (typeof req.params['from-date'] === 'undefined' || req.params['from-date'] === '') ? new Date(toDate.valueOf() - 1000 * 60 * 60 * 24 * 15) : new Date(req.params['from-date'])
  var format = (typeof req.params['format'] === 'undefined') ? 'json' : req.params['format'].toLowerCase()

  logger.log.debug(fromDate, 'to', toDate)

  if (toDate.valueOf() < fromDate.valueOf()) {
    return next(new restify.InvalidArgumentError(JSON.stringify('Invalid time frame specified')))
  }
  if (toDate.valueOf() - fromDate.valueOf() > 1000 * 60 * 60 * 24 * 32) {
    return next(new restify.InvalidArgumentError(JSON.stringify('Please choose a time frame up to 31 days maximum')))
  }

  var queryLimit = 100000
  var resultLimit = 1000

  Measurement.find({
    sensor_id: req.params.sensorId,
    createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
  }, {'createdAt': 1, 'value': 1, '_id': 0}) // do not send _id column
    .limit(queryLimit)
    .lean()
    .exec(function (error, sensorData) {
      if (error) {
        return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
      } else {
        // only return every nth element
        // TODO: equally distribute data over time instead
        if (sensorData.length > resultLimit) {
          var limitedResult = []
          var returnEveryN = Math.ceil(sensorData.length / resultLimit)
          logger.log.info('returnEveryN ', returnEveryN)
          logger.log.info('old sensorData length:', sensorData.length)
          for (var i = 0; i < sensorData.length; i++) {
            if (i % returnEveryN === 0) {
              limitedResult.push(sensorData[i])
            }
          }
          sensorData = limitedResult
          logger.log.info('new sensorData length:', sensorData.length)
        }

        if (typeof req.params['download'] !== 'undefined' && req.params['download'] === 'true') {
          // offer download to browser
          res.header('Content-Disposition', 'attachment; filename=' + req.params.sensorId + '.' + format)
        }

        if (format === 'csv') {
          // send CSV
          json2csv({data: sensorData, fields: ['createdAt', 'value']}, function (err, csv) {
            if (err) logger.log.error(err)
            res.header('Content-Type', 'text/csv')
            res.header('Content-Disposition', 'attachment; filename=' + req.params.sensorId + '.csv')
            res.send(201, csv)
          })
        } else {
          // send JSON
          res.send(201, sensorData)
        }
      }
    })
}

module.exports.postNewMeasurement = function postNewMeasurement (req, res, next) {
  Box.findOne({_id: req.params.boxId}, function (error, box) {
    if (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
    } else {
      for (var i = box.sensors.length - 1; i >= 0; i--) {
        if (box.sensors[i]._id.equals(req.params.sensorId)) {
          var measurementData = {
            value: req.params.value,
            _id: Types.ObjectId(),
            sensor_id: req.params.sensorId
          }

          var measurement = new Measurement(measurementData)

          box.sensors[i].lastMeasurement = measurement._id
          box.save(function (error, data) {
            if (error) {
              return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
            } else {
              res.send(201, 'measurement saved in box')
            }
          })

          measurement.save(function (error, data, box) {
            if (error) {
              return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
            } else {
              res.send(201, measurement)
            }
          })
        }
      }
    }
  })
}

module.exports.postNewBox = function postNewBox (req, res, next) {
  User.findOne({apikey: req.params.orderID}, function (err, user) {
    if (err) {
      logger.log.error(err)
      return res.send(500)
    } else {
      logger.log.debug('A new sensebox is being submitted')
      // log.debug(req.params)
      if (!user) {
        var newUser = createNewUser(req)
        var newBox = createNewBox(req)
        var savedBox = {}

        newUser._doc.boxes.push(newBox._doc._id.toString())
        newBox.save(function (err, box) {
          if (err) {
            return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
          }

          switch (req.params.model) {
            case 'homeEthernet':
              var filename = 'files/template_home/template_home.ino'
              break
            case 'basicEthernet':
              filename = 'files/template_basic/template_basic.ino'
              break
            default:
              filename = 'files/template_custom_setup/template_custom_setup.ino'
              break
          }

          try {
            var output = cfg.targetFolder + '' + box._id + '.ino'
            logger.log.debug(output)
            fs.readFileSync(filename).toString().split('\n').forEach(function (line) {
              if (line.indexOf('//SenseBox ID') !== -1) {
                fs.appendFileSync(output, line.toString() + '\n')
                fs.appendFileSync(output, '#define SENSEBOX_ID "' + box._id + '"\n')
              } else if (line.indexOf('//Sensor IDs') !== -1) {
                fs.appendFileSync(output, line.toString() + '\n')
                var customSensorindex = 1
                for (var i = box.sensors.length - 1; i >= 0; i--) {
                  var sensor = box.sensors[i]
                  logger.log.debug(sensor)
                  if (sensor.title === 'Temperatur') {
                    fs.appendFileSync(output, '#define TEMPSENSOR_ID "' + sensor._id + '"\n')
                  } else if (sensor.title === 'rel. Luftfeuchte') {
                    fs.appendFileSync(output, '#define HUMISENSOR_ID "' + sensor._id + '"\n')
                  } else if (sensor.title === 'Luftdruck') {
                    fs.appendFileSync(output, '#define PRESSURESENSOR_ID "' + sensor._id + '"\n')
                  } else if (sensor.title === 'Lautstärke') {
                    fs.appendFileSync(output, '#define NOISESENSOR_ID "' + sensor._id + '"\n')
                  } else if (sensor.title === 'Helligkeit') {
                    fs.appendFileSync(output, '#define LIGHTSENSOR_ID "' + sensor._id + '"\n')
                  } else if (sensor.title === 'Beleuchtungsstärke') {
                    fs.appendFileSync(output, '#define LUXSENSOR_ID "' + sensor._id + '"\n')
                  } else if (sensor.title === 'UV-Intensität') {
                    fs.appendFileSync(output, '#define UVSENSOR_ID "' + sensor._id + '"\n')
                  } else {
                    fs.appendFileSync(output, '#define SENSOR' + customSensorindex + '_ID "' + sensor._id + '" \/\/ ' + sensor.title + ' \n')
                    customSensorindex++
                  }
                }
              } else {
                fs.appendFileSync(output, line.toString() + '\n')
              }
            })
            savedBox = box

            newUser.save(function (err, user) {
              if (err) {
                return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
              } else {
                sendWelcomeMail(user, newBox)
                return res.send(201, user)
              }
            })
          } catch (e) {
            logger.log.error(e)
            return res.send(500, JSON.stringify('An error occured'))
          }
        })
      }
    }
  })
  next()
}

module.exports.updateBox = function updateBox (req, res, next) {
  User.findOne({apikey: req.headers['x-apikey']}, function (error, user) {
    if (error) {
      res.send(400, 'ApiKey not existing!')
    }
    if (user.boxes.indexOf(req.params.boxId) !== -1) {
      Box.findById(req.params.boxId, function (err, box) {
        if (err) return handleError(err)
        log.debug(req.params)
        if (req.params.tmpSensorName !== undefined) {
          box.set({name: req.params.tmpSensorName})
        }
        if (req.params.image !== undefined) {
          var data = req.params.image.toString()
          var imageBuffer = Utils.decodeBase64Image(data)
          fs.writeFile(cfg.imageFolder + '' + req.params.boxId + '.jpeg', imageBuffer.data, function (err) {
            if (err) return new Error(err)
            box.set({image: req.params.boxId + '.jpeg'})
            box.save(function (err) {
              if (err) return handleError(err)
              res.send(box)
            })
          })
        } else {
          box.set({image: ''})
        }
        box.save(function (err) {
          if (err) return handleError(err)
          res.send(box)
        })
      })
    } else {
      res.send(400, 'ApiKey does not match SenseBoxID')
    }
  })
}

module.exports.validApiKey = function () {}
