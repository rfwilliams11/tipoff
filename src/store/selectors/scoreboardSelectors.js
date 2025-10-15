const { createSelector } = require('@reduxjs/toolkit')
const { format, isToday, isAfter, isBefore, addDays, subDays, startOfDay } = require('date-fns')
const { SEASON_START_DATE, SEASON_END_DATE } = require('../constants/season')

// Basic selectors
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
  selectGamesByPriority
}
