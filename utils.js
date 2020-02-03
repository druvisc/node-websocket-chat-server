const log = (...args) => console.log(`[${getTimestamp()}] LOG:`, ...args)
const info = (...args) => console.info(`[${getTimestamp()}] INFO:`, ...args)
const error = (...args) => console.error(`[${getTimestamp()}] ERROR:`, ...args)
const warn = (...args) => console.warn(`[${getTimestamp()}] WARN:`, ...args)

const getTimestamp = (date = new Date()) => `${date.toLocaleTimeString()} ${date.toLocaleDateString()}`

const getRequestBodyJson = req => promisify((resolve, reject) => {
  let body = ''
  req.setEncoding('utf8')
  req.on('error', error => reject(error))
    .on('data', data => body += data)
    .on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('Invalid JSON.'))
      }
    })
})

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
  log, info, error, warn,
  getTimestamp,
  getRequestBodyJson,
  promisify
}
