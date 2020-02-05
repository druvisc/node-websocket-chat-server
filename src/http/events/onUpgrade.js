const { session: wsSession, createSession } = require('../../websocket/session')
const { server: wsServer } = require('../../websocket')
const { log } = require('../../utils')
const { session: httpSession } = require('../session')

const onUpgrade = (req, socket, head) => {
  log(`req:`, req)
  log(`socket:`, socket)

  log(`UPGRADING (${req.headers.origin})`)
  log(`httpSession keys:`, [...httpSession.keys()])
  log(`httpSession values:`, [...httpSession.values()])
  const session = httpSession.get(req.headers.origin)
  if (!session) {
    log(`UPGRADE ERROR: No session.`)
    return socket.destroy()
  }

  const { username } = session
  const signature = `'${username}' (${req.headers.origin})`
  log(`UPGRADE ${signature}`)
  wsServer.handleUpgrade(req, socket, head, client => {
    const socketSession = createSession({ username })
    wsSession.set(client, socketSession)
    log(`WS session created for ${signature}`)
    httpSession.delete(req.headers.origin)
    log(`HTTP session deleted for ${signature}`)
    wsServer.emit('connection', client, req)
  })
}

module.exports = onUpgrade
