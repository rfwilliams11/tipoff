const { configureStore } = require('@reduxjs/toolkit')
const scoreboardReducer = require('./scoreboardSlice')
const gamesReducer = require('./gamesSlice')
const { pollingMiddleware, pollingIntervalMiddleware } = require('./pollingMiddleware')
const { createMemoryMonitoringMiddleware } = require('../utils/memoryManager')

// Custom middleware for error handling and logging
const errorHandlingMiddleware = (store) => (next) => (action) => {
  try {
    return next(action)
  } catch (error) {
    console.error('Redux action error:', error)
    // In a terminal app, we might want to show errors differently
    // but for now, we'll just log them
    return next({
      type: 'error/actionError',
      payload: { error: error.message, action: action.type }
    })
  }
}

// Enhanced middleware for async action retry logic
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
      
      console.warn(`Retrying failed action ${action.type} (attempt ${retryCount + 1}/${maxRetries}) in ${Math.round(delay)}ms`)
      
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
      console.error(`Max retries (${maxRetries}) exceeded for action ${action.type}`)
    }
  }
  
  return next(action)
}

// Configure the Redux store
const store = configureStore({
  reducer: {
    scoreboard: scoreboardReducer,
    games: gamesReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Configure default middleware options
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions (meta.arg may contain Date objects)
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: []
      },
      // Enable immutability check in development
      immutableCheck: process.env.NODE_ENV !== 'production'
    })
    .concat(errorHandlingMiddleware)
    .concat(retryMiddleware)
    .concat(pollingMiddleware)
    .concat(pollingIntervalMiddleware)
    .concat(createMemoryMonitoringMiddleware()),
  
  // Enable Redux DevTools in development
  devTools: process.env.NODE_ENV !== 'production'
})

// Export types for TypeScript support (if needed later)
const getState = store.getState
const dispatch = store.dispatch

module.exports = {
  store,
  getState,
  dispatch,
  default: store
}