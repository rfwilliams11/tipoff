const { createSelector } = require('@reduxjs/toolkit')

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
  selectShouldPollGame
}
