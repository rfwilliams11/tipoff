const {
  NBA_TEAMS,
  VALID_TEAM_ABBREVIATIONS,
  TEAM_ALIASES
} = require('./constants')

const {
  isValidTeam,
  normalizeTeam,
  getTeamInfo,
  getTeamsByConference,
  getTeamsByDivision,
  validateFavoriteTeams
} = require('./validation')

const {
  searchTeams,
  formatTeamList,
  getTeamSuggestions
} = require('./search')

module.exports = {
  NBA_TEAMS,
  VALID_TEAM_ABBREVIATIONS,
  TEAM_ALIASES,
  isValidTeam,
  normalizeTeam,
  getTeamInfo,
  getTeamsByConference,
  getTeamsByDivision,
  searchTeams,
  formatTeamList,
  getTeamSuggestions,
  validateFavoriteTeams
}
