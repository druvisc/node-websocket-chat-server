const http = require('http')
const { DEFAULT_PORT } = require('../config')
const { info } = require('../utils')
const { onUpgrade } = require('./events')
const { api } = require('./api')

const port = process.env.PORT || DEFAULT_PORT
const env = process.env.NODE_ENV || 'development'

const server = http.createServer(api).listen(port)
const address = server.address()
const host = env === 'development' ? 'localhost' : address.address

server.on('listening', () =>
  info(`HTTP and WS server in ${env} listening on http://${host}:${port}/`)
)

server.on('upgrade', onUpgrade)

module.exports = {
  port,
  server
}
