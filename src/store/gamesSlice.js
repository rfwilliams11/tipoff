const { createSlice, createAsyncThunk, createSelector } = require('@reduxjs/toolkit')
const { fetchGameDetailData, mapGameDetailResponse, validateApiResponse, getApiErrorMessage, isApiErrorRetryable } = require('../services/espnApi')

// Async thunk for fetching detailed game data
const fetchGameDetail = createAsyncThunk(
  'games/fetchGameDetail',
  async (gameId, { rejectWithValue }) => {
    try {
      // Fetch data from ESPN API
      const response = await fetchGameDetailData(gameId)
      
      // Validate response structure
      if (!validateApiResponse(response, 'gameDetail')) {
        throw new Error('Invalid game detail data received from ESPN API')
      }
      
      // Map ESPN response to internal format
      const gameDetail = mapGameDetailResponse(response)
      
      return {
        gameId,
        ...gameDetail,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      const isRetryable = isApiErrorRetryable(error)
      
      return rejectWithValue({
        message: errorMessage,
        retryable: isRetryable,
        errorInfo: error.errorInfo || null
      })
    }
  }
)

// Async thunk for polling live game updates
const pollGameUpdates = createAsyncThunk(
  'games/pollGameUpdates',
  async (gameId, { getState, rejectWithValue }) => {
    try {
      const state = getState()
      const game = state.games.games[gameId]
      
      if (!game) {
        throw new Error(`Game ${gameId} not found in state`)
      }
      
      if (game.gameData.status.completed) {
        // Don't poll completed games, return null to indicate no update needed
        return { gameId, shouldStopPolling: true }
      }
      
      // Fetch fresh game data using the same API as fetchGameDetail
      const response = await fetchGameDetailData(gameId)
      
      // Validate response structure
      if (!validateApiResponse(response, 'gameDetail')) {
        throw new Error('Invalid game detail data received during polling')
      }
      
      // Map ESPN response to internal format
      const gameDetail = mapGameDetailResponse(response)
      
      return {
        gameId,
        updates: {
          ...gameDetail,
          lastUpdated: new Date().toISOString()
        },
        shouldStopPolling: gameDetail.gameData.status.completed
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error)
      const isRetryable = isApiErrorRetryable(error)
      
      return rejectWithValue({
        message: errorMessage,
        retryable: isRetryable,
        errorInfo: error.errorInfo || null
      })
    }
  }
)

// Constants for memory management
const MAX_PLAYS_HISTORY = 50; // Limit play-by-play history
const MAX_CACHED_GAMES = 10; // Maximum number of games to keep in memory
const GAME_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

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
      console.log(`Started polling for game ${gameId} with interval ${interval}ms`)
    },
    
    stopPolling: (state, action) => {
      const gameId = action.payload
      delete state.pollingIntervals[gameId]
      delete state.lastPolled[gameId]
      console.log(`Stopped polling for game ${gameId}`)
    },
    
    stopAllPolling: (state) => {
      const pollingCount = Object.keys(state.pollingIntervals).length
      state.pollingIntervals = {}
      state.lastPolled = {}
      console.log(`Stopped all polling (${pollingCount} games)`)
    },
    
    // Update polling interval for a game
    updatePollingInterval: (state, action) => {
      const { gameId, interval } = action.payload
      if (state.pollingIntervals[gameId] && state.pollingIntervals[gameId] !== interval) {
        console.log(`Updated polling interval for game ${gameId}: ${state.pollingIntervals[gameId]}ms -> ${interval}ms`)
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
      
      console.log(`Cleaned up ${cleanedGames} old games and ${cleanedPlays} plays`)
    },
    
    // Limit play-by-play history for memory management
    limitPlayHistory: (state, action) => {
      const { gameId, maxPlays = MAX_PLAYS_HISTORY } = action.payload
      const game = state.games[gameId]
      
      if (game && game.liveData && game.liveData.plays && game.liveData.plays.length > maxPlays) {
        const originalLength = game.liveData.plays.length
        game.liveData.plays = game.liveData.plays.slice(0, maxPlays)
        console.log(`Limited play history for game ${gameId}: ${originalLength} -> ${maxPlays} plays`)
        
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
        
        console.log(`Auto-cleanup: removed ${removedGames.length} games and ${cleanedPlays} plays`)
      }
      
      // Limit play history for all games
      gameIds.forEach(gameId => {
        const game = state.games[gameId]
        if (game && game.liveData && game.liveData.plays && game.liveData.plays.length > MAX_PLAYS_HISTORY) {
          game.liveData.plays = game.liveData.plays.slice(0, MAX_PLAYS_HISTORY)
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
          
          // Limit play-by-play history before storing
          if (action.payload.liveData && action.payload.liveData.plays) {
            action.payload.liveData.plays = action.payload.liveData.plays.slice(0, MAX_PLAYS_HISTORY)
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
            // Limit play-by-play history before updating
            if (updates.liveData && updates.liveData.plays) {
              updates.liveData.plays = updates.liveData.plays.slice(0, MAX_PLAYS_HISTORY)
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
            
            console.log(`Updated game ${gameId} via polling`)
          }
        }
      })
      
      // Handle pollGameUpdates rejected
      .addCase(pollGameUpdates.rejected, (state, action) => {
        // Don't set loading error for polling failures, just log them
        const gameId = action.meta?.arg
        console.warn(`Polling failed for game ${gameId}:`, action.payload?.message)
        
        // If polling fails too many times, we might want to stop it
        // This will be handled by the polling service
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

// Basic selectors
const selectGamesState = (state) => state.games
const selectSelectedGameId = (state) => state.games.selectedId
const selectIsLoading = (state) => state.games.loading
const selectError = (state) => state.games.error
const selectAllGames = (state) => state.games.games
const selectPollingIntervals = (state) => state.games.pollingIntervals
const selectMemoryStats = (state) => state.games.memoryStats

// Memoized selectors for game data
const selectSelectedGame = createSelector(
  [selectAllGames, selectSelectedGameId],
  (games, selectedId) => selectedId ? games[selectedId] : null
)

const selectGameById = createSelector(
  [selectAllGames, (state, gameId) => gameId],
  (games, gameId) => games[gameId] || null
)

// Selectors for game statistics
const selectGameStatistics = createSelector(
  [selectSelectedGame],
  (game) => {
    if (!game) return null
    
    return {
      teams: game.gameData.teams,
      status: game.gameData.status,
      venue: game.gameData.venue,
      boxscore: game.liveData.boxscore
    }
  }
)

// Selectors for play-by-play data
const selectPlayByPlay = createSelector(
  [selectSelectedGame],
  (game) => {
    if (!game) return []
    return game.liveData.plays || []
  }
)

const selectCurrentPlay = createSelector(
  [selectSelectedGame],
  (game) => {
    if (!game) return null
    return game.liveData.currentPlay
  }
)

// Selector for recent plays (last N plays) - optimized for large lists
const selectRecentPlays = createSelector(
  [selectPlayByPlay, (state, count = 10) => count],
  (plays, count) => {
    if (!plays || plays.length === 0) return []
    return plays.slice(0, Math.min(count, plays.length))
  }
)

// Selector for visible plays with pagination
const selectVisiblePlays = createSelector(
  [selectPlayByPlay, (state, scrollPosition = 0, visibleLines = 20) => ({ scrollPosition, visibleLines })],
  (plays, { scrollPosition, visibleLines }) => {
    if (!plays || plays.length === 0) return []
    const startIndex = Math.max(0, scrollPosition)
    const endIndex = Math.min(plays.length, scrollPosition + visibleLines)
    return plays.slice(startIndex, endIndex)
  }
)

// Memoized selector for formatted game statistics
const selectFormattedGameStats = createSelector(
  [selectSelectedGame],
  (game) => {
    if (!game || !game.liveData || !game.liveData.boxscore) return null
    
    const boxscore = game.liveData.boxscore
    const teams = game.gameData.teams || []
    
    return {
      away: {
        team: teams[1],
        stats: boxscore.teams?.[1],
        formatted: {
          fieldGoals: `${boxscore.teams?.[1]?.fieldGoalsMade || 0}/${boxscore.teams?.[1]?.fieldGoalsAttempted || 0}`,
          fieldGoalPct: `${((boxscore.teams?.[1]?.fieldGoalPercentage || 0) * 100).toFixed(1)}%`,
          threePointers: `${boxscore.teams?.[1]?.threePointsMade || 0}/${boxscore.teams?.[1]?.threePointsAttempted || 0}`,
          threePointPct: `${((boxscore.teams?.[1]?.threePointPercentage || 0) * 100).toFixed(1)}%`,
          freeThrows: `${boxscore.teams?.[1]?.freeThrowsMade || 0}/${boxscore.teams?.[1]?.freeThrowsAttempted || 0}`,
          freeThrowPct: `${((boxscore.teams?.[1]?.freeThrowPercentage || 0) * 100).toFixed(1)}%`
        }
      },
      home: {
        team: teams[0],
        stats: boxscore.teams?.[0],
        formatted: {
          fieldGoals: `${boxscore.teams?.[0]?.fieldGoalsMade || 0}/${boxscore.teams?.[0]?.fieldGoalsAttempted || 0}`,
          fieldGoalPct: `${((boxscore.teams?.[0]?.fieldGoalPercentage || 0) * 100).toFixed(1)}%`,
          threePointers: `${boxscore.teams?.[0]?.threePointsMade || 0}/${boxscore.teams?.[0]?.threePointsAttempted || 0}`,
          threePointPct: `${((boxscore.teams?.[0]?.threePointPercentage || 0) * 100).toFixed(1)}%`,
          freeThrows: `${boxscore.teams?.[0]?.freeThrowsMade || 0}/${boxscore.teams?.[0]?.freeThrowsAttempted || 0}`,
          freeThrowPct: `${((boxscore.teams?.[0]?.freeThrowPercentage || 0) * 100).toFixed(1)}%`
        }
      }
    }
  }
)

// Selector for live games that need polling
const selectLiveGames = createSelector(
  [selectAllGames],
  (games) => {
    return Object.values(games).filter(game => 
      game && !game.gameData.status.completed
    )
  }
)

// Selector for games currently being polled
const selectPolledGames = createSelector(
  [selectAllGames, selectPollingIntervals],
  (games, intervals) => {
    return Object.keys(intervals)
      .map(gameId => games[gameId])
      .filter(Boolean)
  }
)

// Selector to determine if a game should be polled
const selectShouldPollGame = createSelector(
  [selectGameById, (state, gameId) => gameId],
  (game) => {
    if (!game) return false
    return !game.gameData.status.completed
  }
)

module.exports = {
  fetchGameDetail,
  pollGameUpdates,
  selectGame,
  clearSelectedGame,
  startPolling,
  stopPolling,
  stopAllPolling,
  updatePollingInterval,
  clearError,
  cleanupOldGames,
  limitPlayHistory,
  performMemoryCleanup,
  selectGamesState,
  selectSelectedGameId,
  selectIsLoading,
  selectError,
  selectAllGames,
  selectPollingIntervals,
  selectMemoryStats,
  selectSelectedGame,
  selectGameById,
  selectGameStatistics,
  selectPlayByPlay,
  selectCurrentPlay,
  selectRecentPlays,
  selectVisiblePlays,
  selectFormattedGameStats,
  selectLiveGames,
  selectPolledGames,
  selectShouldPollGame,
  default: gamesSlice.reducer
}