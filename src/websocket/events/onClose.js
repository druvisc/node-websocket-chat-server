const { log } = require('../../utils')
const { session: wsSession, getUsernames } = require('../session')
const { broadcastMessage } = require('../utils')
const { MESSAGE } = require('../types')

const onClose = ({ server, client, signature }) => {
  const session = wsSession.get(client)
  if (!session || session.isDisconnected) return

  wsSession.delete(client)
  log(`CLIENT CLOSE ${signature}`)
  broadcastMessage(server.clients, MESSAGE.USER_DISCONNECTED, {
    users: getUsernames(),
    message: {
      username: session.username,
      message: `${session.username} disconnected.`
    }
  })
}

module.exports = {
  onClose
}
