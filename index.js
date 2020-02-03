const WebSocket = require('ws')
const http = require('http')
const {
  log, info, error, warn,
  getRequestBodyJson,
} = require('./utils')
const { TYPE, ERROR, WARNING, MESSAGE, } = require('./types')
const { CLOSE_CODE } = require('./const')
const CONFIG = require('./config')

const wsServer = new WebSocket.Server({ noServer: true })

/** HTTP SERVER */
const port = process.env.PORT || CONFIG.DEFAULT_PORT
const host = process.env.HOST || CONFIG.DEFAULT_HOST

const httpSession = new Map() // Used only until a ws connection is established.

const api = (req, res) => {
  log(`${req.method} ${req.url}`)
  switch (req.url) {
    case '/login': return Login(req, res)
    default: return BadRequest(res)
  }
}

const httpServer = http.createServer(api).listen(port, host, onListening = () =>
  info(`HTTP and WS server running at http://${host}:${port}/`)
)

const LoginMethods = ['OPTIONS', 'POST']
const Login = async (req, res) => {
  switch (req.method) {
    case 'OPTIONS': return Options(res, LoginMethods)
    case 'POST': {
      let body
      try {
        body = await getRequestBodyJson(req)
      } catch (err) {
        return BadRequest(res, { error: err.message })
      }

      const username = body.username
      if (!username) return BadRequest(res, { error: `No username provided.` })
      if (username.length > CONFIG.MAX_USERNAME) return BadRequest(res, { error: `Username too long (max length ${CONFIG.MAX_USERNAME}).` })

      const usernameTaken = isUsernameTaken(username)
      if (usernameTaken) return Unauthorized(res, { error: `Username '${username}' is taken.` })

      httpSession.set(req.headers.host, { username })
      log(`HTTP session created for '${username}'`)

      return Ok(res, { username })
    }
    default: return BadRequest(res)
  }
}

const Options = (res, methods) => res.writeHead(200, {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': methods.join(', ')
}).end()

const Ok = (res, body) => reply({ res, code: 200, body })
const BadRequest = (res, body) => reply({ res, code: 400, body: { error: 'Invalid request.' } })
const Unauthorized = (res, body) => reply({ res, code: 401, body })

const reply = ({ res, code, body, headers = Headers() }) => {
  res.writeHead(code, headers)
  body && res.write(JSON.stringify(body))
  res.end()
}

const Headers = () => ({
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
})

httpServer.on('upgrade', (req, socket, head) => {
  const session = httpSession.get(req.headers.host)
  if (!session) {
    log(`UPGRADE ERROR: No session.`)
    return socket.destroy()
  }

  const username = session.username
  log(`UPGRADE`, username)

  wsServer.handleUpgrade(req, socket, head, client => {
    const socketSession = createSession({ username })
    wsSession.set(client, socketSession) // Move session to socket.
    log(`WS session created for '${username}'`)
    httpSession.delete(req.headers.host)
    log(`HTTP session deleted for '${username}'`)
    wsServer.emit('connection', client, req)
  })
})
/** HTTP SERVER */

/** WEBSOCKET SERVER */
const wsSession = new Map()
attachProcessListeners()

let messageId = 1
const createMessageId = () => messageId++

const createSession = ({ username }) => ({
  username,
  lastActive: new Date(),
  rate: {
    lastChecked: new Date(),
    allowance: CONFIG.RATE_PER_SECOND,
    strikes: 0,
  },
  get isRateExceeded() {
    const now = new Date()
    const timePassed = now.getTime() - this.rate.lastChecked.getTime()

    this.rate.lastChecked = now
    this.rate.allowance = Math.min(
      this.rate.allowance + (timePassed / 1000) * CONFIG.RATE_PER_SECOND,
      CONFIG.RATE_PER_SECOND
    )

    if (this.rate.allowance < 1) {
      this.rate.strikes++
      return true
    }

    this.rate.allowance -= 1
    return false
  }
})

wsServer.on('connection', (client, req) => {
  const session = wsSession.get(client)
  if (!session) {
    log(`CONNECTION ERROR: No session.`)
    return client.destroy()
  }

  const signature = `${session.username} (${req.connection.remoteAddress})`
  log(`CLIENT CONNECTION ${signature}`)

  broadcastMessage(MESSAGE.USER_CONNECTED, {
    users: getUsernames(),
    message: {
      username: session.username,
      message: `${session.username} connected.`,
    },
  })

  client.on('close', () => {
    if (session.disconnected) return

    log(`CLIENT CLOSE ${signature}`)
    wsSession.delete(client)

    broadcastMessage(MESSAGE.USER_DISCONNECTED, {
      users: getUsernames(),
      message: {
        username: session.username,
        message: `${session.username} disconnected.`,
      },
    })
  })

  client.on('message', message => {
    if (session.isRateExceeded) {
      log(`CLIENT ${signature} exceeded the rate limit`)
      if (!CONFIG.USE_STRIKES_FOR_RATE) return

      const message = `Rate limit of ${CONFIG.RATE_PER_SECOND} messages/second exceeded. Strike ${session.rate.strikes}/${CONFIG.ALLOWED_STRIKES}.`

      if (session.rate.strikes === CONFIG.ALLOWED_STRIKES) {
        log(`CLIENT ${signature} exceeded the strike limit`)
        const username = session.username

        closeConnection(client, CLOSE_CODE.POLICY_VIOLATION, message)
        return broadcastMessage(MESSAGE.USER_DISCONNECTED, {
          users: getUsernames(),
          message: {
            username: session.username,
            message: `${username} was kicked out for spamming.`
          },
        })
      }

      sendMessage(client, MESSAGE.SERVER_MESSAGE, {
        message: {
          type: WARNING.EXCEEDS_RATE_LIMIT,
          message,
        }
      })
    }

    if (message.length > CONFIG.MAX_PAYLOAD) return sendMessage(client, MESSAGE.SERVER_MESSAGE, {
      message: {
        type: ERROR.EXCEEDS_PAYLOAD,
        message: `Message exceeds maximum payload of ${CONFIG.MAX_PAYLOAD}.`
      }
    })

    // No need, the message is never set directly in HTML or evaluated.
    const regEx = '' // /(<([^>]+)>)/ig
    const parsed = message.replace(regEx, '')
    if (parsed !== message) return sendMessage(client, MESSAGE.SERVER_MESSAGE, {
      message: {
        type: ERROR.INVALID_MESSAGE,
        message: `Invalid message. It does not pass '${regEx}'.`,
      }
    })

    session.lastActive = new Date()

    log(`${session.username}: ${parsed}`)
    return broadcastMessage(MESSAGE.USER_MESSAGE, {
      message: {
        username: session.username,
        message: parsed,
      }
    })
  })
})

const isUsernameTaken = username => username === CONFIG.SERVER_USERNAME || [...wsSession.values()].some(s => s.username === username)
const getUsernames = () => [...wsSession.values()].map(s => s.username)

const broadcastMessage = (type, payload, clients) => {
  const message = createMessage(type, payload)
  broadcastJson(message, clients)
}

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
  type: TYPE.MESSAGE,
  payload: {
    type,
    payload: {
      ...payload,
      message: {
        ...payload.message,
        type,
        id: createMessageId(),
        date: new Date(),
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

const broadcastJson = (json, clients = wsServer.clients) => {
  // log('broadcastJson() json:', json)
  // Throw invalid JSON.
  const string = JSON.stringify(json)
  _broadcast(string, clients)
}

const _broadcast = (string, clients = wsServer.clients) =>
  clients.forEach(client => _send(client, string))

function attachProcessListeners() {
  ['SIGINT', 'SIGTERM'].forEach(sig =>
    process.on(sig, signal => {
      info(signal)
      exit()
    }))
}

function exit() {
  info(`exit() called, shutting down the server.`)
  const code = CLOSE_CODE.GOING_AWAY
  const reason = `The chat server is shutting down.`
  broadcastMessage(MESSAGE.SERVER_MESSAGE, {
    message: {
      message: reason,
    },
  })

  httpServer.close(err => {
    if (err) {
      error(`exit() faced an error shutting down the HTTP server:`, err)
      error(`Shutting down forcefully after ${CONFIG.SHUT_DOWN_FORCEFULLY_TIMEOUT / 1000}s.`)
      setTimeout(() => process.exit(1), CONFIG.SHUT_DOWN_FORCEFULLY_TIMEOUT)
    }
  })

  wsServer.clients.forEach(client => {
    closeConnection(client, code, reason)
  })

  info(`Server graceully shut down.`)
  process.exit(0)
}

function closeConnection(client, code, reason, ) {
  const session = wsSession.get(client)
  let signature = `(no session)`
  if (session) {
    session.disconnected = true
    signature = `${session.username} (${client._socket._peername.address})`
  }
  log(`CLOSE CONNECTION ${signature}: ${code} - ${reason}`)
  client.close(code, reason)
  wsSession.delete(client)
}

let inactivityInterval
if (CONFIG.USE_INACTIVITY_LIMIT) {
  inactivityInterval = setInterval(() => {
    // log(`Checking for inactive users.`)
    const now = new Date()
    const time = now.getTime()

    wsServer.clients.forEach(client => {
      const session = wsSession.get(client)
      if (!session.lastActive || session.lastActive.getTime() + CONFIG.INACTIVITY_LIMIT < time) {
        const username = session.username
        closeConnection(client, CLOSE_CODE.TRY_AGAIN_LATER, `Disconnected due to inactivity.`)
        broadcastMessage(MESSAGE.USER_INACTIVE, {
          users: getUsernames(),
          message: {
            username, username,
            message: `${username} was disconnected due to inactivity.`,
          }
        })
      }
    })
  }, CONFIG.CHECK_INACTIVITY_INTERVAL)
}