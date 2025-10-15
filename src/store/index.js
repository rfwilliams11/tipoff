const { configureStore } = require('@reduxjs/toolkit')
const scoreboardReducer = require('./scoreboardSlice')
const gamesReducer = require('./gamesSlice')
const { pollingMiddleware, pollingIntervalMiddleware } = require('./pollingMiddleware')
const { createMemoryMonitoringMiddleware } = require('../utils/memoryManager')
const { errorHandlingMiddleware } = require('./middleware/errorHandling')
const { retryMiddleware } = require('./middleware/retry')

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
