const { log } = require('../../utils')
const { session: wsSession, getUsernames } = require('../session')
const { broadcastMessage } = require('../utils')
const { MESSAGE } = require('../types')
const onMessage = require('./onMessage')
const onClose = require('./onClose')

const onConnection = ({ server, client, req }) => {
  const session = wsSession.get(client)
  if (!session) {
    log(`CONNECTION ERROR: No session.`)
    return client.destroy()
  }

  const signature = `'${session.username}' (${req.headers.origin})`
  log(`CLIENT CONNECTION ${signature}`)

  broadcastMessage(server.clients, MESSAGE.USER_CONNECTED, {
    users: getUsernames(),
    message: {
      username: session.username,
      message: `${session.username} connected.`
    }
  })

  client.on('close', () => {
    onClose({ server, client, signature })
  })

  client.on('message', message => {
    onMessage({ server, client, message, signature })
  })
}

module.exports = onConnection
