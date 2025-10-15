const { DIRECTIONS, KEY_MAPPINGS } = require('./directions')

const calculateNewIndex = (currentIndex, listLength, direction, options = {}) => {
  const { wrap = true, pageSize = 10 } = options

  if (listLength === 0) return -1

  let newIndex = currentIndex

  switch (direction) {
    case DIRECTIONS.UP:
      newIndex = currentIndex - 1
      if (newIndex < 0) {
        newIndex = wrap ? listLength - 1 : 0
      }
      break

    case DIRECTIONS.DOWN:
      newIndex = currentIndex + 1
      if (newIndex >= listLength) {
        newIndex = wrap ? 0 : listLength - 1
      }
      break

    case DIRECTIONS.HOME:
      newIndex = 0
      break

    case DIRECTIONS.END:
      newIndex = listLength - 1
      break

    case DIRECTIONS.PAGE_UP:
      newIndex = Math.max(0, currentIndex - pageSize)
      break

    case DIRECTIONS.PAGE_DOWN:
      newIndex = Math.min(listLength - 1, currentIndex + pageSize)
      break

    default:
      return currentIndex
  }

  return Math.max(0, Math.min(listLength - 1, newIndex))
}

const getNavigationDirection = (keyName, mappings = null) => {
  if (!keyName) return null

  // Use default mappings if none provided
  if (!mappings) {
    mappings = { ...KEY_MAPPINGS.ARROWS, ...KEY_MAPPINGS.VIM }
  }

  return mappings[keyName.toLowerCase()] || null
}

const isNavigationKey = (keyName, mappings = null) => {
  return getNavigationDirection(keyName, mappings) !== null
}

const createNavigationHandler = (onNavigate, options = {}) => {
  const { mappings = null, preventDefault = true } = options

  return (key, ch) => {
    const direction = getNavigationDirection(key.name, mappings)
    if (!direction) return false

    if (preventDefault && key.preventDefault) {
      key.preventDefault()
    }

    try {
      return onNavigate(direction, key, ch)
    } catch (error) {
      console.error('Error in navigation handler:', error)
      return false
    }
  }
}

const calculateScrollPosition = (selectedIndex, listLength, viewportHeight, currentScrollTop = 0) => {
  if (listLength <= viewportHeight) {
    return {
      scrollTop: 0,
      scrollBottom: listLength - 1,
      needsScroll: false
    }
  }

  let newScrollTop = currentScrollTop

  // If selected item is above viewport, scroll up
  if (selectedIndex < currentScrollTop) {
    newScrollTop = selectedIndex
  }
  // If selected item is below viewport, scroll down
  else if (selectedIndex >= currentScrollTop + viewportHeight) {
    newScrollTop = selectedIndex - viewportHeight + 1
  }

  // Ensure scroll position is within bounds
  newScrollTop = Math.max(0, Math.min(listLength - viewportHeight, newScrollTop))

  return {
    scrollTop: newScrollTop,
    scrollBottom: newScrollTop + viewportHeight - 1,
    needsScroll: newScrollTop !== currentScrollTop
  }
}

module.exports = {
  calculateNewIndex,
  getNavigationDirection,
  isNavigationKey,
  createNavigationHandler,
  calculateScrollPosition
}
