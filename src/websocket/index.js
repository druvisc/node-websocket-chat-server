const WebSocket = require('ws')
const {
  USE_INACTIVITY_LIMIT,
  INACTIVITY_LIMIT,
  CHECK_INACTIVITY_INTERVAL
} = require('../config')
const { session: wsSession, getUsernames } = require('./session')
const { closeConnection, broadcastMessage } = require('./utils')
const { onConnection } = require('./events')
const { CLOSE_CODE } = require('./const')
const { MESSAGE } = require('./types')

const server = new WebSocket.Server({ noServer: true })
server.on('connection', (client, req) => {
  onConnection({ server, client, req })
})

let inactivityInterval
if (USE_INACTIVITY_LIMIT) setUpInactivityChecking()

function setUpInactivityChecking() {
  inactivityInterval = setInterval(() => {
    const now = new Date()
    const time = now.getTime()

    server.clients.forEach(client => {
      const session = wsSession.get(client)
      if (
        !session.lastActive ||
        session.lastActive.getTime() + INACTIVITY_LIMIT < time
      ) {
        closeConnection(
          client,
          CLOSE_CODE.TRY_AGAIN_LATER,
          `Disconnected due to inactivity.`
        )
        broadcastMessage(server.clients, MESSAGE.USER_INACTIVE, {
          users: getUsernames(),
          message: {
            username: session.username,
            message: `${session.username} was disconnected due to inactivity.`
          }
        })
      }
    })
  }, CHECK_INACTIVITY_INTERVAL)
}

module.exports = {
  server
}
