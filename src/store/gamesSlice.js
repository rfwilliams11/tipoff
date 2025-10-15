const { createSlice } = require('@reduxjs/toolkit')
const { fetchGameDetail, pollGameUpdates } = require('./thunks/gamesThunks')
const { MAX_PLAYS_HISTORY, MAX_CACHED_GAMES } = require('./constants/memory')

// Initial state
const initialState = {
  loading: false,
  error: null,
  selectedId: null,
  games: {}, // Store games by ID
  pollingIntervals: {}, // Track polling intervals by game ID
  lastPolled: {},
  memoryStats: {
    totalGames: 0,
    totalPlays: 0,
    lastCleanup: null
  }
}

// Games slice
const gamesSlice = createSlice({
  name: 'games',
  initialState,
  reducers: {
    // Game selection
    selectGame: (state, action) => {
      state.selectedId = action.payload
    },

    clearSelectedGame: (state) => {
      state.selectedId = null
    },

    // Polling management
    startPolling: (state, action) => {
      const { gameId, interval } = action.payload
      state.pollingIntervals[gameId] = interval
    },

    stopPolling: (state, action) => {
      const gameId = action.payload
      delete state.pollingIntervals[gameId]
      delete state.lastPolled[gameId]
    },

    stopAllPolling: (state) => {
      state.pollingIntervals = {}
      state.lastPolled = {}
    },

    // Update polling interval for a game
    updatePollingInterval: (state, action) => {
      const { gameId, interval } = action.payload
      if (state.pollingIntervals[gameId] && state.pollingIntervals[gameId] !== interval) {
        state.pollingIntervals[gameId] = interval
      }
    },

    // Clear error
    clearError: (state) => {
      state.error = null
    },

    // Remove old game data to manage memory
    cleanupOldGames: (state, action) => {
      const activeGameIds = action.payload || []
      const gameIds = Object.keys(state.games)
      let cleanedGames = 0
      let cleanedPlays = 0

      gameIds.forEach(gameId => {
        if (!activeGameIds.includes(gameId)) {
          const game = state.games[gameId]
          if (game && game.liveData && game.liveData.plays) {
            cleanedPlays += game.liveData.plays.length
          }
          delete state.games[gameId]
          delete state.pollingIntervals[gameId]
          delete state.lastPolled[gameId]
          cleanedGames++
        }
      })

      // Update memory stats
      state.memoryStats.totalGames = Object.keys(state.games).length
      state.memoryStats.totalPlays = Object.values(state.games).reduce((total, game) => {
        return total + (game.liveData?.plays?.length || 0)
      }, 0)
      state.memoryStats.lastCleanup = new Date().toISOString()
    },

    // Limit play-by-play history for memory management
    limitPlayHistory: (state, action) => {
      const { gameId, maxPlays = MAX_PLAYS_HISTORY } = action.payload
      const game = state.games[gameId]

      if (game && game.liveData && game.liveData.plays && game.liveData.plays.length > maxPlays) {
        game.liveData.plays = game.liveData.plays.slice(0, maxPlays)

        // Update memory stats
        state.memoryStats.totalPlays = Object.values(state.games).reduce((total, game) => {
          return total + (game.liveData?.plays?.length || 0)
        }, 0)
      }
    },

    // Automatic memory cleanup based on cache size
    performMemoryCleanup: (state) => {
      const gameIds = Object.keys(state.games)

      // If we have too many games, remove the oldest non-active ones
      if (gameIds.length > MAX_CACHED_GAMES) {
        const activeGameIds = Object.keys(state.pollingIntervals)
        const inactiveGames = gameIds
          .filter(id => !activeGameIds.includes(id))
          .map(id => ({
            id,
            lastUpdated: state.games[id].lastUpdated || '1970-01-01T00:00:00.000Z'
          }))
          .sort((a, b) => new Date(a.lastUpdated) - new Date(b.lastUpdated))

        const gamesToRemove = Math.max(0, gameIds.length - MAX_CACHED_GAMES)
        const removedGames = inactiveGames.slice(0, gamesToRemove)

        let cleanedPlays = 0
        removedGames.forEach(({ id }) => {
          const game = state.games[id]
          if (game && game.liveData && game.liveData.plays) {
            cleanedPlays += game.liveData.plays.length
          }
          delete state.games[id]
          delete state.pollingIntervals[id]
          delete state.lastPolled[id]
        })

        // Update memory stats
        state.memoryStats.totalGames = Object.keys(state.games).length
        state.memoryStats.totalPlays = Object.values(state.games).reduce((total, game) => {
          return total + (game.liveData?.plays?.length || 0)
        }, 0)
        state.memoryStats.lastCleanup = new Date().toISOString()
      }

      // Limit play history for all games - keep most recent plays
      gameIds.forEach(gameId => {
        const game = state.games[gameId]
        if (game && game.liveData && game.liveData.plays && game.liveData.plays.length > MAX_PLAYS_HISTORY) {
          game.liveData.plays = game.liveData.plays.slice(-MAX_PLAYS_HISTORY)
        }
      })

      // Update final memory stats
      state.memoryStats.totalPlays = Object.values(state.games).reduce((total, game) => {
        return total + (game.liveData?.plays?.length || 0)
      }, 0)
    }
  },

  extraReducers: (builder) => {
    builder
      // Handle fetchGameDetail pending
      .addCase(fetchGameDetail.pending, (state) => {
        state.loading = true
        state.error = null
      })

      // Handle fetchGameDetail fulfilled
      .addCase(fetchGameDetail.fulfilled, (state, action) => {
        state.loading = false
        state.error = null

        if (action.payload) {
          const { gameId } = action.payload

          // Limit play-by-play history before storing - keep most recent plays
          if (action.payload.liveData && action.payload.liveData.plays && action.payload.liveData.plays.length > MAX_PLAYS_HISTORY) {
            action.payload.liveData.plays = action.payload.liveData.plays.slice(-MAX_PLAYS_HISTORY)
          }

          state.games[gameId] = action.payload
          state.lastPolled[gameId] = new Date().toISOString()

          // Update memory stats
          state.memoryStats.totalGames = Object.keys(state.games).length
          state.memoryStats.totalPlays = Object.values(state.games).reduce((total, game) => {
            return total + (game.liveData?.plays?.length || 0)
          }, 0)

          // Perform automatic cleanup if needed
          if (Object.keys(state.games).length > MAX_CACHED_GAMES) {
            // Trigger cleanup on next action
            setTimeout(() => {
              // This will be handled by middleware or component effect
            }, 0)
          }
        }
      })

      // Handle fetchGameDetail rejected
      .addCase(fetchGameDetail.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.message || 'Failed to fetch game details'
      })

      // Handle pollGameUpdates fulfilled
      .addCase(pollGameUpdates.fulfilled, (state, action) => {
        if (action.payload) {
          const { gameId, updates, shouldStopPolling } = action.payload

          if (shouldStopPolling) {
            // Game is completed, stop polling
            delete state.pollingIntervals[gameId]
            console.log(`Game ${gameId} completed, stopped polling`)
            return
          }

          if (state.games[gameId] && updates) {
            // Limit play-by-play history before updating - keep most recent plays
            if (updates.liveData && updates.liveData.plays && updates.liveData.plays.length > MAX_PLAYS_HISTORY) {
              updates.liveData.plays = updates.liveData.plays.slice(-MAX_PLAYS_HISTORY)
            }

            // Update game data with fresh information
            state.games[gameId] = {
              ...state.games[gameId],
              gameData: updates.gameData,
              liveData: updates.liveData,
              lastUpdated: updates.lastUpdated
            }
            state.lastPolled[gameId] = new Date().toISOString()

            // Update memory stats
            state.memoryStats.totalPlays = Object.values(state.games).reduce((total, game) => {
              return total + (game.liveData?.plays?.length || 0)
            }, 0)

          }
        }
      })

      // Handle pollGameUpdates rejected
      .addCase(pollGameUpdates.rejected, (state, action) => {
        // Don't set loading error for polling failures
        // If polling fails too many times, it will be handled by the polling service
      })
  }
})

// Actions
const {
  selectGame,
  clearSelectedGame,
  startPolling,
  stopPolling,
  stopAllPolling,
  updatePollingInterval,
  clearError,
  cleanupOldGames,
  limitPlayHistory,
  performMemoryCleanup
} = gamesSlice.actions

// Export the reducer as default
module.exports = gamesSlice.reducer

// Export named exports - actions
module.exports.selectGame = selectGame
module.exports.clearSelectedGame = clearSelectedGame
module.exports.startPolling = startPolling
module.exports.stopPolling = stopPolling
module.exports.stopAllPolling = stopAllPolling
module.exports.updatePollingInterval = updatePollingInterval
module.exports.clearError = clearError
module.exports.cleanupOldGames = cleanupOldGames
module.exports.limitPlayHistory = limitPlayHistory
module.exports.performMemoryCleanup = performMemoryCleanup

// Export thunks
module.exports.fetchGameDetail = fetchGameDetail
module.exports.pollGameUpdates = pollGameUpdates

// Export selectors
const selectors = require('./selectors/gamesSelectors')
Object.assign(module.exports, selectors)
