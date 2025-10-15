const { NBA_TEAMS, VALID_TEAM_ABBREVIATIONS } = require('./constants')

function searchTeams(query) {
  if (!query || typeof query !== 'string') return []

  const upperQuery = query.toUpperCase()
  const matches = []

  // Check abbreviations
  VALID_TEAM_ABBREVIATIONS.forEach(abbr => {
    if (abbr.includes(upperQuery)) {
      matches.push(abbr)
    }
  })

  // Check team names
  VALID_TEAM_ABBREVIATIONS.forEach(abbr => {
    const team = NBA_TEAMS[abbr]
    if (team.name.toUpperCase().includes(upperQuery)) {
      matches.push(abbr)
    }
  })

  return [...new Set(matches)]
}

function formatTeamList(teams, includeNames = false) {
  if (!Array.isArray(teams) || teams.length === 0) {
    return 'No teams'
  }

  if (includeNames) {
    return teams.map(abbr => {
      const team = NBA_TEAMS[abbr]
      return team ? `${abbr} (${team.name})` : abbr
    }).join(', ')
  }

  return teams.join(', ')
}

function getTeamSuggestions(input) {
  if (!input || typeof input !== 'string') return []

  const upperInput = input.toUpperCase()
  const suggestions = []

  // Find teams that start with the input
  VALID_TEAM_ABBREVIATIONS.forEach(abbr => {
    if (abbr.startsWith(upperInput)) {
      suggestions.push(abbr)
    }
  })

  // Find teams whose names start with the input
  VALID_TEAM_ABBREVIATIONS.forEach(abbr => {
    const team = NBA_TEAMS[abbr]
    if (team.name.toUpperCase().startsWith(upperInput)) {
      suggestions.push(abbr)
    }
  })

  // Find teams that contain the input
  if (suggestions.length < 5) {
    VALID_TEAM_ABBREVIATIONS.forEach(abbr => {
      const team = NBA_TEAMS[abbr]
      if (team.name.toUpperCase().includes(upperInput) && !suggestions.includes(abbr)) {
        suggestions.push(abbr)
      }
    })
  }

  return suggestions.slice(0, 5)
}

module.exports = {
  searchTeams,
  formatTeamList,
  getTeamSuggestions
}
