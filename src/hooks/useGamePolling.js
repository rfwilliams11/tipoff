const { useEffect, useMemo } = require('react')
const { DEFAULT_POLLING_INTERVALS } = require('../constants/polling')

const useGamePolling = (selectedGame, gameId, dispatch, actions) => {
  const currentGameStatus = selectedGame?.gameData?.status?.description || 'scheduled'

  const pollingInterval = useMemo(() => {
    const status = currentGameStatus.toLowerCase()
    if (status.includes('progress') || status === 'in') {
      return DEFAULT_POLLING_INTERVALS.liveGameInterval
    } else if (status === 'halftime' || status === 'timeout') {
      return DEFAULT_POLLING_INTERVALS.halftimeInterval
    } else if (status === 'scheduled') {
      return DEFAULT_POLLING_INTERVALS.scheduledGameInterval
    }
    return DEFAULT_POLLING_INTERVALS.liveGameInterval
  }, [currentGameStatus])

  useEffect(() => {
    if (!selectedGame || !gameId) return

    const gameStatus = selectedGame.gameData.status

    if (!gameStatus.completed) {
      dispatch(actions.startPolling({
        gameId,
        interval: pollingInterval
      }))

      const pollInterval = setInterval(() => {
        dispatch(actions.pollGameUpdates(gameId))
      }, pollingInterval)

      return () => {
        clearInterval(pollInterval)
        dispatch(actions.stopPolling(gameId))
      }
    }
  }, [selectedGame, gameId, pollingInterval, dispatch, actions])

  useEffect(() => {
    return () => {
      if (gameId) {
        dispatch(actions.stopPolling(gameId))
      }
    }
  }, [gameId, dispatch, actions])

  return pollingInterval
}

module.exports = { useGamePolling }
