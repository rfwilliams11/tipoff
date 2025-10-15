// Enhanced middleware for async action retry logic
const logger = require('../../utils/logger')

const retryMiddleware = (store) => (next) => (action) => {
  // Handle retry logic for failed async actions
  if (action.type.endsWith('/rejected') && action.payload?.retryable) {
    const retryCount = action.meta?.retryCount || 0
    const maxRetries = 3

    if (retryCount < maxRetries) {
      // Calculate delay with exponential backoff and jitter
      const baseDelay = 1000 * Math.pow(2, retryCount)
      const jitter = baseDelay * 0.1 * Math.random()
      const delay = Math.min(baseDelay + jitter, 30000) // Max 30 seconds

      logger.warn(`Retrying failed action ${action.type} (attempt ${retryCount + 1}/${maxRetries}) in ${Math.round(delay)}ms`)

      setTimeout(() => {
        // Reconstruct the original action with retry metadata
        const originalAction = action.meta?.arg ? {
          type: action.type.replace('/rejected', ''),
          payload: action.meta.arg
        } : action.meta?.originalAction

        if (originalAction) {
          store.dispatch({
            ...originalAction,
            meta: {
              ...action.meta,
              retryCount: retryCount + 1,
              retryable: true,
              isRetry: true
            }
          })
        }
      }, delay)
    } else {
      logger.error(`Max retries (${maxRetries}) exceeded for action ${action.type}`)
    }
  }

  return next(action)
}

module.exports = {
  retryMiddleware
}
