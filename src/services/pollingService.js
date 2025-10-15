// Polling intervals based on game status (in milliseconds)
const POLLING_INTERVALS = {
  LIVE_GAME: 5000,        // 5 seconds for live games
  HALFTIME: 30000,        // 30 seconds during halftime/timeout
  SCHEDULED: 60000,       // 1 minute for scheduled games
  FINAL: null,            // No polling for finished games
  DEFAULT: 15000          // 15 seconds default
}

const MAX_POLLING_FAILURES = 5

class PollingManager {
  constructor() {
    this.activePolls = new Map()
    this.pollFailures = new Map()
    this.isShuttingDown = false
  }

  startPolling(gameId, pollFunction, getInterval, options = {}) {
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

  stopPolling(gameId) {
    const pollInfo = this.activePolls.get(gameId)
    if (pollInfo) {
      clearTimeout(pollInfo.timeoutId)
      this.activePolls.delete(gameId)
      this.pollFailures.delete(gameId)
    }
  }

  stopAllPolling() {
    for (const [gameId, pollInfo] of this.activePolls) {
      clearTimeout(pollInfo.timeoutId)
    }

    this.activePolls.clear()
    this.pollFailures.clear()
  }

  shutdown() {
    this.isShuttingDown = true
    this.stopAllPolling()
  }

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

  isPolling(gameId) {
    return this.activePolls.has(gameId)
  }

  updatePollingInterval(gameId, newInterval) {
    const pollInfo = this.activePolls.get(gameId)
    if (pollInfo && newInterval !== pollInfo.interval) {
      pollInfo.interval = newInterval
    }
  }
}

const pollingManager = new PollingManager()

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

const stopGamePolling = (gameId) => {
  pollingManager.stopPolling(gameId)
}

const stopAllGamePolling = () => {
  pollingManager.stopAllPolling()
}

const getPollingStatus = () => {
  return pollingManager.getPollingStatus()
}

const isGamePolling = (gameId) => {
  return pollingManager.isPolling(gameId)
}

const initializePollingService = () => {
  const handleShutdown = () => {
    pollingManager.shutdown()
  }

  process.on('SIGINT', handleShutdown)
  process.on('SIGTERM', handleShutdown)
  process.on('exit', handleShutdown)
  process.on('uncaughtException', (error) => {
    pollingManager.shutdown()
  })

  process.on('unhandledRejection', (reason, promise) => {
    pollingManager.shutdown()
  })
}

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