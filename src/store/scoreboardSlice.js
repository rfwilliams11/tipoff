const { createSlice, createAsyncThunk, createSelector } = require('@reduxjs/toolkit')
const { format, addDays, subDays, isToday, isAfter, isBefore, startOfDay } = require('date-fns')
const { fetchScoreboardData, mapScoreboardResponse, validateApiResponse, getApiErrorMessage, isApiErrorRetryable } = require('../services/espnApi')

// NBA Season boundaries (2025-2026 season)
// Season runs from October 2025 to June 2026
const SEASON_START_DATE = new Date('2025-10-01')
const SEASON_END_DATE = new Date('2026-06-30')

// Async thunk for fetching scoreboard data
const fetchScoreboard = createAsyncThunk(
  'scoreboard/fetchScoreboard',
  async (date, { rejectWithValue }) => {
    try {
      // Convert to Date object if it's a string
      const dateObj = typeof date === 'string' ? new Date(date) : date
      const dateStr = format(dateObj, 'yyyyMMdd')

      // Fetch data from ESPN API
      const response = await fetchScoreboardData(dateObj)
      
      // Validate response structure
      if (!validateApiResponse(response, 'scoreboard')) {
        throw new Error('Invalid scoreboard data received from ESPN API')
      }
      
      // Map ESPN response to internal format
      const games = mapScoreboardResponse(response)
      
      return {
        date: dateStr,
        games
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

// Initial state
const initialState = {
  loading: false,
  error: null,
  date: new Date().toISOString(),
  games: [],
  selectedIndex: 0,
  lastFetched: null
}

// Scoreboard slice
const scoreboardSlice = createSlice({
  name: 'scoreboard',
  initialState,
  reducers: {
    // Date navigation actions
    navigateToNextDay: (state) => {
      const currentDate = startOfDay(new Date(state.date))
      const nextDate = addDays(currentDate, 1)

      // Only navigate if next day is within season bounds
      if (!isAfter(nextDate, SEASON_END_DATE)) {
        state.date = nextDate.toISOString()
        state.selectedIndex = 0
        // Don't clear games - keep previous date's games visible during loading
      }
    },

    navigateToPreviousDay: (state) => {
      const currentDate = startOfDay(new Date(state.date))
      const previousDate = subDays(currentDate, 1)

      // Only navigate if previous day is within season bounds
      if (!isBefore(previousDate, SEASON_START_DATE)) {
        state.date = previousDate.toISOString()
        state.selectedIndex = 0
        // Don't clear games - keep previous date's games visible during loading
      }
    },

    navigateToToday: (state) => {
      state.date = new Date().toISOString()
      state.selectedIndex = 0
      // Don't clear games - keep previous date's games visible during loading
    },
    
    // Game selection actions
    selectNextGame: (state) => {
      if (state.games.length > 0) {
        state.selectedIndex = Math.min(state.selectedIndex + 1, state.games.length - 1)
      }
    },
    
    selectPreviousGame: (state) => {
      state.selectedIndex = Math.max(state.selectedIndex - 1, 0)
    },
    
    selectGameByIndex: (state, action) => {
      const index = action.payload
      if (index >= 0 && index < state.games.length) {
        state.selectedIndex = index
      }
    },
    
    // Clear error state
    clearError: (state) => {
      state.error = null
    },
    
    // Reset selection
    resetSelection: (state) => {
      state.selectedIndex = 0
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Handle fetchScoreboard pending
      .addCase(fetchScoreboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      
      // Handle fetchScoreboard fulfilled
      .addCase(fetchScoreboard.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        state.games = action.payload.games
        state.lastFetched = new Date().toISOString()
        // Reset selection if no games or current selection is out of bounds
        if (state.games.length === 0 || state.selectedIndex >= state.games.length) {
          state.selectedIndex = 0
        }
      })
      
      // Handle fetchScoreboard rejected
      .addCase(fetchScoreboard.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.message || 'Failed to fetch games'
        // Keep existing games on error to avoid empty state
      })
  }
})

// Actions
const {
  navigateToNextDay,
  navigateToPreviousDay,
  navigateToToday,
  selectNextGame,
  selectPreviousGame,
  selectGameByIndex,
  clearError,
  resetSelection
} = scoreboardSlice.actions

// Selectors
const selectScoreboardState = (state) => state.scoreboard
const selectGames = (state) => state.scoreboard.games
const selectSelectedGame = (state) => {
  const { games, selectedIndex } = state.scoreboard
  return games[selectedIndex] || null
}
const selectSelectedGameId = (state) => {
  const selectedGame = selectSelectedGame(state)
  return selectedGame?.id || null
}
const selectCurrentDate = (state) => state.scoreboard.date
const selectIsLoading = (state) => state.scoreboard.loading
const selectError = (state) => state.scoreboard.error
const selectSelectedIndex = (state) => state.scoreboard.selectedIndex

// Memoized selectors for filtered and sorted game data
const selectLiveGames = createSelector(
  [selectGames],
  (games) => games.filter(game => !game.status.completed)
)

const selectCompletedGames = createSelector(
  [selectGames],
  (games) => games.filter(game => game.status.completed)
)

const selectGamesByStatus = createSelector(
  [selectGames],
  (games) => {
    const live = []
    const scheduled = []
    const completed = []
    
    games.forEach(game => {
      if (game.status.completed) {
        completed.push(game)
      } else if (game.status.description === 'Scheduled') {
        scheduled.push(game)
      } else {
        live.push(game)
      }
    })
    
    return { live, scheduled, completed }
  }
)

const selectSortedGames = createSelector(
  [selectGames],
  (games) => {
    return [...games].sort((a, b) => {
      // Sort by start time
      return new Date(a.startTime) - new Date(b.startTime)
    })
  }
)

// Selector to check if current date is today
const selectIsToday = createSelector(
  [selectCurrentDate],
  (date) => isToday(new Date(date))
)

// Selector for formatted date string
const selectFormattedDate = createSelector(
  [selectCurrentDate],
  (date) => format(new Date(date), 'EEEE, MMMM d, yyyy')
)

// Selector to check if at season start boundary
const selectIsAtSeasonStart = createSelector(
  [selectCurrentDate],
  (date) => {
    const currentDate = startOfDay(new Date(date))
    const previousDate = subDays(currentDate, 1)
    return isBefore(previousDate, SEASON_START_DATE)
  }
)

// Selector to check if at season end boundary
const selectIsAtSeasonEnd = createSelector(
  [selectCurrentDate],
  (date) => {
    const currentDate = startOfDay(new Date(date))
    const nextDate = addDays(currentDate, 1)
    return isAfter(nextDate, SEASON_END_DATE)
  }
)

// Memoized selector for games with enhanced data
const selectGamesWithMetadata = createSelector(
  [selectGames, selectCurrentDate],
  (games, currentDate) => {
    const currentDateObj = new Date(currentDate)
    return games.map((game, index) => ({
      ...game,
      index,
      isLive: !game.status.completed && game.status.description !== 'Scheduled',
      isToday: isToday(new Date(game.startTime)),
      timeUntilStart: game.status.description === 'Scheduled' ?
        new Date(game.startTime) - currentDateObj : null,
      displayTime: game.status.completed ? 'FINAL' :
        game.status.description === 'Scheduled' ?
          format(new Date(game.startTime), 'h:mm a') :
          `${game.status.period}Q ${game.status.displayClock || ''}`
    }))
  }
)

// Optimized selector for games by priority (live first, then scheduled, then completed)
const selectGamesByPriority = createSelector(
  [selectGamesWithMetadata],
  (games) => {
    const live = []
    const scheduled = []
    const completed = []
    
    games.forEach(game => {
      if (game.isLive) {
        live.push(game)
      } else if (game.status.description === 'Scheduled') {
        scheduled.push(game)
      } else {
        completed.push(game)
      }
    })
    
    // Sort each category
    live.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    scheduled.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    completed.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)) // Most recent first
    
    return [...live, ...scheduled, ...completed]
  }
)

module.exports = {
  fetchScoreboard,
  navigateToNextDay,
  navigateToPreviousDay,
  navigateToToday,
  selectNextGame,
  selectPreviousGame,
  selectGameByIndex,
  clearError,
  resetSelection,
  selectScoreboardState,
  selectGames,
  selectSelectedGame,
  selectSelectedGameId,
  selectCurrentDate,
  selectIsLoading,
  selectError,
  selectSelectedIndex,
  selectLiveGames,
  selectCompletedGames,
  selectGamesByStatus,
  selectSortedGames,
  selectIsToday,
  selectFormattedDate,
  selectIsAtSeasonStart,
  selectIsAtSeasonEnd,
  selectGamesWithMetadata,
  selectGamesByPriority,
  default: scoreboardSlice.reducer
}