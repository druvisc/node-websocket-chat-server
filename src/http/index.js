const http = require('http')
const { DEFAULT_HOST, DEFAULT_PORT } = require('../config')
const { info } = require('../utils')
const { onUpgrade } = require('./events')
const { api } = require('./api')

const host = process.env.HOST || DEFAULT_HOST
const port = process.env.PORT || DEFAULT_PORT

const server = http
  .createServer(api)
  .listen(port, host, () =>
    info(`HTTP and WS server running at http://${host}:${port}/`)
  )

server.on('upgrade', onUpgrade)

module.exports = {
  host,
  port,
  server
}
