const { APP_SHORTCUTS } = require('./shortcuts')
const { getHelpText, getFooterHelpText, createHelpModal } = require('./helpText')
const { formatKeys, isHelpKey, getContextualShortcuts } = require('./contextHelpers')
const { globalShortcutRegistry } = require('../navigation')

/**
 * Initialize keyboard shortcuts registry
 * Registers all application shortcuts with the global registry
 */
const initializeShortcuts = () => {
  Object.entries(APP_SHORTCUTS).forEach(([id, shortcut]) => {
    globalShortcutRegistry.register(id, shortcut)
  })
}

module.exports = {
  APP_SHORTCUTS,
  initializeShortcuts,
  getHelpText,
  getFooterHelpText,
  createHelpModal,
  formatKeys,
  isHelpKey,
  getContextualShortcuts
}
