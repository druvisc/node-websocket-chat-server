const { broadcastMessage, closeConnection } = require('../websocket/utils')
const { CLOSE_CODE } = require('../websocket/const')
const { MESSAGE } = require('../websocket/types')
const { SHUT_DOWN_FORCEFULLY_TIMEOUT } = require('../config')
const { server: wsServer } = require('../websocket')
const { server: httpServer } = require('../http')
const { info, error } = require('../utils')

const attachProcessListeners = () => {
  const signals = ['SIGINT', 'SIGTERM']
  signals.forEach(signal =>
    process.on(signal, () => {
      info(signal)
      exit()
    })
  )
}

const exit = () => {
  info(`exit() called, shutting down the server.`)
  const code = CLOSE_CODE.GOING_AWAY
  const reason = `The chat server is shutting down.`

  broadcastMessage(wsServer.clients, MESSAGE.SERVER_MESSAGE, {
    message: {
      message: reason
    }
  })

  httpServer.close(err => {
    if (err) {
      error(`exit() faced an error shutting down the HTTP server:`, err)
      error(
        `Shutting down forcefully after ${SHUT_DOWN_FORCEFULLY_TIMEOUT /
          1000}s.`
      )
      setTimeout(() => process.exit(1), SHUT_DOWN_FORCEFULLY_TIMEOUT)
    }
  })

  wsServer.clients.forEach(client => {
    closeConnection(client, code, reason)
  })

  info(`Server graceully shut down.`)
  process.exit(0)
}

attachProcessListeners()
