const { createSlice, createAsyncThunk, createSelector } = require('@reduxjs/toolkit')
const fs = require('fs')
const path = require('path')
const os = require('os')

// Configuration file path
const CONFIG_DIR = path.join(os.homedir(), '.tipoff')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

// Default configuration
const DEFAULT_CONFIG = {
  favorites: [],
  colors: {
    score: 'white',
    teamName: 'cyan',
    selectedGame: 'yellow',
    liveGame: 'green',
    completedGame: 'gray',
    error: 'red',
    info: 'blue',
    background: 'black'
  },
  display: {
    showVenue: true,
    showTime: true,
    compactMode: false,
    refreshInterval: 5000
  },
  polling: {
    liveGameInterval: 5000,
    scheduledGameInterval: 60000,
    halftimeInterval: 30000
  }
}

// Async thunk for loading configuration from file
const loadConfig = createAsyncThunk(
  'config/loadConfig',
  async (_, { rejectWithValue }) => {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true })
      }
      
      // Check if config file exists
      if (!fs.existsSync(CONFIG_FILE)) {
        // Create default config file
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2))
        return DEFAULT_CONFIG
      }
      
      // Read existing config
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
      const config = JSON.parse(configData)
      
      // Merge with defaults to ensure all properties exist
      return {
        ...DEFAULT_CONFIG,
        ...config,
        colors: { ...DEFAULT_CONFIG.colors, ...config.colors },
        display: { ...DEFAULT_CONFIG.display, ...config.display },
        polling: { ...DEFAULT_CONFIG.polling, ...config.polling }
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error.message)
      return DEFAULT_CONFIG
    }
  }
)

// Async thunk for saving configuration to file
const saveConfig = createAsyncThunk(
  'config/saveConfig',
  async (config, { rejectWithValue }) => {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true })
      }
      
      // Write config to file
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
      return config
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Failed to save configuration',
        retryable: false
      })
    }
  }
)

// Initial state
const initialState = {
  loading: false,
  error: null,
  ...DEFAULT_CONFIG,
  dirty: false // Track if config has unsaved changes
}

// Configuration slice
const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    // Favorite teams management
    addFavoriteTeam: (state, action) => {
      const teamId = action.payload
      if (!state.favorites.includes(teamId)) {
        state.favorites.push(teamId)
        state.dirty = true
      }
    },
    
    removeFavoriteTeam: (state, action) => {
      const teamId = action.payload
      const index = state.favorites.indexOf(teamId)
      if (index > -1) {
        state.favorites.splice(index, 1)
        state.dirty = true
      }
    },
    
    setFavoriteTeams: (state, action) => {
      state.favorites = action.payload
      state.dirty = true
    },
    
    clearFavoriteTeams: (state) => {
      state.favorites = []
      state.dirty = true
    },
    
    // Color customization
    setColor: (state, action) => {
      const { colorKey, colorValue } = action.payload
      if (state.colors.hasOwnProperty(colorKey)) {
        state.colors[colorKey] = colorValue
        state.dirty = true
      }
    },
    
    setColors: (state, action) => {
      state.colors = { ...state.colors, ...action.payload }
      state.dirty = true
    },
    
    resetColors: (state) => {
      state.colors = { ...DEFAULT_CONFIG.colors }
      state.dirty = true
    },
    
    // Display preferences
    setDisplayOption: (state, action) => {
      const { option, value } = action.payload
      if (state.display.hasOwnProperty(option)) {
        state.display[option] = value
        state.dirty = true
      }
    },
    
    setDisplayOptions: (state, action) => {
      state.display = { ...state.display, ...action.payload }
      state.dirty = true
    },
    
    // Polling intervals
    setPollingInterval: (state, action) => {
      const { intervalType, value } = action.payload
      if (state.polling.hasOwnProperty(intervalType)) {
        state.polling[intervalType] = value
        state.dirty = true
      }
    },
    
    setPollingIntervals: (state, action) => {
      state.polling = { ...state.polling, ...action.payload }
      state.dirty = true
    },
    
    // Reset configuration
    resetConfig: (state) => {
      Object.assign(state, {
        ...DEFAULT_CONFIG,
        loading: false,
        error: null,
        dirty: true
      })
    },
    
    // Clear dirty flag
    markConfigClean: (state) => {
      state.dirty = false
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Handle loadConfig pending
      .addCase(loadConfig.pending, (state) => {
        state.loading = true
        state.error = null
      })
      
      // Handle loadConfig fulfilled
      .addCase(loadConfig.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        Object.assign(state, action.payload)
        state.dirty = false
      })
      
      // Handle loadConfig rejected
      .addCase(loadConfig.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.message || 'Failed to load configuration'
        // Use default config on load failure
        Object.assign(state, DEFAULT_CONFIG)
        state.dirty = false
      })
      
      // Handle saveConfig pending
      .addCase(saveConfig.pending, (state) => {
        state.loading = true
        state.error = null
      })
      
      // Handle saveConfig fulfilled
      .addCase(saveConfig.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        state.dirty = false
      })
      
      // Handle saveConfig rejected
      .addCase(saveConfig.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.message || 'Failed to save configuration'
      })
  }
})

// Actions
const {
  addFavoriteTeam,
  removeFavoriteTeam,
  setFavoriteTeams,
  clearFavoriteTeams,
  setColor,
  setColors,
  resetColors,
  setDisplayOption,
  setDisplayOptions,
  setPollingInterval,
  setPollingIntervals,
  resetConfig,
  markConfigClean,
  clearError
} = configSlice.actions

// Basic selectors
const selectConfigState = (state) => state.config
const selectFavoriteTeams = (state) => state.config.favorites
const selectColors = (state) => state.config.colors
const selectDisplayOptions = (state) => state.config.display
const selectPollingIntervals = (state) => state.config.polling
const selectIsConfigDirty = (state) => state.config.dirty
const selectIsConfigLoading = (state) => state.config.loading
const selectConfigError = (state) => state.config.error

// Memoized selectors for applying user preferences
const selectIsTeamFavorite = createSelector(
  [selectFavoriteTeams, (state, teamId) => teamId],
  (favorites, teamId) => favorites.includes(teamId)
)

const selectColorForElement = createSelector(
  [selectColors, (state, element) => element],
  (colors, element) => colors[element] || 'white'
)

// Selector for games with favorite team highlighting
const selectGamesWithFavorites = createSelector(
  [(state) => state.scoreboard.games, selectFavoriteTeams],
  (games, favorites) => {
    return games.map(game => ({
      ...game,
      homeTeamIsFavorite: favorites.includes(game.homeTeam.abbreviation),
      awayTeamIsFavorite: favorites.includes(game.awayTeam.abbreviation),
      isFavoriteGame: favorites.includes(game.homeTeam.abbreviation) || favorites.includes(game.awayTeam.abbreviation)
    }))
  }
)

// Selector for polling interval based on game status
const selectPollingIntervalForGame = createSelector(
  [selectPollingIntervals, (state, gameStatus) => gameStatus],
  (intervals, gameStatus) => {
    switch (gameStatus) {
      case 'in_progress':
        return intervals.liveGameInterval
      case 'halftime':
      case 'timeout':
        return intervals.halftimeInterval
      case 'scheduled':
        return intervals.scheduledGameInterval
      default:
        return intervals.liveGameInterval
    }
  }
)

// Selector for complete configuration object (for saving)
const selectCompleteConfig = createSelector(
  [selectFavoriteTeams, selectColors, selectDisplayOptions, selectPollingIntervals],
  (favorites, colors, display, polling) => ({
    favorites,
    colors,
    display,
    polling
  })
)

// Selector for configuration summary (for display)
const selectConfigSummary = createSelector(
  [selectCompleteConfig],
  (config) => ({
    favoriteTeamsCount: config.favorites.length,
    customColors: Object.keys(config.colors).filter(
      key => config.colors[key] !== DEFAULT_CONFIG.colors[key]
    ).length,
    displayOptionsChanged: Object.keys(config.display).filter(
      key => config.display[key] !== DEFAULT_CONFIG.display[key]
    ).length,
    pollingIntervalsChanged: Object.keys(config.polling).filter(
      key => config.polling[key] !== DEFAULT_CONFIG.polling[key]
    ).length
  })
)

module.exports = {
  loadConfig,
  saveConfig,
  addFavoriteTeam,
  removeFavoriteTeam,
  setFavoriteTeams,
  clearFavoriteTeams,
  setColor,
  setColors,
  resetColors,
  setDisplayOption,
  setDisplayOptions,
  setPollingInterval,
  setPollingIntervals,
  resetConfig,
  markConfigClean,
  clearError,
  selectConfigState,
  selectFavoriteTeams,
  selectColors,
  selectDisplayOptions,
  selectPollingIntervals,
  selectIsConfigDirty,
  selectIsConfigLoading,
  selectConfigError,
  selectIsTeamFavorite,
  selectColorForElement,
  selectGamesWithFavorites,
  selectPollingIntervalForGame,
  selectCompleteConfig,
  selectConfigSummary,
  default: configSlice.reducer
}