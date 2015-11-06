var controller = require('../controllers')

module.exports.SetupRoutes = function (server, path) {
  /**
   * @api {get} /boxes Get all SenseBoxes
   * @apiName findAllBoxes
   * @apiGroup Boxes
   * @apiVersion 0.0.1
   * @apiSampleRequest http://opensensemap.org:8000/boxes
   */
  server.get({path: path, version: '0.0.1'}, controller.findAllBoxes)
  server.get({path: /(boxes)\.([a-z]+)/, version: '0.0.1'}, controller.findAllBoxes)

  /**
   * @api {get} /boxes/:boxId Get one SenseBox
   * @apiName findBox
   * @apiVersion 0.0.1
   * @apiGroup Boxes
   * @apiParam {ID} boxId SenseBox unique ID.
   * @apiSuccess {String} _id SenseBox unique ID.
   * @apiSuccess {String} boxType SenseBox type (fixed or mobile).
   * @apiSuccess {Array} sensors All attached sensors.
   * @apiSuccess {Array} loc Location of SenseBox.
   * @apiSuccessExample Example data on success:
   * {
    "_id": "5386e44d5f08822009b8b614",
    "name": "PHOBOS",
    "boxType": "fixed",
    "sensors": [
      {
        "_id": "5386e44d5f08822009b8b615",
        "boxes_id": "5386e44d5f08822009b8b614",
        "lastMeasurement": {
          "_id": "5388d07f5f08822009b937b7",
          "createdAt": "2014-05-30T18:39:59.353Z",
          "updatedAt": "2014-05-30T18:39:59.353Z",
          "value": "584",
          "sensor_id": "5386e44d5f08822009b8b615",
        },
        "sensorType": "GL5528",
        "title": "Helligkeit",
        "unit": "Pegel"
      }
    ],
    "loc": [
      {
        "_id": "5386e44d5f08822009b8b61a",
        "geometry": {
          "coordinates": [
            10.54555893642828,
            49.61361673283691
          ],
          "type": "Point"
        },
        "type": "feature"
      }
    ]
  }
   */
  server.get({path: path + '/:boxId', version: '0.0.1'}, controller.findBox)

  /**
   * @api {get} /boxes/:boxId/sensors Get all last measurements
   * @apiDescription Get last measurements of all sensors of the secified SenseBox.
   * @apiVersion 0.0.1
   * @apiGroup Measurements
   * @apiName getMeasurements
   * @apiParam {ID} boxId SenseBox unique ID.
   */
  server.get({path: path + '/:boxId/sensors', version: '0.0.1'}, controller.getMeasurements)

  /**
   * @api {get} /boxes/:boxId/data/:sensorId?from-date=:fromDate&to-date:toDate Get last n measurements for a sensor
   * @apiDescription Get up to 1000 measurements from a sensor for a specific time frame, parameters `from-date` and `to-date` are optional. If not set, the last 24 hours are used. The maximum time frame is 1 month. A maxmimum of 1000 values wil be returned for each request.
   * @apiVersion 0.0.1
   * @apiGroup Measurements
   * @apiName getData
   * @apiParam {ID} boxId SenseBox unique ID.
   * @apiParam {ID} sensorId Sensor unique ID.
   * @apiParam {String} from-date Beginning date of measurement data (default: 24 hours ago from now)
   * @apiParam {String} to-date End date of measurement data (default: now)
   * @apiParam {String} download If set, offer download to the user (default: false, always on if CSV is used)
   * @apiParam {String} format Can be 'JSON' (default) or 'CSV' (default: JSON)
   */
  server.get({path: path + '/:boxId/data/:sensorId', version: '0.0.1'}, controller.getData)

  /**
   * @api {post} /boxes Post new SenseBox
   * @apiDescription Create a new SenseBox.
   * @apiVersion 0.0.1
   * @apiGroup Boxes
   * @apiName postNewBox
   */
  server.post({path: path, version: '0.0.1'}, controller.postNewBox)

  /**
   * @api {post} /boxes/:boxId/:sensorId Post new measurement
   * @apiDescription Posts a new measurement to a specific sensor of a box.
   * @apiVersion 0.0.1
   * @apiGroup Measurements
   * @apiName postNewMeasurement
   * @apiParam {ID} boxId SenseBox unique ID.
   * @apiParam {ID} sensorId Sensors unique ID.
   */
  server.post({path: path + '/:boxId/:sensorId', version: '0.0.1'}, controller.postNewMeasurement)

  /**
   * @api {put} /boxes/:boxId Update a SenseBox
   * @apiDescription Modify the specified SenseBox.
   * @apiParam {ID} boxId SenseBox unique ID.
   * @apiHeader {ObjectId} x-apikey SenseBox specific apikey
   * @apiHeaderExample {json} Request-Example:
   *   {
   *     'X-ApiKey':54d3a96d5438b4440913434b
   *   }
   * @apiVersion 0.0.1
   * @apiGroup Boxes
   * @apiName updateBox
   */
  server.put({path: path + '/:boxId', version: '0.0.1'}, controller.updateBox)

  server.get({path: path + '/:boxId', version: '0.0.1'}, controller.validApiKey)
}
