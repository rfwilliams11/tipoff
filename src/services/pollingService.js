/**
 * Polling service for live game updates
 */

// Polling intervals based on game status (in milliseconds)
const POLLING_INTERVALS = {
  LIVE_GAME: 5000,        // 5 seconds for live games
  HALFTIME: 30000,        // 30 seconds during halftime/timeout
  SCHEDULED: 60000,       // 1 minute for scheduled games
  FINAL: null,            // No polling for finished games
  DEFAULT: 15000          // 15 seconds default
}

// Maximum number of consecutive polling failures before stopping
const MAX_POLLING_FAILURES = 5

// Polling manager to track active polls
class PollingManager {
  constructor() {
    this.activePolls = new Map()
    this.pollFailures = new Map()
    this.isShuttingDown = false
  }

  /**
   * Start polling for a specific game
   * @param {string} gameId - The game ID to poll
   * @param {Function} pollFunction - Function to call for polling
   * @param {Function} getInterval - Function to determine polling interval
   * @param {Object} options - Polling options
   */
  startPolling(gameId, pollFunction, getInterval, options = {}) {
    // Stop existing polling for this game
    this.stopPolling(gameId)
    
    if (this.isShuttingDown) {
      return
    }

    const {
      onSuccess = () => {},
      onError = () => {},
      onStop = () => {},
      maxFailures = MAX_POLLING_FAILURES
    } = options


    const poll = async () => {
      if (this.isShuttingDown || !this.activePolls.has(gameId)) {
        return
      }

      try {
        // Execute the polling function
        const result = await pollFunction(gameId)
        
        // Reset failure count on success
        this.pollFailures.set(gameId, 0)
        
        // Call success callback
        onSuccess(result)
        
        // Determine next polling interval
        const interval = getInterval(result)
        
        if (interval === null) {
          // Stop polling (e.g., game finished)
          this.stopPolling(gameId)
          onStop('completed')
          return
        }
        
        // Schedule next poll
        const timeoutId = setTimeout(poll, interval)
        this.activePolls.set(gameId, {
          timeoutId,
          interval,
          lastPoll: Date.now(),
          failures: this.pollFailures.get(gameId) || 0
        })
        
      } catch (error) {
        // Increment failure count
        const failures = (this.pollFailures.get(gameId) || 0) + 1
        this.pollFailures.set(gameId, failures)
        
        // Call error callback
        onError(error, failures)
        
        if (failures >= maxFailures) {
          this.stopPolling(gameId)
          onStop('max_failures')
          return
        }
        
        // Continue polling with exponential backoff on failure
        const backoffDelay = Math.min(1000 * Math.pow(2, failures - 1), 30000)
        const timeoutId = setTimeout(poll, backoffDelay)
        
        this.activePolls.set(gameId, {
          timeoutId,
          interval: backoffDelay,
          lastPoll: Date.now(),
          failures
        })
      }
    }

    // Start initial poll
    poll()
  }

  /**
   * Stop polling for a specific game
   * @param {string} gameId - The game ID to stop polling
   */
  stopPolling(gameId) {
    const pollInfo = this.activePolls.get(gameId)
    if (pollInfo) {
      clearTimeout(pollInfo.timeoutId)
      this.activePolls.delete(gameId)
      this.pollFailures.delete(gameId)
    }
  }

  /**
   * Stop all active polling
   */
  stopAllPolling() {
    for (const [gameId, pollInfo] of this.activePolls) {
      clearTimeout(pollInfo.timeoutId)
    }

    this.activePolls.clear()
    this.pollFailures.clear()
  }

  /**
   * Gracefully shutdown the polling manager
   */
  shutdown() {
    this.isShuttingDown = true
    this.stopAllPolling()
  }

  /**
   * Get information about active polls
   * @returns {Object} Polling status information
   */
  getPollingStatus() {
    const activePolls = Array.from(this.activePolls.entries()).map(([gameId, info]) => ({
      gameId,
      interval: info.interval,
      lastPoll: info.lastPoll,
      failures: info.failures,
      nextPoll: info.lastPoll + info.interval
    }))

    return {
      activeCount: this.activePolls.size,
      activePolls,
      isShuttingDown: this.isShuttingDown
    }
  }

  /**
   * Check if a game is currently being polled
   * @param {string} gameId - The game ID to check
   * @returns {boolean} Whether the game is being polled
   */
  isPolling(gameId) {
    return this.activePolls.has(gameId)
  }

  /**
   * Update polling interval for a game
   * @param {string} gameId - The game ID
   * @param {number} newInterval - New polling interval in milliseconds
   */
  updatePollingInterval(gameId, newInterval) {
    const pollInfo = this.activePolls.get(gameId)
    if (pollInfo && newInterval !== pollInfo.interval) {
      pollInfo.interval = newInterval
    }
  }
}

// Create singleton polling manager
const pollingManager = new PollingManager()

/**
 * Determine polling interval based on game status
 * @param {Object} gameData - Game data containing status information
 * @returns {number|null} Polling interval in milliseconds, or null to stop polling
 */
const getPollingInterval = (gameData) => {
  if (!gameData?.gameData?.status) {
    return POLLING_INTERVALS.DEFAULT
  }

  const status = gameData.gameData.status
  
  // Game is finished
  if (status.completed) {
    return POLLING_INTERVALS.FINAL
  }
  
  // Determine interval based on game state
  const description = status.description?.toLowerCase() || ''
  
  if (description.includes('halftime') || 
      description.includes('timeout') || 
      description.includes('break')) {
    return POLLING_INTERVALS.HALFTIME
  }
  
  if (description.includes('scheduled') || 
      description.includes('pre') ||
      status.period === 0) {
    return POLLING_INTERVALS.SCHEDULED
  }
  
  // Game is live (in progress)
  if (status.period > 0 && !status.completed) {
    return POLLING_INTERVALS.LIVE_GAME
  }
  
  return POLLING_INTERVALS.DEFAULT
}

/**
 * Start polling for game updates
 * @param {string} gameId - The game ID to poll
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function} pollAction - Redux action creator for polling
 * @param {Object} options - Polling options
 */
const startGamePolling = (gameId, dispatch, pollAction, options = {}) => {
  const pollFunction = async (id) => {
    const result = await dispatch(pollAction(id))
    
    // Handle both fulfilled and rejected results
    if (result.type.endsWith('/fulfilled')) {
      return result.payload
    } else if (result.type.endsWith('/rejected')) {
      throw new Error(result.payload?.message || 'Polling failed')
    }
    
    return result.payload
  }

  const getInterval = (gameData) => {
    return getPollingInterval(gameData)
  }

  pollingManager.startPolling(gameId, pollFunction, getInterval, {
    onSuccess: (result) => {
      if (options.onSuccess) {
        options.onSuccess(result)
      }
    },
    onError: (error, failures) => {
      if (options.onError) {
        options.onError(error, failures)
      }
    },
    onStop: (reason) => {
      if (options.onStop) {
        options.onStop(reason)
      }
    },
    maxFailures: options.maxFailures || MAX_POLLING_FAILURES
  })
}

/**
 * Stop polling for a specific game
 * @param {string} gameId - The game ID to stop polling
 */
const stopGamePolling = (gameId) => {
  pollingManager.stopPolling(gameId)
}

/**
 * Stop all game polling
 */
const stopAllGamePolling = () => {
  pollingManager.stopAllPolling()
}

/**
 * Get current polling status
 * @returns {Object} Polling status information
 */
const getPollingStatus = () => {
  return pollingManager.getPollingStatus()
}

/**
 * Check if a game is currently being polled
 * @param {string} gameId - The game ID to check
 * @returns {boolean} Whether the game is being polled
 */
const isGamePolling = (gameId) => {
  return pollingManager.isPolling(gameId)
}

/**
 * Initialize polling service (call this on app startup)
 */
const initializePollingService = () => {
  // Handle process termination gracefully
  const handleShutdown = () => {
    pollingManager.shutdown()
  }

  process.on('SIGINT', handleShutdown)
  process.on('SIGTERM', handleShutdown)
  process.on('exit', handleShutdown)

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    pollingManager.shutdown()
  })

  process.on('unhandledRejection', (reason, promise) => {
    pollingManager.shutdown()
  })
}

/**
 * Cleanup polling service (call this on app shutdown)
 */
const cleanupPollingService = () => {
  pollingManager.shutdown()
}

module.exports = {
  POLLING_INTERVALS,
  pollingManager,
  getPollingInterval,
  startGamePolling,
  stopGamePolling,
  stopAllGamePolling,
  getPollingStatus,
  isGamePolling,
  initializePollingService,
  cleanupPollingService,
  default: {
    POLLING_INTERVALS,
    pollingManager,
    getPollingInterval,
    startGamePolling,
    stopGamePolling,
    stopAllGamePolling,
    getPollingStatus,
    isGamePolling,
    initializePollingService,
    cleanupPollingService
  }
}