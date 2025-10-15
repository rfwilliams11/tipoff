const { NBA_TEAMS, VALID_TEAM_ABBREVIATIONS, TEAM_ALIASES } = require('./constants')

function isValidTeam(team) {
  if (!team || typeof team !== 'string') return false

  const upperTeam = team.toUpperCase()
  return VALID_TEAM_ABBREVIATIONS.includes(upperTeam) ||
         Object.keys(TEAM_ALIASES).includes(upperTeam)
}

function normalizeTeam(team) {
  if (!team || typeof team !== 'string') return null

  const upperTeam = team.toUpperCase()

  // Check if it's already a valid abbreviation
  if (VALID_TEAM_ABBREVIATIONS.includes(upperTeam)) {
    return upperTeam
  }

  // Check aliases
  if (TEAM_ALIASES[upperTeam]) {
    return TEAM_ALIASES[upperTeam]
  }

  return null
}

function getTeamInfo(team) {
  const normalizedTeam = normalizeTeam(team)
  if (!normalizedTeam) return null

  return {
    abbreviation: normalizedTeam,
    ...NBA_TEAMS[normalizedTeam]
  }
}

function getTeamsByConference(conference) {
  return VALID_TEAM_ABBREVIATIONS.filter(abbr =>
    NBA_TEAMS[abbr].conference === conference
  )
}

function getTeamsByDivision(division) {
  return VALID_TEAM_ABBREVIATIONS.filter(abbr =>
    NBA_TEAMS[abbr].division === division
  )
}

function validateFavoriteTeams(favorites) {
  if (!Array.isArray(favorites)) {
    return { valid: [], invalid: [], normalized: [] }
  }

  const valid = []
  const invalid = []
  const normalized = []

  favorites.forEach(team => {
    const normalizedTeam = normalizeTeam(team)
    if (normalizedTeam) {
      valid.push(team)
      normalized.push(normalizedTeam)
    } else {
      invalid.push(team)
    }
  })

  return { valid, invalid, normalized }
}

module.exports = {
  isValidTeam,
  normalizeTeam,
  getTeamInfo,
  getTeamsByConference,
  getTeamsByDivision,
  validateFavoriteTeams
}
