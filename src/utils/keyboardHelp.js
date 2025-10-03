/**
 * Keyboard shortcuts help system
 * Provides centralized management of keyboard shortcuts and help display
 */

const { globalShortcutRegistry } = require('./navigation');

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
};

/**
 * Initialize keyboard shortcuts registry
 * Registers all application shortcuts with the global registry
 */
const initializeShortcuts = () => {
  Object.entries(APP_SHORTCUTS).forEach(([id, shortcut]) => {
    globalShortcutRegistry.register(id, shortcut);
  });
};

/**
 * Get help text for specific view or all shortcuts
 * @param {string} view - View name ('scoreboard', 'game', 'global', or null for all)
 * @returns {string} Formatted help text
 */
const getHelpText = (view = null) => {
  let title = 'Tipoff - Keyboard Shortcuts';
  let shortcuts;
  
  switch (view) {
    case 'scoreboard':
      title = 'Scoreboard - Keyboard Shortcuts';
      shortcuts = [
        ...globalShortcutRegistry.getGlobalShortcuts(),
        ...globalShortcutRegistry.getByCategory('Navigation'),
        ...globalShortcutRegistry.getByCategory('Scoreboard')
      ];
      break;
      
    case 'game':
      title = 'Game View - Keyboard Shortcuts';
      shortcuts = [
        ...globalShortcutRegistry.getGlobalShortcuts(),
        ...globalShortcutRegistry.getByCategory('Navigation'),
        ...globalShortcutRegistry.getByCategory('Game View')
      ];
      break;
      
    case 'global':
      title = 'Global - Keyboard Shortcuts';
      shortcuts = globalShortcutRegistry.getGlobalShortcuts();
      break;
      
    default:
      shortcuts = Array.from(globalShortcutRegistry.shortcuts.values());
      break;
  }
  
  if (shortcuts.length === 0) {
    return `${title}\n${'='.repeat(title.length)}\n\nNo shortcuts available.`;
  }
  
  // Group shortcuts by category
  const grouped = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {});
  
  let helpText = `${title}\n${'='.repeat(title.length)}\n`;
  
  // Define category order
  const categoryOrder = ['Global', 'Navigation', 'Scoreboard', 'Game View', 'Help'];
  
  categoryOrder.forEach(category => {
    if (grouped[category]) {
      helpText += `\n${category}:\n`;
      
      grouped[category].forEach(shortcut => {
        const keys = Array.isArray(shortcut.keys) ? shortcut.keys.join(', ') : shortcut.keys;
        helpText += `  ${keys.padEnd(20)} ${shortcut.description}\n`;
      });
    }
  });
  
  // Add any remaining categories not in the order
  Object.entries(grouped).forEach(([category, catShortcuts]) => {
    if (!categoryOrder.includes(category)) {
      helpText += `\n${category}:\n`;
      
      catShortcuts.forEach(shortcut => {
        const keys = Array.isArray(shortcut.keys) ? shortcut.keys.join(', ') : shortcut.keys;
        helpText += `  ${keys.padEnd(20)} ${shortcut.description}\n`;
      });
    }
  });
  
  return helpText;
};

/**
 * Get compact help text for footer display
 * @param {string} view - Current view name
 * @returns {string} Compact help text for footer
 */
const getFooterHelpText = (view = 'scoreboard') => {
  switch (view) {
    case 'scoreboard':
      return 'Navigation: ↑↓/jk=Select  Enter=View  n/p=Date  t=Today  c=Scoreboard  q=Quit  ?=Help';
      
    case 'game':
      return 'Navigation: ↑↓/jk=Scroll  c=Scoreboard  q=Quit  ?=Help';
      
    default:
      return 'q=Quit  ?=Help';
  }
};

/**
 * Create a help modal component content
 * @param {string} view - Current view name
 * @returns {Object} Modal configuration
 */
const createHelpModal = (view = null) => {
  const helpText = getHelpText(view);
  
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
  };
};

/**
 * Format key combination for display
 * @param {string|string[]} keys - Key or array of keys
 * @returns {string} Formatted key combination
 */
const formatKeys = (keys) => {
  if (Array.isArray(keys)) {
    return keys.join(' or ');
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
  };
  
  return keyMap[keys.toLowerCase()] || keys;
};

/**
 * Check if help should be shown for a key press
 * @param {string} keyName - Key that was pressed
 * @returns {boolean} True if help should be shown
 */
const isHelpKey = (keyName) => {
  return keyName === '?' || keyName === 'h';
};

/**
 * Get context-sensitive shortcuts for current state
 * @param {Object} context - Current application context
 * @param {string} context.view - Current view
 * @param {boolean} context.hasSelection - Whether something is selected
 * @param {boolean} context.isLoading - Whether data is loading
 * @returns {Array} Array of relevant shortcuts
 */
const getContextualShortcuts = (context = {}) => {
  const { view = 'scoreboard', hasSelection = false, isLoading = false } = context;
  
  let shortcuts = [...globalShortcutRegistry.getGlobalShortcuts()];
  
  if (!isLoading) {
    shortcuts.push(...globalShortcutRegistry.getByCategory('Navigation'));
    
    if (view === 'scoreboard') {
      shortcuts.push(...globalShortcutRegistry.getByCategory('Scoreboard'));
    } else if (view === 'game') {
      shortcuts.push(...globalShortcutRegistry.getByCategory('Game View'));
    }
  }
  
  return shortcuts.filter(shortcut => {
    // Filter based on context
    if (shortcut.id.includes('enter') && !hasSelection) {
      return false;
    }
    
    return true;
  });
};

module.exports = {
  APP_SHORTCUTS,
  initializeShortcuts,
  getHelpText,
  getFooterHelpText,
  createHelpModal,
  formatKeys,
  isHelpKey,
  getContextualShortcuts
};