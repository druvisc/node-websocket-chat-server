const WebSocket = require('ws')
const { log } = require('../utils')
const { session: wsSession, createMessageId } = require('./session')
const { MESSAGE_TYPE } = require('./types')

const sendMessage = (client, type, payload) => {
  const message = createMessage(type, payload)
  sendJson(client, message)
}

// {
//   type: 'MESSAGE',
//   payload: {
//     type: 'USER_CONNECTED',
//     payload: { users: [Array], message: [Object] }
//   }
// }
const createMessage = (type, payload) => ({
  type: MESSAGE_TYPE.MESSAGE,
  payload: {
    type,
    payload: {
      ...payload,
      message: {
        ...payload.message,
        type,
        id: createMessageId(),
        date: new Date()
      }
    }
  }
})

const sendJson = (client, json) => {
  // log('sendJson() json:', json)
  // Throw invalid JSON.
  const string = JSON.stringify(json)
  _send(client, string)
}

const _send = (client, string) =>
  client.readyState === WebSocket.OPEN && client.send(string)

const broadcastMessage = (clients, type, payload) => {
  const message = createMessage(type, payload)
  broadcastJson(message, clients)
}

const broadcastJson = (json, clients) => {
  // log('broadcastJson() json:', json)
  // Throw invalid JSON.
  const string = JSON.stringify(json)
  _broadcast(string, clients)
}

const _broadcast = (string, clients) =>
  clients.forEach(client => _send(client, string))

const closeConnection = (client, code, reason) => {
  const session = wsSession.get(client)
  const signature = `${session.username} (${client._socket._peername.address})`
  wsSession.delete(client)
  log(`CLOSE CONNECTION ${signature}: ${code} - ${reason}`)
  client.close(code, reason)
}

module.exports = {
  createMessage,
  sendMessage,
  broadcastMessage,
  closeConnection
}
