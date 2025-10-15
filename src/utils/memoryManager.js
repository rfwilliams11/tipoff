/**
 * Memory management utilities for NBA Terminal Viewer
 * Provides memory monitoring, cleanup, and optimization functions
 */

// Memory thresholds and limits
const MEMORY_LIMITS = {
  MAX_GAMES: 10,
  MAX_PLAYS_PER_GAME: 50,
  MAX_TOTAL_PLAYS: 500,
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  WARNING_THRESHOLD: 0.8 // 80% of limits
}

/**
 * Calculate current memory usage statistics
 * @param {Object} gamesState - Redux games state
 * @returns {Object} Memory usage statistics
 */
const calculateMemoryUsage = (gamesState) => {
  const games = gamesState.games || {}
  const gameIds = Object.keys(games)

  let totalPlays = 0
  let totalGameData = 0
  let activePollingGames = 0

  gameIds.forEach(gameId => {
    const game = games[gameId]
    if (game) {
      // Count plays
      if (game.liveData && game.liveData.plays) {
        totalPlays += game.liveData.plays.length
      }

      // Estimate game data size (rough calculation)
      totalGameData += JSON.stringify(game).length

      // Count active polling games
      if (gamesState.pollingIntervals && gamesState.pollingIntervals[gameId]) {
        activePollingGames++
      }
    }
  })

  return {
    totalGames: gameIds.length,
    totalPlays,
    totalGameData,
    activePollingGames,
    averagePlaysPerGame: gameIds.length > 0 ? Math.round(totalPlays / gameIds.length) : 0,
    estimatedMemoryUsage: Math.round(totalGameData / 1024), // KB
    limits: MEMORY_LIMITS,
    warnings: {
      gamesNearLimit: gameIds.length >= MEMORY_LIMITS.MAX_GAMES * MEMORY_LIMITS.WARNING_THRESHOLD,
      playsNearLimit: totalPlays >= MEMORY_LIMITS.MAX_TOTAL_PLAYS * MEMORY_LIMITS.WARNING_THRESHOLD,
      shouldCleanup: gameIds.length > MEMORY_LIMITS.MAX_GAMES || totalPlays > MEMORY_LIMITS.MAX_TOTAL_PLAYS
    }
  }
}

/**
 * Determine which games should be cleaned up
 * @param {Object} gamesState - Redux games state
 * @param {Array} activeGameIds - IDs of games that should be kept
 * @returns {Array} Game IDs that can be safely removed
 */
const getGamesForCleanup = (gamesState, activeGameIds = []) => {
  const games = gamesState.games || {}
  const pollingIntervals = gamesState.pollingIntervals || {}
  const lastPolled = gamesState.lastPolled || {}

  const gameIds = Object.keys(games)
  const currentTime = new Date()

  // Categorize games
  const gameCategories = {
    active: [], // Currently being polled
    recent: [], // Recently accessed
    old: []     // Can be cleaned up
  }

  gameIds.forEach(gameId => {
    const game = games[gameId]
    if (!game) return

    // Keep if explicitly marked as active
    if (activeGameIds.includes(gameId)) {
      gameCategories.active.push(gameId)
      return
    }

    // Keep if currently being polled
    if (pollingIntervals[gameId]) {
      gameCategories.active.push(gameId)
      return
    }

    // Keep if recently accessed (within last hour)
    const lastAccess = lastPolled[gameId] || game.lastUpdated
    if (lastAccess) {
      const timeSinceAccess = currentTime - new Date(lastAccess)
      if (timeSinceAccess < 60 * 60 * 1000) { // 1 hour
        gameCategories.recent.push(gameId)
        return
      }
    }

    // Mark for cleanup
    gameCategories.old.push({
      gameId,
      lastAccess: lastAccess || '1970-01-01T00:00:00.000Z',
      playsCount: game.liveData?.plays?.length || 0
    })
  })

  // Sort old games by last access time (oldest first)
  gameCategories.old.sort((a, b) => new Date(a.lastAccess) - new Date(b.lastAccess))

  return {
    categories: gameCategories,
    toCleanup: gameCategories.old.map(item => item.gameId)
  }
}

/**
 * Create a cleanup strategy based on current memory usage
 * @param {Object} gamesState - Redux games state
 * @param {Array} activeGameIds - IDs of games that should be kept
 * @returns {Object} Cleanup strategy with actions to take
 */
const createCleanupStrategy = (gamesState, activeGameIds = []) => {
  const memoryUsage = calculateMemoryUsage(gamesState)
  const cleanupAnalysis = getGamesForCleanup(gamesState, activeGameIds)

  const strategy = {
    shouldCleanup: false,
    actions: [],
    expectedSavings: {
      games: 0,
      plays: 0,
      estimatedMemory: 0
    }
  }

  // Determine if cleanup is needed
  if (memoryUsage.warnings.shouldCleanup) {
    strategy.shouldCleanup = true

    // Calculate how many games to remove
    const excessGames = Math.max(0, memoryUsage.totalGames - MEMORY_LIMITS.MAX_GAMES)
    const gamesToRemove = Math.min(excessGames + 2, cleanupAnalysis.toCleanup.length) // Remove a few extra

    if (gamesToRemove > 0) {
      const gamesToCleanup = cleanupAnalysis.toCleanup.slice(0, gamesToRemove)

      strategy.actions.push({
        type: 'REMOVE_GAMES',
        gameIds: gamesToCleanup,
        reason: 'Exceeded game limit'
      })

      // Calculate expected savings
      gamesToCleanup.forEach(gameId => {
        const game = gamesState.games[gameId]
        if (game) {
          strategy.expectedSavings.games++
          if (game.liveData && game.liveData.plays) {
            strategy.expectedSavings.plays += game.liveData.plays.length
          }
        }
      })
    }
  }

  // Check for play history limits
  Object.keys(gamesState.games || {}).forEach(gameId => {
    const game = gamesState.games[gameId]
    if (game && game.liveData && game.liveData.plays) {
      const excessPlays = game.liveData.plays.length - MEMORY_LIMITS.MAX_PLAYS_PER_GAME
      if (excessPlays > 0) {
        strategy.actions.push({
          type: 'LIMIT_PLAYS',
          gameId,
          currentPlays: game.liveData.plays.length,
          targetPlays: MEMORY_LIMITS.MAX_PLAYS_PER_GAME,
          reason: 'Exceeded play history limit'
        })

        strategy.expectedSavings.plays += excessPlays
      }
    }
  })

  // Estimate memory savings (rough calculation)
  strategy.expectedSavings.estimatedMemory = Math.round(
    (strategy.expectedSavings.games * 50 + strategy.expectedSavings.plays * 0.5) // KB
  )

  return strategy
}

/**
 * Log memory usage statistics for debugging
 * @param {Object} memoryUsage - Memory usage statistics
 * @param {string} context - Context for the log message
 */
const logMemoryUsage = (memoryUsage, context = '') => {
  const prefix = context ? `[${context}] ` : ''

  console.log(`${prefix}Memory Usage:`, {
    games: `${memoryUsage.totalGames}/${memoryUsage.limits.MAX_GAMES}`,
    plays: `${memoryUsage.totalPlays}/${memoryUsage.limits.MAX_TOTAL_PLAYS}`,
    avgPlaysPerGame: memoryUsage.averagePlaysPerGame,
    estimatedMemory: `${memoryUsage.estimatedMemoryUsage}KB`,
    activePolling: memoryUsage.activePollingGames,
    warnings: memoryUsage.warnings
  })
}

/**
 * Create a memory monitoring middleware for Redux
 * @returns {Function} Redux middleware
 */
const createMemoryMonitoringMiddleware = () => {
  let lastCleanup = 0

  return (store) => (next) => (action) => {
    const result = next(action)

    // Monitor memory after certain actions
    if (action.type.includes('games/') &&
        (action.type.includes('fulfilled') || action.type.includes('cleanup'))) {

      const state = store.getState()
      const memoryUsage = calculateMemoryUsage(state.games)

      // Log warnings if approaching limits
      if (memoryUsage.warnings.gamesNearLimit || memoryUsage.warnings.playsNearLimit) {
        logMemoryUsage(memoryUsage, 'WARNING')
      }

      // Trigger automatic cleanup if needed
      const now = Date.now()
      if (memoryUsage.warnings.shouldCleanup &&
          (now - lastCleanup) > MEMORY_LIMITS.CLEANUP_INTERVAL) {

        console.log('Triggering automatic memory cleanup...')
        store.dispatch({ type: 'games/performMemoryCleanup' })
        lastCleanup = now
      }
    }

    return result
  }
}

module.exports = {
  MEMORY_LIMITS,
  calculateMemoryUsage,
  getGamesForCleanup,
  createCleanupStrategy,
  logMemoryUsage,
  createMemoryMonitoringMiddleware
}