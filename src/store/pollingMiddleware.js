/**
 * Redux middleware for managing game polling
 */

const { startGamePolling, stopGamePolling, stopAllGamePolling, getPollingInterval, isGamePolling } = require('../services/pollingService')
const { pollGameUpdates, startPolling, stopPolling, updatePollingInterval } = require('./gamesSlice')

/**
 * Middleware to handle automatic polling based on Redux actions
 */
const pollingMiddleware = (store) => (next) => (action) => {
  const result = next(action)
  const state = store.getState()

  // Handle game selection - start polling for selected game
  if (action.type === 'games/selectGame') {
    const gameId = action.payload
    const game = state.games.games[gameId]
    
    if (game && !game.gameData.status.completed) {
      // Start polling for the selected game
      startGamePolling(gameId, store.dispatch, pollGameUpdates, {
        onSuccess: (gameData) => {
          // Update polling interval based on game status
          const newInterval = getPollingInterval(gameData)
          if (newInterval !== null) {
            store.dispatch(updatePollingInterval({ gameId, interval: newInterval }))
          }
        },
        onError: (error, failures) => {
          // Silent error handling
        },
        onStop: (reason) => {
          store.dispatch(stopPolling(gameId))
        }
      })
      
      // Update Redux state to track polling
      const initialInterval = getPollingInterval(game)
      if (initialInterval !== null) {
        store.dispatch(startPolling({ gameId, interval: initialInterval }))
      }
    }
  }

  // Handle clearing selected game - stop polling
  if (action.type === 'games/clearSelectedGame') {
    const selectedId = state.games.selectedId
    if (selectedId && isGamePolling(selectedId)) {
      stopGamePolling(selectedId)
      store.dispatch(stopPolling(selectedId))
    }
  }

  // Handle successful game detail fetch - start polling if game is live
  if (action.type === 'games/fetchGameDetail/fulfilled') {
    const { gameId, gameData } = action.payload
    
    if (gameData && !gameData.gameData.status.completed && state.games.selectedId === gameId) {
      // Only start polling if this is the currently selected game
      if (!isGamePolling(gameId)) {
        startGamePolling(gameId, store.dispatch, pollGameUpdates, {
          onSuccess: (updatedGameData) => {
            const newInterval = getPollingInterval(updatedGameData)
            if (newInterval !== null) {
              store.dispatch(updatePollingInterval({ gameId, interval: newInterval }))
            }
          },
          onError: (error, failures) => {
            console.warn(`Polling error for game ${gameId} (failure ${failures}):`, error.message)
          },
          onStop: (reason) => {
            store.dispatch(stopPolling(gameId))
          }
        })
        
        const initialInterval = getPollingInterval(gameData)
        if (initialInterval !== null) {
          store.dispatch(startPolling({ gameId, interval: initialInterval }))
        }
      }
    }
  }

  // Handle manual polling start
  if (action.type === 'games/startPolling') {
    const { gameId } = action.payload
    const game = state.games.games[gameId]
    
    if (game && !isGamePolling(gameId)) {
      startGamePolling(gameId, store.dispatch, pollGameUpdates, {
        onSuccess: (gameData) => {
          const newInterval = getPollingInterval(gameData)
          if (newInterval !== null) {
            store.dispatch(updatePollingInterval({ gameId, interval: newInterval }))
          }
        },
        onError: (error, failures) => {
          // Silent error handling
        },
        onStop: (reason) => {
          store.dispatch(stopPolling(gameId))
        }
      })
    }
  }

  // Handle manual polling stop
  if (action.type === 'games/stopPolling') {
    const gameId = action.payload
    if (isGamePolling(gameId)) {
      stopGamePolling(gameId)
    }
  }

  // Handle stop all polling
  if (action.type === 'games/stopAllPolling') {
    stopAllGamePolling()
  }

  // Handle view changes - stop polling when leaving game view
  if (action.type === 'ui/setCurrentView' && action.payload !== 'game') {
    // Stop all polling when not in game view
    const pollingGames = Object.keys(state.games.pollingIntervals)
    pollingGames.forEach(gameId => {
      stopGamePolling(gameId)
      store.dispatch(stopPolling(gameId))
    })
  }

  // Handle app shutdown or cleanup
  if (action.type === 'app/cleanup' || action.type === 'app/shutdown') {
    stopAllGamePolling()
    store.dispatch(stopAllPolling())
  }

  return result
}

/**
 * Middleware to handle polling interval updates
 */
const pollingIntervalMiddleware = (store) => (next) => (action) => {
  const result = next(action)

  // Handle successful polling updates - check if interval should change
  if (action.type === 'games/pollGameUpdates/fulfilled') {
    const { gameId, updates } = action.payload || {}
    
    if (gameId && updates && isGamePolling(gameId)) {
      const currentInterval = store.getState().games.pollingIntervals[gameId]
      const newInterval = getPollingInterval(updates)
      
      if (newInterval === null) {
        // Game finished, polling will be stopped by the polling service
        return result
      }
      
      if (newInterval !== currentInterval) {
        // Update polling interval
        store.dispatch(updatePollingInterval({ gameId, interval: newInterval }))
      }
    }
  }

  return result
}

module.exports = {
  pollingMiddleware,
  pollingIntervalMiddleware,
  default: pollingMiddleware
}