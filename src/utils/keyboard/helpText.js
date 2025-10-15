const { globalShortcutRegistry } = require('../navigation')

/**
 * Get help text for specific view or all shortcuts
 * @param {string} view - View name ('scoreboard', 'game', 'global', or null for all)
 * @returns {string} Formatted help text
 */
const getHelpText = (view = null) => {
  let title = 'Tipoff - Keyboard Shortcuts'
  let shortcuts

  switch (view) {
    case 'scoreboard':
      title = 'Scoreboard - Keyboard Shortcuts'
      shortcuts = [
        ...globalShortcutRegistry.getGlobalShortcuts(),
        ...globalShortcutRegistry.getByCategory('Navigation'),
        ...globalShortcutRegistry.getByCategory('Scoreboard')
      ]
      break

    case 'game':
      title = 'Game View - Keyboard Shortcuts'
      shortcuts = [
        ...globalShortcutRegistry.getGlobalShortcuts(),
        ...globalShortcutRegistry.getByCategory('Navigation'),
        ...globalShortcutRegistry.getByCategory('Game View')
      ]
      break

    case 'global':
      title = 'Global - Keyboard Shortcuts'
      shortcuts = globalShortcutRegistry.getGlobalShortcuts()
      break

    default:
      shortcuts = Array.from(globalShortcutRegistry.shortcuts.values())
      break
  }

  if (shortcuts.length === 0) {
    return `${title}\n${'='.repeat(title.length)}\n\nNo shortcuts available.`
  }

  // Group shortcuts by category
  const grouped = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category
    if (!acc[category]) acc[category] = []
    acc[category].push(shortcut)
    return acc
  }, {})

  let helpText = `${title}\n${'='.repeat(title.length)}\n`

  // Define category order
  const categoryOrder = ['Global', 'Navigation', 'Scoreboard', 'Game View', 'Help']

  categoryOrder.forEach(category => {
    if (grouped[category]) {
      helpText += `\n${category}:\n`

      grouped[category].forEach(shortcut => {
        const keys = Array.isArray(shortcut.keys) ? shortcut.keys.join(', ') : shortcut.keys
        helpText += `  ${keys.padEnd(20)} ${shortcut.description}\n`
      })
    }
  })

  // Add any remaining categories not in the order
  Object.entries(grouped).forEach(([category, catShortcuts]) => {
    if (!categoryOrder.includes(category)) {
      helpText += `\n${category}:\n`

      catShortcuts.forEach(shortcut => {
        const keys = Array.isArray(shortcut.keys) ? shortcut.keys.join(', ') : shortcut.keys
        helpText += `  ${keys.padEnd(20)} ${shortcut.description}\n`
      })
    }
  })

  return helpText
}

/**
 * Get compact help text for footer display
 * @param {string} view - Current view name
 * @returns {string} Compact help text for footer
 */
const getFooterHelpText = (view = 'scoreboard') => {
  switch (view) {
    case 'scoreboard':
      return 'Navigation: ↑↓/jk=Select  Enter=View  n/p=Date  t=Today  c=Scoreboard  q=Quit  ?=Help'

    case 'game':
      return 'Navigation: ↑↓/jk=Scroll  c=Scoreboard  q=Quit  ?=Help'

    default:
      return 'q=Quit  ?=Help'
  }
}

/**
 * Create a help modal component content
 * @param {string} view - Current view name
 * @returns {Object} Modal configuration
 */
const createHelpModal = (view = null) => {
  const helpText = getHelpText(view)

  return {
    title: 'Keyboard Shortcuts',
    content: helpText,
    width: '80%',
    height: '80%',
    style: {
      fg: 'white',
      bg: 'black',
      border: {
        fg: 'cyan'
      }
    },
    border: {
      type: 'line'
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray'
      },
      style: {
        inverse: true
      }
    },
    keys: true,
    vi: true
  }
}

module.exports = {
  getHelpText,
  getFooterHelpText,
  createHelpModal
}
