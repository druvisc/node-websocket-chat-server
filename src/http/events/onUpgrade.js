const { session: wsSession, createSession } = require('../../websocket/session')
const { server: wsServer } = require('../../websocket')
const { log, getReqRemoteAddress } = require('../../utils')
const { session: httpSession } = require('../session')

const onUpgrade = (req, socket, head) => {
  const ip = getReqRemoteAddress(req)
  log(`UPGRADING (${ip})`)
  const session = httpSession.get(ip)
  if (!session) {
    log(`UPGRADE ERROR: No session.`)
    return socket.destroy()
  }

  const { username } = session
  const signature = `'${username}' (${ip})`
  log(`UPGRADE ${signature}`)
  wsServer.handleUpgrade(req, socket, head, client => {
    const socketSession = createSession({ username })
    wsSession.set(client, socketSession)
    log(`WS session created for ${signature}`)
    httpSession.delete(ip)
    log(`HTTP session deleted for ${signature}`)
    wsServer.emit('connection', client, req)
  })
}

module.exports = onUpgrade
