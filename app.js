'use strict'

var cfg = require('./config')
var restify = require('restify')
var routes = require('./routes')
var mongoose = require('mongoose')

// TODO require utils/logger.js

// var products = require('./products')
// var nodemailer = require('nodemailer')
// var smtpTransport = require('nodemailer-smtp-transport')
// var htmlToText = require('nodemailer-html-to-text').htmlToText

var dbHost = process.env.DB_HOST || 'db'

// use this function to retry if a connection cannot be established immediately
var connectWithRetry = function () {
  return mongoose.connect('mongodb://' + dbHost + '/OSeM-api', {
    keepAlive: 1
  }, function (err) {
    if (err) {
      console.error('Failed to connect to mongo on startup - retrying in 5 sec', err)
      setTimeout(connectWithRetry, 5000)
    }
  })
}

var db = connectWithRetry()

db.on('error', function () {
  console.error.bind(console, 'connection error:')
})

db.once('open', function (callback) {
  var server = createServer()

  routes.SetupRoutes(server, cfg.server.path)

  server.listen(cfg.server.port, function () {
    console.log('%s listening at %s', server.name, server.url)
  })
})

var createServer = function () {
  var server = restify.createServer({
    name: cfg.server.name,
    version: cfg.server.version,
    log: logger.reqlog
  })

  server.use(restify.CORS({'origins': ['*']}))
  server.use(restify.fullResponse())
  server.use(restify.acceptParser(server.acceptable))
  server.use(restify.queryParser())
  server.use(restify.bodyParser())

  server.pre(function (request, response, next) {
    request.log.info({req: request}, 'REQUEST')
    next()
  })

  server.on('MethodNotAllowed', unknownMethodHandler)

  server.on('uncaughtException', function (req, res, route, err) {
    logger.log.error('Uncaught error', err)
    return res.send(500, JSON.stringify('An error occured'))
  })

  return server
}

var PATH = '/boxes'
var userPATH = 'users'

function unknownMethodHandler (req, res) {
  if (req.method.toLowerCase() === 'options') {
    var allowHeaders = ['Accept', 'X-ApiKey', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With']

    if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS')

    res.header('Access-Control-Allow-Credentials', true)
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '))
    res.header('Access-Control-Allow-Methods', res.methods.join(', '))
    res.header('Access-Control-Allow-Origin', req.headers.origin)

    return res.send(204)
  } else {
    return res.send(new restify.MethodNotAllowedError())
  }
}

/**
 * @api {get} /boxes/users/:boxId Check for valid API key
 * @apiDescription Check for valid API key. Will return status code 400 if invalid, 200 if valid.
 * @apiParam {ID} boxId SenseBox unique ID.
 * @apiHeader {ObjectId} x-apikey SenseBox specific apikey
 * @apiHeaderExample {json} Request-Example:
 *   {
 *     'X-ApiKey':54d3a96d5438b4440913434b
 *   }
 * @apiError {String} ApiKey is invalid!
 * @apiError {String} ApiKey not existing!
 * @apiSuccess {String} ApiKey is valid!
 * @apiVersion 0.0.1
 * @apiGroup Boxes
 * @apiName updateBox
 */
function validApiKey (req, res, next) {
  User.findOne({apikey: req.headers['x-apikey']}, function (error, user) {
    if (error) {
      res.send(400, 'ApiKey not existing!')
    }

    if (user.boxes.indexOf(req.params.boxId) !== -1) {
      res.send(200, 'ApiKey is valid!')
    } else {
      res.send(400, 'ApiKey is invalid!')
    }
  })
}

function createNewUser (req) {
  var userData = {
    firstname: req.params.user.firstname,
    lastname: req.params.user.lastname,
    email: req.params.user.email,
    apikey: req.params.orderID,
    boxes: []
  }

  var user = new User(userData)

  return user
}

function createNewBox (req) {
  var boxData = {
    name: req.params.name,
    boxType: req.params.boxType,
    loc: req.params.loc,
    grouptag: req.params.tag,
    exposure: req.params.exposure,
    _id: mongoose.Types.ObjectId(),
    sensors: []
  }

  var box = new Box(boxData)

  if (req.params.model) {
    switch (req.params.model) {
      case 'homeEthernet':
        req.params.sensors = products.senseboxhome
        break
      case 'basicEthernet':
        req.params.sensors = products.senseboxbasic
        break
      default:
        break
    }
  }

  for (var i = req.params.sensors.length - 1; i >= 0; i--) {
    var id = mongoose.Types.ObjectId()

    var sensorData = {
      _id: id,
      title: req.params.sensors[i].title,
      unit: req.params.sensors[i].unit,
      sensorType: req.params.sensors[i].sensorType,
    }

    box.sensors.push(sensorData)
  }

  return box
}

// Send box script to user via email
function sendWelcomeMail (user, box) {
  var templatePath = './templates/registration.html'
  var templateContent = fs.readFileSync(templatePath, encoding = 'utf8')
  var template = _.template(templateContent)
  var compiled = template({ 'user': user, 'box': box })

  var transporter = nodemailer.createTransport(smtpTransport({
    host: cfg.email.host,
    port: cfg.email.port,
    secure: cfg.email.secure,
    auth: {
      user: cfg.email.user,
      pass: cfg.email.pass
    }
  }))
  transporter.use('compile', htmlToText())
  transporter.sendMail({
    from: {
      name: cfg.email.fromName,
      address: cfg.email.fromEmail
    },
    replyTo: {
      name: cfg.email.fromName,
      address: cfg.email.replyTo
    },
    to: {
      name: user.firstname + ' ' + user.lastname,
      address: user.email
    },
    subject: cfg.email.subject,
    template: 'registration',
    html: compiled,
    attachments: [
      {
        filename: 'sensebox.ino',
        path: cfg.targetFolder + box._id + '.ino'
      }
    ]
  }, function (err, info) {
    if (err) {
      logger.log.error('Email error')
      logger.log.error(err)
    }
    if (info) {
      logger.log.debug('Email sent successfully')
    }
  })
}
