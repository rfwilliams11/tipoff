// Constants for memory management
const MAX_PLAYS_HISTORY = 50 // Limit play-by-play history
const MAX_CACHED_GAMES = 10 // Maximum number of games to keep in memory
const GAME_CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

module.exports = {
  MAX_PLAYS_HISTORY,
  MAX_CACHED_GAMES,
  GAME_CLEANUP_INTERVAL
}
