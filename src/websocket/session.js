const { SERVER_USERNAME, RATE_PER_SECOND } = require('../config')

const session = new Map()

const isUsernameTaken = username =>
  username === SERVER_USERNAME ||
  [...session.values()].some(s => s.username === username)

const getUsernames = () => [...session.values()].map(s => s.username)

const createSession = ({ username }) => ({
  username,
  lastActive: new Date(),
  rate: {
    lastChecked: new Date(),
    allowance: RATE_PER_SECOND,
    strikes: 0
  },
  get isRateExceeded() {
    const now = new Date()
    const timePassed = now.getTime() - this.rate.lastChecked.getTime()

    this.rate.lastChecked = now
    this.rate.allowance = Math.min(
      this.rate.allowance + (timePassed / 1000) * RATE_PER_SECOND,
      RATE_PER_SECOND
    )

    if (this.rate.allowance < 1) {
      this.rate.strikes++
      return true
    }

    this.rate.allowance -= 1
    return false
  }
})

let messageId = 1
const createMessageId = () => messageId++

module.exports = {
  session,
  isUsernameTaken,
  getUsernames,
  createSession,
  createMessageId
}
