const getReqRemoteAddress = req =>
  sanitizeRemoteAddress(
    req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null)
  )

const sanitizeRemoteAddress = ip => {
  if (!ip) return ip

  const isIPv4 = ip.startsWith('::ffff:')
  if (isIPv4) {
    const split = ip.split(':')
    return split[split.length - 1]
  }

  return ip
}

const getSocketRemoteAddress = socket => socket._socket.remoteAddress

const getTimestamp = (date = new Date()) =>
  `${date.toLocaleTimeString()} ${date.toLocaleDateString()}`

const log = (...args) => console.log(`[${getTimestamp()}] LOG:`, ...args)
const info = (...args) => console.info(`[${getTimestamp()}] INFO:`, ...args)
const error = (...args) => console.error(`[${getTimestamp()}] ERROR:`, ...args)
const warn = (...args) => console.warn(`[${getTimestamp()}] WARN:`, ...args)

const promisify = cb => {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  cb(resolve, reject)
  return promise
}

module.exports = {
  getReqRemoteAddress,
  getSocketRemoteAddress,
  log,
  info,
  error,
  warn,
  promisify
}
