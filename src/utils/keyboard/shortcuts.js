/**
 * Application-specific keyboard shortcuts
 * These are registered with the global shortcut registry
 */
const APP_SHORTCUTS = {
  // Global navigation
  'nav-scoreboard': {
    keys: 'c',
    description: 'Return to scoreboard view',
    category: 'Navigation',
    global: true
  },

  'nav-next-day': {
    keys: 'n',
    description: 'Navigate to next day',
    category: 'Navigation',
    global: false
  },

  'nav-prev-day': {
    keys: 'p',
    description: 'Navigate to previous day',
    category: 'Navigation',
    global: false
  },

  'nav-today': {
    keys: 't',
    description: 'Navigate to today',
    category: 'Navigation',
    global: false
  },

  // Scoreboard shortcuts
  'scoreboard-up': {
    keys: ['↑', 'k'],
    description: 'Select previous game',
    category: 'Scoreboard',
    global: false
  },

  'scoreboard-down': {
    keys: ['↓', 'j'],
    description: 'Select next game',
    category: 'Scoreboard',
    global: false
  },

  'scoreboard-home': {
    keys: 'Home',
    description: 'Select first game',
    category: 'Scoreboard',
    global: false
  },

  'scoreboard-end': {
    keys: 'End',
    description: 'Select last game',
    category: 'Scoreboard',
    global: false
  },

  'scoreboard-enter': {
    keys: 'Enter',
    description: 'View selected game',
    category: 'Scoreboard',
    global: false
  },

  // Game view shortcuts
  'game-scroll-up': {
    keys: ['↑', 'k'],
    description: 'Scroll play-by-play up',
    category: 'Game View',
    global: false
  },

  'game-scroll-down': {
    keys: ['↓', 'j'],
    description: 'Scroll play-by-play down',
    category: 'Game View',
    global: false
  },

  'game-scroll-page-up': {
    keys: 'Page Up',
    description: 'Scroll play-by-play page up',
    category: 'Game View',
    global: false
  },

  'game-scroll-page-down': {
    keys: 'Page Down',
    description: 'Scroll play-by-play page down',
    category: 'Game View',
    global: false
  },

  'game-scroll-top': {
    keys: 'Home',
    description: 'Scroll to top of play-by-play',
    category: 'Game View',
    global: false
  },

  'game-scroll-bottom': {
    keys: 'End',
    description: 'Scroll to bottom of play-by-play',
    category: 'Game View',
    global: false
  },

  // Help
  'show-help': {
    keys: ['?', 'h'],
    description: 'Show keyboard shortcuts help',
    category: 'Help',
    global: true
  }
}

module.exports = {
  APP_SHORTCUTS
}
