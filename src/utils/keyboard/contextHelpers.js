const { globalShortcutRegistry } = require('../navigation')

/**
 * Format key combination for display
 * @param {string|string[]} keys - Key or array of keys
 * @returns {string} Formatted key combination
 */
const formatKeys = (keys) => {
  if (Array.isArray(keys)) {
    return keys.join(' or ')
  }

  // Handle special key formatting
  const keyMap = {
    'up': '↑',
    'down': '↓',
    'left': '←',
    'right': '→',
    'enter': 'Enter',
    'escape': 'ESC',
    'space': 'Space',
    'tab': 'Tab',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'home': 'Home',
    'end': 'End',
    'pageup': 'Page Up',
    'pagedown': 'Page Down'
  }

  return keyMap[keys.toLowerCase()] || keys
}

/**
 * Check if help should be shown for a key press
 * @param {string} keyName - Key that was pressed
 * @returns {boolean} True if help should be shown
 */
const isHelpKey = (keyName) => {
  return keyName === '?' || keyName === 'h'
}

/**
 * Get context-sensitive shortcuts for current state
 * @param {Object} context - Current application context
 * @param {string} context.view - Current view
 * @param {boolean} context.hasSelection - Whether something is selected
 * @param {boolean} context.isLoading - Whether data is loading
 * @returns {Array} Array of relevant shortcuts
 */
const getContextualShortcuts = (context = {}) => {
  const { view = 'scoreboard', hasSelection = false, isLoading = false } = context

  let shortcuts = [...globalShortcutRegistry.getGlobalShortcuts()]

  if (!isLoading) {
    shortcuts.push(...globalShortcutRegistry.getByCategory('Navigation'))

    if (view === 'scoreboard') {
      shortcuts.push(...globalShortcutRegistry.getByCategory('Scoreboard'))
    } else if (view === 'game') {
      shortcuts.push(...globalShortcutRegistry.getByCategory('Game View'))
    }
  }

  return shortcuts.filter(shortcut => {
    // Filter based on context
    if (shortcut.id.includes('enter') && !hasSelection) {
      return false
    }

    return true
  })
}

module.exports = {
  formatKeys,
  isHelpKey,
  getContextualShortcuts
}
