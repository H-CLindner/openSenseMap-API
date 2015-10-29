config = {}
config.server = {}
config.mongo = {}

// general configuration properties
config.targetFolder = '/var/OpenSenseMap-API/usersketches/'
config.imageFolder = '/var/www/OpenSenseMap/app/userimages/'

// server configuration properties
config.server.name = ''
config.server.version = ''
config.server.port = ''

// mongodb configuration properties
config.mongo.server = ''
config.mongo.port = ''
config.mongo.collection = ''
config.mongo.dbuser = ''
config.mongo.dbuserpass = ''

// email configuration properties
config.email = {}
config.email.host = ''
config.email.port = 465
config.email.secure = true
config.email.user = ''
config.email.pass = ''
config.email.fromName = ''
config.email.fromEmail = ''
config.email.replyTo = ''
config.email.subject = ''

module.exports = config
