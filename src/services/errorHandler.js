/**
 * Error handling and retry logic for API requests
 */

// Error types for classification
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.1
}

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 60,
  requestWindow: 60000, // 1 minute in milliseconds
  cooldownPeriod: 5000 // 5 seconds
}

// Request tracking for rate limiting
const requestTracker = {
  requests: [],
  isRateLimited: false,
  rateLimitUntil: null
}

/**
 * Classify error type based on error properties
 * @param {Error} error - The error to classify
 * @returns {string} Error type from ERROR_TYPES
 */
const classifyError = (error) => {
  // Network connectivity errors
  if (error.code === 'ENOTFOUND' || 
      error.code === 'ECONNREFUSED' || 
      error.code === 'ENETUNREACH' ||
      error.code === 'EHOSTUNREACH') {
    return ERROR_TYPES.NETWORK
  }
  
  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return ERROR_TYPES.TIMEOUT
  }
  
  // HTTP response errors
  if (error.response?.status) {
    const status = error.response.status
    
    if (status === 429) {
      return ERROR_TYPES.RATE_LIMITED
    }
    
    if (status >= 500) {
      return ERROR_TYPES.SERVER_ERROR
    }
    
    if (status >= 400) {
      return ERROR_TYPES.CLIENT_ERROR
    }
  }
  
  return ERROR_TYPES.UNKNOWN
}

/**
 * Determine if an error is retryable
 * @param {Error} error - The error to check
 * @param {number} attemptCount - Current attempt number
 * @returns {boolean} Whether the error should be retried
 */
const isRetryableError = (error, attemptCount = 0) => {
  if (attemptCount >= RETRY_CONFIG.maxRetries) {
    return false
  }
  
  const errorType = classifyError(error)
  
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.TIMEOUT:
    case ERROR_TYPES.SERVER_ERROR:
    case ERROR_TYPES.RATE_LIMITED:
      return true
    
    case ERROR_TYPES.CLIENT_ERROR:
    case ERROR_TYPES.UNKNOWN:
    default:
      return false
  }
}

/**
 * Calculate delay for exponential backoff with jitter
 * @param {number} attemptCount - Current attempt number (0-based)
 * @param {Error} error - The error that occurred
 * @returns {number} Delay in milliseconds
 */
const calculateRetryDelay = (attemptCount, error) => {
  const errorType = classifyError(error)
  
  // Special handling for rate limiting
  if (errorType === ERROR_TYPES.RATE_LIMITED) {
    const retryAfter = error.response?.headers?.['retry-after']
    if (retryAfter) {
      return parseInt(retryAfter) * 1000 // Convert to milliseconds
    }
    return RATE_LIMIT_CONFIG.cooldownPeriod
  }
  
  // Exponential backoff with jitter
  const baseDelay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptCount)
  const jitter = baseDelay * RETRY_CONFIG.jitterFactor * Math.random()
  const delay = Math.min(baseDelay + jitter, RETRY_CONFIG.maxDelay)
  
  return Math.floor(delay)
}

/**
 * Check if we're currently rate limited
 * @returns {boolean} Whether requests are currently rate limited
 */
const isCurrentlyRateLimited = () => {
  const now = Date.now()
  
  // Check if we're in a cooldown period
  if (requestTracker.rateLimitUntil && now < requestTracker.rateLimitUntil) {
    return true
  }
  
  // Clear expired cooldown
  if (requestTracker.rateLimitUntil && now >= requestTracker.rateLimitUntil) {
    requestTracker.rateLimitUntil = null
    requestTracker.isRateLimited = false
  }
  
  // Clean old requests from tracker
  const windowStart = now - RATE_LIMIT_CONFIG.requestWindow
  requestTracker.requests = requestTracker.requests.filter(time => time > windowStart)
  
  // Check if we've exceeded the rate limit
  if (requestTracker.requests.length >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
    requestTracker.isRateLimited = true
    requestTracker.rateLimitUntil = now + RATE_LIMIT_CONFIG.cooldownPeriod
    return true
  }
  
  return false
}

/**
 * Record a request for rate limiting tracking
 */
const recordRequest = () => {
  const now = Date.now()
  requestTracker.requests.push(now)
  
  // Clean old requests
  const windowStart = now - RATE_LIMIT_CONFIG.requestWindow
  requestTracker.requests = requestTracker.requests.filter(time => time > windowStart)
}

/**
 * Create a retry wrapper for async functions
 * @param {Function} fn - The async function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped function with retry logic
 */
const withRetry = (fn, options = {}) => {
  const config = { ...RETRY_CONFIG, ...options }
  
  return async (...args) => {
    let lastError
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Check rate limiting before making request
        if (isCurrentlyRateLimited()) {
          const delay = requestTracker.rateLimitUntil - Date.now()
          throw new Error(`Rate limited. Please wait ${Math.ceil(delay / 1000)} seconds.`)
        }
        
        // Record the request
        recordRequest()
        
        // Execute the function
        const result = await fn(...args)
        return result
        
      } catch (error) {
        lastError = error
        
        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {
          break
        }
        
        // Check if error is retryable
        if (!isRetryableError(error, attempt)) {
          break
        }
        
        // Calculate and wait for retry delay
        const delay = calculateRetryDelay(attempt, error)
        console.warn(`Request failed (attempt ${attempt + 1}/${config.maxRetries + 1}). Retrying in ${delay}ms...`, error.message)
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // All retries exhausted, throw the last error
    throw lastError
  }
}

/**
 * Create enhanced error information for user display
 * @param {Error} error - The error to enhance
 * @param {string} context - Context where the error occurred
 * @returns {Object} Enhanced error information
 */
const createErrorInfo = (error, context = 'API request') => {
  const errorType = classifyError(error)
  const isRetryable = isRetryableError(error)
  
  let userMessage = ''
  let technicalMessage = error.message || 'Unknown error'
  let suggestions = []
  
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      userMessage = 'Network connection failed'
      suggestions = [
        'Check your internet connection',
        'Try again in a few moments',
        'Verify that ESPN.com is accessible'
      ]
      break
      
    case ERROR_TYPES.RATE_LIMITED:
      userMessage = 'Too many requests sent'
      suggestions = [
        'Wait a moment before trying again',
        'The app will automatically retry shortly'
      ]
      break
      
    case ERROR_TYPES.SERVER_ERROR:
      userMessage = 'ESPN servers are temporarily unavailable'
      suggestions = [
        'Try again in a few minutes',
        'Check ESPN.com status if the problem persists'
      ]
      break
      
    case ERROR_TYPES.TIMEOUT:
      userMessage = 'Request timed out'
      suggestions = [
        'Check your internet connection speed',
        'Try again with a more stable connection'
      ]
      break
      
    case ERROR_TYPES.CLIENT_ERROR:
      userMessage = 'Invalid request or data not found'
      suggestions = [
        'The requested game may not exist',
        'Try selecting a different game or date'
      ]
      break
      
    default:
      userMessage = 'An unexpected error occurred'
      suggestions = [
        'Try again in a few moments',
        'Restart the application if the problem persists'
      ]
  }
  
  return {
    type: errorType,
    userMessage,
    technicalMessage,
    suggestions,
    isRetryable,
    context,
    timestamp: new Date().toISOString(),
    statusCode: error.response?.status,
    errorCode: error.code
  }
}

/**
 * Log error information for debugging
 * @param {Object} errorInfo - Enhanced error information
 */
const logError = (errorInfo) => {
  const { type, context, technicalMessage, statusCode, errorCode, timestamp } = errorInfo
  
  console.error(`[${timestamp}] ${type} Error in ${context}:`)
  console.error(`  Message: ${technicalMessage}`)
  if (statusCode) console.error(`  Status Code: ${statusCode}`)
  if (errorCode) console.error(`  Error Code: ${errorCode}`)
}

/**
 * Get current rate limiting status
 * @returns {Object} Rate limiting status information
 */
const getRateLimitStatus = () => {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_CONFIG.requestWindow
  const recentRequests = requestTracker.requests.filter(time => time > windowStart).length
  
  return {
    isRateLimited: requestTracker.isRateLimited,
    rateLimitUntil: requestTracker.rateLimitUntil,
    requestsInWindow: recentRequests,
    maxRequestsPerWindow: RATE_LIMIT_CONFIG.maxRequestsPerMinute,
    windowTimeRemaining: Math.max(0, RATE_LIMIT_CONFIG.requestWindow - (now - Math.min(...requestTracker.requests, now))),
    cooldownTimeRemaining: requestTracker.rateLimitUntil ? Math.max(0, requestTracker.rateLimitUntil - now) : 0
  }
}

module.exports = {
  ERROR_TYPES,
  RETRY_CONFIG,
  RATE_LIMIT_CONFIG,
  classifyError,
  isRetryableError,
  calculateRetryDelay,
  isCurrentlyRateLimited,
  recordRequest,
  withRetry,
  createErrorInfo,
  logError,
  getRateLimitStatus,
  default: {
    ERROR_TYPES,
    RETRY_CONFIG,
    RATE_LIMIT_CONFIG,
    classifyError,
    isRetryableError,
    calculateRetryDelay,
    isCurrentlyRateLimited,
    recordRequest,
    withRetry,
    createErrorInfo,
    logError,
    getRateLimitStatus
  }
}