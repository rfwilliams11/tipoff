/**
 * Simple logger utility that respects NODE_ENV
 * Only logs in development mode unless it's an error
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

const logger = {
  // Debug logs - only in development
  debug: (...args) => {
    if (isDevelopment && !isTest) {
      console.log('[DEBUG]', ...args)
    }
  },

  // Info logs - only in development
  info: (...args) => {
    if (isDevelopment && !isTest) {
      console.log('[INFO]', ...args)
    }
  },

  // Warning logs - always show unless in test
  warn: (...args) => {
    if (!isTest) {
      console.warn('[WARN]', ...args)
    }
  },

  // Error logs - always show
  error: (...args) => {
    console.error('[ERROR]', ...args)
  }
}

module.exports = logger
