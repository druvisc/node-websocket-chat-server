const { isUsernameTaken } = require('../../websocket/session')
const { MAX_USERNAME } = require('../../config')
const { log } = require('../../utils')
const {
  Options,
  getRequestBodyJson,
  BadRequest,
  Unauthorized,
  Ok
} = require('../utils')
const { session: httpSession } = require('../session')

const LoginMethods = ['OPTIONS', 'POST']
const Login = async (req, res) => {
  switch (req.method) {
    case 'OPTIONS':
      return Options(res, LoginMethods)
    case 'POST': {
      let body
      try {
        body = await getRequestBodyJson(req)
      } catch (err) {
        return BadRequest(res, { error: err.message })
      }

      const username = body.username
      if (!username) return BadRequest(res, { error: `No username provided.` })
      if (username.length > MAX_USERNAME)
        return BadRequest(res, {
          error: `Username too long (max length ${MAX_USERNAME}).`
        })

      const usernameTaken = isUsernameTaken(username)
      if (usernameTaken)
        return Unauthorized(res, { error: `Username '${username}' is taken.` })

      httpSession.set(req.connection.remoteAddress, { username })
      const signature = `'${username}' (${req.connection.remoteAddress})`
      log(`HTTP session created for '${signature}' `)
      log(`httpSession keys:`, [...httpSession.keys()])
      log(`httpSession values:`, [...httpSession.values()])

      return Ok(res, { username })
    }
    default:
      return BadRequest(res)
  }
}

module.exports = Login
