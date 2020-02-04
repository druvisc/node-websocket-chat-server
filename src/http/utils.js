const { promisify } = require('../utils')

const getRequestBodyJson = req =>
  promisify((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req
      .on('error', error => reject(error))
      .on('data', data => (body += data))
      .on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(new Error('Invalid JSON.'))
        }
      })
  })

const Options = (res, methods) =>
  res
    .writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': methods.join(', ')
    })
    .end()

const Ok = (res, body) => reply({ res, code: 200, body })
const BadRequest = (res, body) =>
  reply({ res, code: 400, body: { error: 'Invalid request.' } })
const Unauthorized = (res, body) => reply({ res, code: 401, body })

const reply = ({ res, code, body, headers = Headers() }) => {
  res.writeHead(code, headers)
  body && res.write(JSON.stringify(body))
  res.end()
}

const Headers = () => ({
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
})

module.exports = {
  getRequestBodyJson,
  Options,
  Ok,
  BadRequest,
  Unauthorized
}
