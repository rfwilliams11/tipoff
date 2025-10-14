const NBA_TEAMS = {
  'ATL': { id: 1, name: 'Atlanta Hawks', conference: 'Eastern', division: 'Southeast' },
  'BOS': { id: 2, name: 'Boston Celtics', conference: 'Eastern', division: 'Atlantic' },
  'BKN': { id: 17, name: 'Brooklyn Nets', conference: 'Eastern', division: 'Atlantic' },
  'CHA': { id: 30, name: 'Charlotte Hornets', conference: 'Eastern', division: 'Southeast' },
  'CHI': { id: 4, name: 'Chicago Bulls', conference: 'Eastern', division: 'Central' },
  'CLE': { id: 5, name: 'Cleveland Cavaliers', conference: 'Eastern', division: 'Central' },
  'DAL': { id: 6, name: 'Dallas Mavericks', conference: 'Western', division: 'Southwest' },
  'DEN': { id: 7, name: 'Denver Nuggets', conference: 'Western', division: 'Northwest' },
  'DET': { id: 8, name: 'Detroit Pistons', conference: 'Eastern', division: 'Central' },
  'GSW': { id: 9, name: 'Golden State Warriors', conference: 'Western', division: 'Pacific' },
  'HOU': { id: 10, name: 'Houston Rockets', conference: 'Western', division: 'Southwest' },
  'IND': { id: 11, name: 'Indiana Pacers', conference: 'Eastern', division: 'Central' },
  'LAC': { id: 12, name: 'LA Clippers', conference: 'Western', division: 'Pacific' },
  'LAL': { id: 13, name: 'Los Angeles Lakers', conference: 'Western', division: 'Pacific' },
  'MEM': { id: 29, name: 'Memphis Grizzlies', conference: 'Western', division: 'Southwest' },
  'MIA': { id: 14, name: 'Miami Heat', conference: 'Eastern', division: 'Southeast' },
  'MIL': { id: 15, name: 'Milwaukee Bucks', conference: 'Eastern', division: 'Central' },
  'MIN': { id: 16, name: 'Minnesota Timberwolves', conference: 'Western', division: 'Northwest' },
  'NOP': { id: 3, name: 'New Orleans Pelicans', conference: 'Western', division: 'Southwest' },
  'NYK': { id: 18, name: 'New York Knicks', conference: 'Eastern', division: 'Atlantic' },
  'OKC': { id: 25, name: 'Oklahoma City Thunder', conference: 'Western', division: 'Northwest' },
  'ORL': { id: 19, name: 'Orlando Magic', conference: 'Eastern', division: 'Southeast' },
  'PHI': { id: 20, name: 'Philadelphia 76ers', conference: 'Eastern', division: 'Atlantic' },
  'PHX': { id: 21, name: 'Phoenix Suns', conference: 'Western', division: 'Pacific' },
  'POR': { id: 22, name: 'Portland Trail Blazers', conference: 'Western', division: 'Northwest' },
  'SAC': { id: 23, name: 'Sacramento Kings', conference: 'Western', division: 'Pacific' },
  'SAS': { id: 24, name: 'San Antonio Spurs', conference: 'Western', division: 'Southwest' },
  'TOR': { id: 28, name: 'Toronto Raptors', conference: 'Eastern', division: 'Atlantic' },
  'UTA': { id: 26, name: 'Utah Jazz', conference: 'Western', division: 'Northwest' },
  'WAS': { id: 27, name: 'Washington Wizards', conference: 'Eastern', division: 'Southeast' }
}

const VALID_TEAM_ABBREVIATIONS = Object.keys(NBA_TEAMS)

const TEAM_ALIASES = {
  'BRK': 'BKN',
  'NETS': 'BKN',
  'BROOKLYN': 'BKN',
  'CHARLOTTE': 'CHA',
  'HORNETS': 'CHA',
  'CHICAGO': 'CHI',
  'BULLS': 'CHI',
  'CLEVELAND': 'CLE',
  'CAVS': 'CLE',
  'CAVALIERS': 'CLE',
  'DALLAS': 'DAL',
  'MAVERICKS': 'DAL',
  'MAVS': 'DAL',
  'DENVER': 'DEN',
  'NUGGETS': 'DEN',
  'DETROIT': 'DET',
  'PISTONS': 'DET',
  'GOLDEN STATE': 'GSW',
  'WARRIORS': 'GSW',
  'HOUSTON': 'HOU',
  'ROCKETS': 'HOU',
  'INDIANA': 'IND',
  'PACERS': 'IND',
  'CLIPPERS': 'LAC',
  'LAKERS': 'LAL',
  'MEMPHIS': 'MEM',
  'GRIZZLIES': 'MEM',
  'MIAMI': 'MIA',
  'HEAT': 'MIA',
  'MILWAUKEE': 'MIL',
  'BUCKS': 'MIL',
  'MINNESOTA': 'MIN',
  'TIMBERWOLVES': 'MIN',
  'WOLVES': 'MIN',
  'NEW ORLEANS': 'NOP',
  'PELICANS': 'NOP',
  'NEW YORK': 'NYK',
  'KNICKS': 'NYK',
  'OKLAHOMA CITY': 'OKC',
  'THUNDER': 'OKC',
  'ORLANDO': 'ORL',
  'MAGIC': 'ORL',
  'PHILADELPHIA': 'PHI',
  'SIXERS': 'PHI',
  '76ERS': 'PHI',
  'PHOENIX': 'PHX',
  'SUNS': 'PHX',
  'PORTLAND': 'POR',
  'TRAIL BLAZERS': 'POR',
  'BLAZERS': 'POR',
  'SACRAMENTO': 'SAC',
  'KINGS': 'SAC',
  'SAN ANTONIO': 'SAS',
  'SPURS': 'SAS',
  'TORONTO': 'TOR',
  'RAPTORS': 'TOR',
  'UTAH': 'UTA',
  'JAZZ': 'UTA',
  'WASHINGTON': 'WAS',
  'WIZARDS': 'WAS'
}

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