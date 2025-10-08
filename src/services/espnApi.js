const axios = require('axios')
const { format } = require('date-fns')
const { withRetry, createErrorInfo, logError, recordRequest, isCurrentlyRateLimited } = require('./errorHandler')

// ESPN API base URLs
const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: ESPN_BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Tipoff/1.0.0 (Terminal NBA Viewer)',
    'Cache-Control': 'no-cache'
  }
})

// Add request interceptor for rate limiting and logging
apiClient.interceptors.request.use(
  (config) => {
    // Check rate limiting before making request
    if (isCurrentlyRateLimited()) {
      const error = new Error('Rate limited - too many requests')
      error.code = 'RATE_LIMITED'
      return Promise.reject(error)
    }

    // Log only in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`ESPN API Request: ${config.method?.toUpperCase()} ${config.url}`)
    }
    return config
  },
  (error) => {
    const errorInfo = createErrorInfo(error, 'API request setup')
    logError(errorInfo)
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response) => {
    // Log only in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`ESPN API Response: ${response.status} ${response.config.url} (${response.data ? 'with data' : 'no data'})`)
    }
    return response
  },
  (error) => {
    const errorInfo = createErrorInfo(error, 'API response')
    logError(errorInfo)
    
    // Enhance error with additional context
    if (error.response?.status === 429) {
      error.message = 'Rate limit exceeded. Please wait before making more requests.'
    } else if (error.response?.status >= 500) {
      error.message = 'ESPN servers are currently experiencing issues. Please try again later.'
    } else if (error.response?.status === 404) {
      error.message = 'Requested data not found. The game or date may not be available.'
    }
    
    return Promise.reject(error)
  }
)

// Create retry-wrapped API functions
const makeScoreboardRequest = withRetry(async (date) => {
  const dateStr = format(date, 'yyyyMMdd')
  const response = await apiClient.get(`/scoreboard`, {
    params: {
      dates: dateStr,
      limit: 50
    }
  })
  return response.data
}, {
  maxRetries: 3,
  baseDelay: 1000
})

const makeGameDetailRequest = withRetry(async (gameId) => {
  const response = await apiClient.get(`/summary`, {
    params: {
      event: gameId
    }
  })
  return response.data
}, {
  maxRetries: 3,
  baseDelay: 1000
})

/**
 * Fetch scoreboard data for a specific date with retry logic
 * @param {Date} date - The date to fetch games for
 * @returns {Promise<Object>} Scoreboard data
 */
const fetchScoreboardData = async (date) => {
  try {
    const data = await makeScoreboardRequest(date)
    
    if (!data) {
      throw new Error('No data received from ESPN API')
    }
    
    return data
  } catch (error) {
    const errorInfo = createErrorInfo(error, 'fetchScoreboardData')
    logError(errorInfo)
    
    // Re-throw with enhanced message
    const enhancedError = new Error(errorInfo.userMessage)
    enhancedError.originalError = error
    enhancedError.errorInfo = errorInfo
    throw enhancedError
  }
}

/**
 * Fetch detailed game data including play-by-play and box score with retry logic
 * @param {string} gameId - The ESPN game ID
 * @returns {Promise<Object>} Game detail data
 */
const fetchGameDetailData = async (gameId) => {
  try {
    if (!gameId) {
      throw new Error('Game ID is required')
    }
    
    const data = await makeGameDetailRequest(gameId)
    
    if (!data) {
      throw new Error('No game data received from ESPN API')
    }
    
    return data
  } catch (error) {
    const errorInfo = createErrorInfo(error, 'fetchGameDetailData')
    logError(errorInfo)
    
    // Re-throw with enhanced message
    const enhancedError = new Error(errorInfo.userMessage)
    enhancedError.originalError = error
    enhancedError.errorInfo = errorInfo
    throw enhancedError
  }
}

/**
 * Map ESPN scoreboard response to internal game format
 * @param {Object} espnResponse - Raw ESPN scoreboard response
 * @returns {Array} Array of mapped game objects
 */
const mapScoreboardResponse = (espnResponse) => {
  if (!espnResponse?.events) {
    return []
  }

  return espnResponse.events.map(event => {
    const competition = event.competitions?.[0]
    if (!competition) return null

    const homeCompetitor = competition.competitors?.find(c => c.homeAway === 'home')
    const awayCompetitor = competition.competitors?.find(c => c.homeAway === 'away')

    if (!homeCompetitor || !awayCompetitor) return null

    return {
      id: event.id,
      homeTeam: {
        id: homeCompetitor.team.id,
        name: homeCompetitor.team.displayName,
        abbreviation: homeCompetitor.team.abbreviation,
        color: homeCompetitor.team.color || '000000',
        logo: homeCompetitor.team.logo,
        score: parseInt(homeCompetitor.score) || 0
      },
      awayTeam: {
        id: awayCompetitor.team.id,
        name: awayCompetitor.team.displayName,
        abbreviation: awayCompetitor.team.abbreviation,
        color: awayCompetitor.team.color || '000000',
        logo: awayCompetitor.team.logo,
        score: parseInt(awayCompetitor.score) || 0
      },
      status: {
        completed: competition.status?.type?.completed || false,
        description: competition.status?.type?.description || 'Unknown',
        detail: competition.status?.type?.detail || '',
        displayClock: competition.status?.displayClock || '',
        period: competition.status?.period || 0
      },
      startTime: new Date(event.date).toISOString(),
      venue: competition.venue?.fullName || 'Unknown Venue'
    }
  }).filter(Boolean) // Remove null entries
}

/**
 * Map ESPN game detail response to internal game detail format
 * @param {Object} espnResponse - Raw ESPN game detail response
 * @returns {Object} Mapped game detail object
 */
const mapGameDetailResponse = (espnResponse) => {
  if (!espnResponse?.header?.competitions?.[0]) {
    throw new Error('Invalid game detail response structure')
  }

  const competition = espnResponse.header.competitions[0]
  const homeCompetitor = competition.competitors?.find(c => c.homeAway === 'home')
  const awayCompetitor = competition.competitors?.find(c => c.homeAway === 'away')

  if (!homeCompetitor || !awayCompetitor) {
    throw new Error('Missing team data in game detail response')
  }

  return {
    gameData: {
      teams: [
        {
          id: homeCompetitor.team.id,
          name: homeCompetitor.team.displayName,
          abbreviation: homeCompetitor.team.abbreviation,
          color: homeCompetitor.team.color || '000000',
          logo: homeCompetitor.team.logo,
          score: parseInt(homeCompetitor.score) || 0,
          homeAway: 'home',
          statistics: homeCompetitor.statistics || []
        },
        {
          id: awayCompetitor.team.id,
          name: awayCompetitor.team.displayName,
          abbreviation: awayCompetitor.team.abbreviation,
          color: awayCompetitor.team.color || '000000',
          logo: awayCompetitor.team.logo,
          score: parseInt(awayCompetitor.score) || 0,
          homeAway: 'away',
          statistics: awayCompetitor.statistics || []
        }
      ],
      status: {
        completed: competition.status?.type?.completed || false,
        description: competition.status?.type?.description || 'Unknown',
        detail: competition.status?.type?.detail || '',
        displayClock: competition.status?.displayClock || '',
        period: competition.status?.period || 0
      },
      startTime: espnResponse.header?.competitions?.[0]?.date || new Date().toISOString(),
      venue: competition.venue?.fullName || 'Unknown Venue'
    },
    liveData: {
      boxscore: mapBoxScoreData(espnResponse.boxscore),
      plays: mapPlayByPlayData(espnResponse.plays),
      currentPlay: mapCurrentPlay(espnResponse.plays?.current),
      leaders: mapLeadersData(espnResponse.leaders)
    }
  }
}

/**
 * Map ESPN box score data to internal format
 * @param {Object} boxscore - ESPN box score data
 * @returns {Array} Mapped box score data
 */
const mapBoxScoreData = (boxscore) => {
  if (!boxscore?.teams) {
    return []
  }

  return boxscore.teams.map(team => ({
    teamId: team.team.id,
    abbreviation: team.team.abbreviation,
    statistics: team.statistics?.map(stat => ({
      name: stat.name,
      displayValue: stat.displayValue,
      abbreviation: stat.abbreviation,
      label: stat.label
    })) || []
  }))
}

/**
 * Map ESPN play-by-play data to internal format
 * @param {Array} plays - ESPN plays data (array of play objects)
 * @returns {Array} Mapped play-by-play data
 */
const mapPlayByPlayData = (plays) => {
  // ESPN API returns plays as a direct array
  if (!plays || !Array.isArray(plays)) {
    return []
  }

  return plays.map(play => ({
    id: play.id,
    sequenceNumber: play.sequenceNumber,
    period: play.period?.number || play.period || 0,
    periodDisplay: play.period?.displayValue || `Q${play.period?.number || play.period || 1}`,
    clock: play.clock?.displayValue || play.clock || '',
    description: play.text || '',
    type: play.type?.text || 'Unknown',
    typeId: play.type?.id || null,
    teamId: play.team?.id || null,
    teamAbbreviation: play.team?.abbreviation || null,
    scoringPlay: play.scoringPlay || false,
    scoreValue: play.scoreValue || 0,
    awayScore: play.awayScore || 0,
    homeScore: play.homeScore || 0,
    shootingPlay: play.shootingPlay || false,
    participants: play.participants?.map(p => ({
      athlete: {
        id: p.athlete?.id,
        displayName: p.athlete?.displayName,
        shortName: p.athlete?.shortName
      }
    })) || []
  }))
}

/**
 * Map ESPN current play data to internal format
 * @param {Object} currentPlay - ESPN current play data
 * @returns {Object|null} Mapped current play data
 */
const mapCurrentPlay = (currentPlay) => {
  if (!currentPlay) {
    return null
  }

  return {
    id: currentPlay.id,
    period: currentPlay.period || 0,
    clock: currentPlay.clock || '',
    description: currentPlay.text || '',
    type: currentPlay.type?.text || 'Unknown',
    teamId: currentPlay.team?.id || null,
    teamAbbreviation: currentPlay.team?.abbreviation || null
  }
}

/**
 * Map ESPN leaders data to internal format
 * @param {Array} leaders - ESPN leaders data
 * @returns {Array} Mapped leaders data
 */
const mapLeadersData = (leaders) => {
  if (!leaders || !Array.isArray(leaders)) {
    return []
  }

  return leaders.map(teamLeaders => ({
    teamId: teamLeaders.team?.id,
    abbreviation: teamLeaders.team?.abbreviation,
    leaders: teamLeaders.leaders?.map(statLeader => ({
      name: statLeader.name,
      displayName: statLeader.displayName,
      leaders: statLeader.leaders?.map(leader => ({
        athlete: {
          id: leader.athlete?.id,
          displayName: leader.athlete?.displayName,
          shortName: leader.athlete?.shortName,
          headshot: leader.athlete?.headshot?.href
        },
        displayValue: leader.displayValue
      })) || []
    })) || []
  }))
}

/**
 * Validate ESPN API response structure
 * @param {Object} response - API response to validate
 * @param {string} type - Type of response ('scoreboard' or 'gameDetail')
 * @returns {boolean} Whether the response is valid
 */
const validateApiResponse = (response, type) => {
  if (!response || typeof response !== 'object') {
    return false
  }

  switch (type) {
    case 'scoreboard':
      return Array.isArray(response.events)
    
    case 'gameDetail':
      return !!(response.header?.competitions?.[0])
    
    default:
      return false
  }
}

/**
 * Get appropriate error message for API errors
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
const getApiErrorMessage = (error) => {
  // If error has enhanced error info, use that
  if (error.errorInfo) {
    return error.errorInfo.userMessage
  }
  
  // Fallback to basic error classification
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return 'Network connection failed. Please check your internet connection.'
  }
  
  if (error.response?.status === 429 || error.code === 'RATE_LIMITED') {
    return 'Too many requests. Please wait a moment before trying again.'
  }
  
  if (error.response?.status >= 500) {
    return 'ESPN servers are currently unavailable. Please try again later.'
  }
  
  if (error.response?.status === 404) {
    return 'Game data not found. The game may not exist or may not be available yet.'
  }
  
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'Request timed out. Please try again.'
  }
  
  return error.message || 'An unexpected error occurred while fetching data.'
}

/**
 * Check if an error is retryable
 * @param {Error} error - The error object
 * @returns {boolean} Whether the error should be retried
 */
const isApiErrorRetryable = (error) => {
  // If error has enhanced error info, use that
  if (error.errorInfo) {
    return error.errorInfo.isRetryable
  }
  
  // Fallback to basic retry logic
  return error.code === 'ENOTFOUND' || 
         error.code === 'ECONNREFUSED' || 
         error.code === 'ECONNABORTED' ||
         error.code === 'ETIMEDOUT' ||
         (error.response?.status >= 500) ||
         error.response?.status === 429
}

module.exports = {
  fetchScoreboardData,
  fetchGameDetailData,
  mapScoreboardResponse,
  mapGameDetailResponse,
  validateApiResponse,
  getApiErrorMessage,
  isApiErrorRetryable,
  default: {
    fetchScoreboardData,
    fetchGameDetailData,
    mapScoreboardResponse,
    mapGameDetailResponse,
    validateApiResponse,
    getApiErrorMessage,
    isApiErrorRetryable
  }
}