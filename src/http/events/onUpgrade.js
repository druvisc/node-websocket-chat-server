const { session: wsSession, createSession } = require('../../websocket/session')
const { server: wsServer } = require('../../websocket')
const { log } = require('../../utils')
const { session: httpSession } = require('../session')

const onUpgrade = (req, socket, head) => {
  log(`UPGRADING (${req.headers.host})`)
  log(`httpSession:`, [...httpSession.values()])
  const session = httpSession.get(req.headers.host)
  if (!session) {
    log(`UPGRADE ERROR: No session.`)
    return socket.destroy()
  }

  const { username } = session
  const signature = `'${username}' (${req.headers.host})`
  log(`UPGRADE ${signature}`)
  wsServer.handleUpgrade(req, socket, head, client => {
    const socketSession = createSession({ username })
    wsSession.set(client, socketSession)
    log(`WS session created for ${signature}`)
    httpSession.delete(req.headers.host)
    log(`HTTP session deleted for ${signature}`)
    wsServer.emit('connection', client, req)
  })
}

module.exports = onUpgrade
