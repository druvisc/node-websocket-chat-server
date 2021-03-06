const MESSAGE_TYPE = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  MESSAGE: 'MESSAGE'
}

const ERROR = {
  EXCEEDS_PAYLOAD: 'EXCEEDS_PAYLOAD',
  INVALID_MESSAGE: 'INVALID_MESSAGE'
}

const WARNING = {
  EXCEEDS_RATE_LIMIT: 'EXCEEDS_RATE_LIMIT'
}

const MESSAGE = {
  USER_CONNECTED: 'USER_CONNECTED',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_DISCONNECTED: 'USER_DISCONNECTED',
  USER_MESSAGE: 'USER_MESSAGE',
  SERVER_MESSAGE: 'SERVER_MESSAGE'
}

module.exports = {
  MESSAGE_TYPE,
  ERROR,
  WARNING,
  MESSAGE
}
