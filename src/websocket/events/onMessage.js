const { log } = require('../../utils')
const {
  USE_STRIKES_FOR_RATE,
  RATE_PER_SECOND,
  ALLOWED_STRIKES,
  MAX_PAYLOAD
} = require('../../config')
const { broadcastMessage, sendMessage, closeConnection } = require('../utils')
const { session: wsSession, getUsernames } = require('../session')
const { MESSAGE, WARNING, ERROR } = require('../types')
const { CLOSE_CODE } = require('../const')

const onMessage = ({ server, client, message, signature }) => {
  const session = wsSession.get(client)

  if (session.isRateExceeded) {
    log(`CLIENT ${signature} exceeded the rate limit`)
    if (!USE_STRIKES_FOR_RATE) return

    const message = `Rate limit of ${RATE_PER_SECOND} messages/second exceeded. Strike ${session.rate.strikes}/${ALLOWED_STRIKES}.`

    if (session.rate.strikes === ALLOWED_STRIKES) {
      log(`CLIENT ${signature} exceeded the strike limit`)

      closeConnection(client, CLOSE_CODE.POLICY_VIOLATION, message)
      return broadcastMessage(server.clients, MESSAGE.USER_DISCONNECTED, {
        users: getUsernames(),
        message: {
          username: session.username,
          message: `${session.username} was kicked out for spamming.`
        }
      })
    }

    sendMessage(client, MESSAGE.SERVER_MESSAGE, {
      message: {
        type: WARNING.EXCEEDS_RATE_LIMIT,
        message
      }
    })
  }

  if (message.length > MAX_PAYLOAD)
    return sendMessage(client, MESSAGE.SERVER_MESSAGE, {
      message: {
        type: ERROR.EXCEEDS_PAYLOAD,
        message: `Message exceeds maximum payload of ${MAX_PAYLOAD}.`
      }
    })

  // No need, the message is never set directly in HTML or evaluated.
  const regEx = '' // /(<([^>]+)>)/ig
  const parsed = message.replace(regEx, '')
  if (parsed !== message)
    return sendMessage(client, MESSAGE.SERVER_MESSAGE, {
      message: {
        type: ERROR.INVALID_MESSAGE,
        message: `Invalid message. It does not pass '${regEx}'.`
      }
    })

  session.lastActive = new Date()

  log(`${session.username}: ${parsed}`)
  return broadcastMessage(server.clients, MESSAGE.USER_MESSAGE, {
    message: {
      username: session.username,
      message: parsed
    }
  })
}

module.exports = onMessage
