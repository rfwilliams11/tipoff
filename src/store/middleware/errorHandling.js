// Custom middleware for error handling and logging
const errorHandlingMiddleware = (store) => (next) => (action) => {
  try {
    return next(action)
  } catch (error) {
    console.error('Redux action error:', error)
    // In a terminal app, we might want to show errors differently
    // but for now, we'll just log them
    return next({
      type: 'error/actionError',
      payload: { error: error.message, action: action.type }
    })
  }
}

module.exports = {
  errorHandlingMiddleware
}
