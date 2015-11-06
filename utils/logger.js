// TODO setup bunyan logger
var Stream = require('stream')
/*
  Logging
*/
var consoleStream = new Stream()
consoleStream.writable = true
consoleStream.write = function (obj) {
  if (obj.req) {
    console.log(obj.time, obj.req.remoteAddress, obj.req.method, obj.req.url)
  } else if (obj.msg) {
    console.log(obj.time, obj.msg)
  } else {
    // console.log(obj.time, obj)
  }
}

var Logger = require('bunyan')
module.exports.reqlog = new Logger.createLogger({
  name: 'OSeM-API',
  streams: [
    { path: './request.log', type: 'rotating-file', period: '1w', count: 8 },
    { level: 'debug', type: 'raw', stream: consoleStream }
  ],
  serializers: {
    err: Logger.stdSerializers.err,
    req: Logger.stdSerializers.req,
    res: Logger.stdSerializers.res
  }
})
module.exports.log = new Logger.createLogger({
  name: 'OSeM-API',
  streams: [
    { level: 'error', path: './request-error.log', type: 'rotating-file', period: '1w', count: 8 },
    { level: 'debug', type: 'raw', stream: consoleStream }
  ],
  serializers: {
    err: Logger.stdSerializers.err,
    req: Logger.stdSerializers.req,
    res: Logger.stdSerializers.res
  }
})
