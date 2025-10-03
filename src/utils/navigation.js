/**
 * Navigation utilities for terminal UI
 * Provides focus management, navigation helpers, and keyboard shortcut utilities
 */

/**
 * Navigation directions enum
 */
const DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  HOME: 'home',
  END: 'end',
  PAGE_UP: 'pageup',
  PAGE_DOWN: 'pagedown'
};

/**
 * Key mappings for different navigation styles
 */
const KEY_MAPPINGS = {
  // Arrow keys
  ARROWS: {
    up: DIRECTIONS.UP,
    down: DIRECTIONS.DOWN,
    left: DIRECTIONS.LEFT,
    right: DIRECTIONS.RIGHT,
    home: DIRECTIONS.HOME,
    end: DIRECTIONS.END,
    pageup: DIRECTIONS.PAGE_UP,
    pagedown: DIRECTIONS.PAGE_DOWN
  },
  
  // Vim-style navigation
  VIM: {
    k: DIRECTIONS.UP,
    j: DIRECTIONS.DOWN,
    h: DIRECTIONS.LEFT,
    l: DIRECTIONS.RIGHT,
    g: DIRECTIONS.HOME, // gg for top
    G: DIRECTIONS.END   // G for bottom
  },
  
  // WASD navigation
  WASD: {
    w: DIRECTIONS.UP,
    s: DIRECTIONS.DOWN,
    a: DIRECTIONS.LEFT,
    d: DIRECTIONS.RIGHT
  }
};

/**
 * Focus manager for terminal UI components
 * Handles focus state and navigation between focusable elements
 */
class FocusManager {
  constructor() {
    this.focusableElements = new Map();
    this.currentFocus = null;
    this.focusHistory = [];
  }
  
  /**
   * Register a focusable element
   * @param {string} id - Unique identifier for the element
   * @param {Object} element - Element configuration
   * @param {Function} element.onFocus - Called when element gains focus
   * @param {Function} element.onBlur - Called when element loses focus
   * @param {Function} element.onNavigate - Called for navigation within element
   * @param {number} element.tabIndex - Tab order (optional)
   * @param {boolean} element.disabled - Whether element can receive focus
   */
  register(id, element) {
    this.focusableElements.set(id, {
      id,
      onFocus: element.onFocus || (() => {}),
      onBlur: element.onBlur || (() => {}),
      onNavigate: element.onNavigate || (() => {}),
      tabIndex: element.tabIndex || 0,
      disabled: element.disabled || false,
      ...element
    });
  }
  
  /**
   * Unregister a focusable element
   * @param {string} id - Element identifier
   */
  unregister(id) {
    if (this.currentFocus === id) {
      this.blur();
    }
    this.focusableElements.delete(id);
  }
  
  /**
   * Set focus to an element
   * @param {string} id - Element identifier
   * @returns {boolean} True if focus was set successfully
   */
  focus(id) {
    const element = this.focusableElements.get(id);
    if (!element || element.disabled) {
      return false;
    }
    
    // Blur current element
    if (this.currentFocus && this.currentFocus !== id) {
      this.blur();
    }
    
    // Set new focus
    this.currentFocus = id;
    this.focusHistory.push(id);
    
    // Keep history manageable
    if (this.focusHistory.length > 10) {
      this.focusHistory.shift();
    }
    
    // Call focus handler
    try {
      element.onFocus();
    } catch (error) {
      console.error(`Error in focus handler for ${id}:`, error);
    }
    
    return true;
  }
  
  /**
   * Remove focus from current element
   */
  blur() {
    if (!this.currentFocus) return;
    
    const element = this.focusableElements.get(this.currentFocus);
    if (element) {
      try {
        element.onBlur();
      } catch (error) {
        console.error(`Error in blur handler for ${this.currentFocus}:`, error);
      }
    }
    
    this.currentFocus = null;
  }
  
  /**
   * Navigate to next focusable element
   * @returns {boolean} True if navigation was successful
   */
  focusNext() {
    const elements = Array.from(this.focusableElements.values())
      .filter(el => !el.disabled)
      .sort((a, b) => a.tabIndex - b.tabIndex);
    
    if (elements.length === 0) return false;
    
    const currentIndex = elements.findIndex(el => el.id === this.currentFocus);
    const nextIndex = (currentIndex + 1) % elements.length;
    
    return this.focus(elements[nextIndex].id);
  }
  
  /**
   * Navigate to previous focusable element
   * @returns {boolean} True if navigation was successful
   */
  focusPrevious() {
    const elements = Array.from(this.focusableElements.values())
      .filter(el => !el.disabled)
      .sort((a, b) => a.tabIndex - b.tabIndex);
    
    if (elements.length === 0) return false;
    
    const currentIndex = elements.findIndex(el => el.id === this.currentFocus);
    const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
    
    return this.focus(elements[prevIndex].id);
  }
  
  /**
   * Navigate within the currently focused element
   * @param {string} direction - Navigation direction
   * @param {*} data - Additional data for navigation
   * @returns {boolean} True if navigation was handled
   */
  navigate(direction, data) {
    if (!this.currentFocus) return false;
    
    const element = this.focusableElements.get(this.currentFocus);
    if (!element) return false;
    
    try {
      return element.onNavigate(direction, data) || false;
    } catch (error) {
      console.error(`Error in navigate handler for ${this.currentFocus}:`, error);
      return false;
    }
  }
  
  /**
   * Get currently focused element ID
   * @returns {string|null} Current focus ID
   */
  getCurrentFocus() {
    return this.currentFocus;
  }
  
  /**
   * Check if an element has focus
   * @param {string} id - Element identifier
   * @returns {boolean} True if element has focus
   */
  hasFocus(id) {
    return this.currentFocus === id;
  }
  
  /**
   * Go back to previous focus
   * @returns {boolean} True if navigation was successful
   */
  focusPrevious() {
    if (this.focusHistory.length < 2) return false;
    
    // Remove current focus from history
    this.focusHistory.pop();
    
    // Get previous focus
    const previousId = this.focusHistory.pop();
    
    return this.focus(previousId);
  }
  
  /**
   * Clear all focus and history
   */
  clear() {
    this.blur();
    this.focusableElements.clear();
    this.focusHistory = [];
  }
}

/**
 * Create a global focus manager instance
 */
const globalFocusManager = new FocusManager();

/**
 * Navigation helper functions
 */

/**
 * Calculate new index for list navigation
 * @param {number} currentIndex - Current selected index
 * @param {number} listLength - Total number of items
 * @param {string} direction - Navigation direction
 * @param {Object} options - Navigation options
 * @param {boolean} options.wrap - Whether to wrap around at boundaries
 * @param {number} options.pageSize - Number of items to skip for page navigation
 * @returns {number} New index
 */
const calculateNewIndex = (currentIndex, listLength, direction, options = {}) => {
  const { wrap = true, pageSize = 10 } = options;
  
  if (listLength === 0) return -1;
  
  let newIndex = currentIndex;
  
  switch (direction) {
    case DIRECTIONS.UP:
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        newIndex = wrap ? listLength - 1 : 0;
      }
      break;
      
    case DIRECTIONS.DOWN:
      newIndex = currentIndex + 1;
      if (newIndex >= listLength) {
        newIndex = wrap ? 0 : listLength - 1;
      }
      break;
      
    case DIRECTIONS.HOME:
      newIndex = 0;
      break;
      
    case DIRECTIONS.END:
      newIndex = listLength - 1;
      break;
      
    case DIRECTIONS.PAGE_UP:
      newIndex = Math.max(0, currentIndex - pageSize);
      break;
      
    case DIRECTIONS.PAGE_DOWN:
      newIndex = Math.min(listLength - 1, currentIndex + pageSize);
      break;
      
    default:
      return currentIndex;
  }
  
  return Math.max(0, Math.min(listLength - 1, newIndex));
};

/**
 * Get navigation direction from key name
 * @param {string} keyName - Key name from key event
 * @param {Object} mappings - Key mappings to use (default: combined arrows + vim)
 * @returns {string|null} Navigation direction or null if not a navigation key
 */
const getNavigationDirection = (keyName, mappings = null) => {
  if (!keyName) return null;
  
  // Use default mappings if none provided
  if (!mappings) {
    mappings = { ...KEY_MAPPINGS.ARROWS, ...KEY_MAPPINGS.VIM };
  }
  
  return mappings[keyName.toLowerCase()] || null;
};

/**
 * Check if a key is a navigation key
 * @param {string} keyName - Key name to check
 * @param {Object} mappings - Key mappings to use
 * @returns {boolean} True if key is a navigation key
 */
const isNavigationKey = (keyName, mappings = null) => {
  return getNavigationDirection(keyName, mappings) !== null;
};

/**
 * Create a navigation handler function
 * @param {Function} onNavigate - Function to call with direction
 * @param {Object} options - Navigation options
 * @param {Object} options.mappings - Key mappings to use
 * @param {boolean} options.preventDefault - Whether to prevent default behavior
 * @returns {Function} Key handler function
 */
const createNavigationHandler = (onNavigate, options = {}) => {
  const { mappings = null, preventDefault = true } = options;
  
  return (key, ch) => {
    const direction = getNavigationDirection(key.name, mappings);
    if (!direction) return false;
    
    if (preventDefault && key.preventDefault) {
      key.preventDefault();
    }
    
    try {
      return onNavigate(direction, key, ch);
    } catch (error) {
      console.error('Error in navigation handler:', error);
      return false;
    }
  };
};

/**
 * Scroll position utilities
 */

/**
 * Calculate scroll position for list display
 * @param {number} selectedIndex - Currently selected item index
 * @param {number} listLength - Total number of items
 * @param {number} viewportHeight - Number of visible items
 * @param {number} currentScrollTop - Current scroll position
 * @returns {Object} Scroll information
 */
const calculateScrollPosition = (selectedIndex, listLength, viewportHeight, currentScrollTop = 0) => {
  if (listLength <= viewportHeight) {
    return {
      scrollTop: 0,
      scrollBottom: listLength - 1,
      needsScroll: false
    };
  }
  
  let newScrollTop = currentScrollTop;
  
  // If selected item is above viewport, scroll up
  if (selectedIndex < currentScrollTop) {
    newScrollTop = selectedIndex;
  }
  // If selected item is below viewport, scroll down
  else if (selectedIndex >= currentScrollTop + viewportHeight) {
    newScrollTop = selectedIndex - viewportHeight + 1;
  }
  
  // Ensure scroll position is within bounds
  newScrollTop = Math.max(0, Math.min(listLength - viewportHeight, newScrollTop));
  
  return {
    scrollTop: newScrollTop,
    scrollBottom: newScrollTop + viewportHeight - 1,
    needsScroll: newScrollTop !== currentScrollTop
  };
};

/**
 * Keyboard shortcut help system
 */

/**
 * Keyboard shortcut definition
 * @typedef {Object} KeyboardShortcut
 * @property {string|string[]} keys - Key combination(s)
 * @property {string} description - Description of what the shortcut does
 * @property {string} category - Category for grouping shortcuts
 * @property {boolean} global - Whether this is a global shortcut
 */

/**
 * Shortcut registry for help system
 */
class ShortcutRegistry {
  constructor() {
    this.shortcuts = new Map();
    this.categories = new Set();
  }
  
  /**
   * Register a keyboard shortcut
   * @param {string} id - Unique identifier
   * @param {KeyboardShortcut} shortcut - Shortcut definition
   */
  register(id, shortcut) {
    this.shortcuts.set(id, {
      id,
      keys: Array.isArray(shortcut.keys) ? shortcut.keys : [shortcut.keys],
      description: shortcut.description,
      category: shortcut.category || 'General',
      global: shortcut.global || false,
      ...shortcut
    });
    
    this.categories.add(shortcut.category || 'General');
  }
  
  /**
   * Unregister a keyboard shortcut
   * @param {string} id - Shortcut identifier
   */
  unregister(id) {
    this.shortcuts.delete(id);
  }
  
  /**
   * Get all shortcuts for a category
   * @param {string} category - Category name
   * @returns {Array} Array of shortcuts
   */
  getByCategory(category) {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.category === category);
  }
  
  /**
   * Get all global shortcuts
   * @returns {Array} Array of global shortcuts
   */
  getGlobalShortcuts() {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.global);
  }
  
  /**
   * Generate help text for shortcuts
   * @param {string} category - Specific category (optional)
   * @returns {string} Formatted help text
   */
  generateHelpText(category = null) {
    let shortcuts;
    
    if (category) {
      shortcuts = this.getByCategory(category);
    } else {
      shortcuts = Array.from(this.shortcuts.values());
    }
    
    if (shortcuts.length === 0) {
      return 'No keyboard shortcuts available.';
    }
    
    // Group by category
    const grouped = shortcuts.reduce((acc, shortcut) => {
      const cat = shortcut.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(shortcut);
      return acc;
    }, {});
    
    let helpText = '';
    
    Object.entries(grouped).forEach(([cat, catShortcuts]) => {
      helpText += `\n${cat}:\n`;
      helpText += '='.repeat(cat.length + 1) + '\n';
      
      catShortcuts.forEach(shortcut => {
        const keys = shortcut.keys.join(', ');
        helpText += `  ${keys.padEnd(15)} ${shortcut.description}\n`;
      });
    });
    
    return helpText;
  }
  
  /**
   * Clear all shortcuts
   */
  clear() {
    this.shortcuts.clear();
    this.categories.clear();
  }
}

/**
 * Global shortcut registry instance
 */
const globalShortcutRegistry = new ShortcutRegistry();

// Register default global shortcuts
globalShortcutRegistry.register('quit-q', {
  keys: 'q',
  description: 'Quit application',
  category: 'Global',
  global: true
});

globalShortcutRegistry.register('quit-esc', {
  keys: 'ESC',
  description: 'Quit application',
  category: 'Global',
  global: true
});

globalShortcutRegistry.register('quit-ctrl-c', {
  keys: 'Ctrl+C',
  description: 'Quit application',
  category: 'Global',
  global: true
});

module.exports = {
  DIRECTIONS,
  KEY_MAPPINGS,
  FocusManager,
  globalFocusManager,
  calculateNewIndex,
  getNavigationDirection,
  isNavigationKey,
  createNavigationHandler,
  calculateScrollPosition,
  ShortcutRegistry,
  globalShortcutRegistry
};