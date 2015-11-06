module.exports.isEmptyObject = function (obj) {
  return !Object.keys(obj).length
}

module.exports.decodeBase64Image = function (dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  var response = {}

  if (matches.length !== 3) {
    return new Error('Invalid input string')
  }

  response.type = matches[1]
  response.data = new Buffer(matches[2], 'base64')

  return response
}
