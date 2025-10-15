const { createAsyncThunk } = require('@reduxjs/toolkit')
const { fetchGameDetailData, mapGameDetailResponse, validateApiResponse, getApiErrorMessage, isApiErrorRetryable } = require('../../services/espnApi')

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

module.exports = {
  fetchGameDetail,
  pollGameUpdates
}
