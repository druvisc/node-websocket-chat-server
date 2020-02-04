const { log } = require('../../utils')
const { BadRequest } = require('../utils')
const Login = require('./login')

const api = (req, res) => {
  log(`${req.method} ${req.url}`)
  switch (req.url) {
    case '/login':
      return Login(req, res)
    default:
      return BadRequest(res)
  }
}

module.exports = {
  api
}
