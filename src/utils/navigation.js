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

class FocusManager {
  constructor() {
    this.focusableElements = new Map();
    this.currentFocus = null;
    this.focusHistory = [];
  }

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

  unregister(id) {
    if (this.currentFocus === id) {
      this.blur();
    }
    this.focusableElements.delete(id);
  }

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

  focusNext() {
    const elements = Array.from(this.focusableElements.values())
      .filter(el => !el.disabled)
      .sort((a, b) => a.tabIndex - b.tabIndex);
    
    if (elements.length === 0) return false;
    
    const currentIndex = elements.findIndex(el => el.id === this.currentFocus);
    const nextIndex = (currentIndex + 1) % elements.length;
    
    return this.focus(elements[nextIndex].id);
  }

  focusPrevious() {
    const elements = Array.from(this.focusableElements.values())
      .filter(el => !el.disabled)
      .sort((a, b) => a.tabIndex - b.tabIndex);
    
    if (elements.length === 0) return false;
    
    const currentIndex = elements.findIndex(el => el.id === this.currentFocus);
    const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
    
    return this.focus(elements[prevIndex].id);
  }

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

  getCurrentFocus() {
    return this.currentFocus;
  }

  hasFocus(id) {
    return this.currentFocus === id;
  }

  focusPrevious() {
    if (this.focusHistory.length < 2) return false;
    
    // Remove current focus from history
    this.focusHistory.pop();
    
    // Get previous focus
    const previousId = this.focusHistory.pop();
    
    return this.focus(previousId);
  }

  clear() {
    this.blur();
    this.focusableElements.clear();
    this.focusHistory = [];
  }
}

const globalFocusManager = new FocusManager();

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

const getNavigationDirection = (keyName, mappings = null) => {
  if (!keyName) return null;
  
  // Use default mappings if none provided
  if (!mappings) {
    mappings = { ...KEY_MAPPINGS.ARROWS, ...KEY_MAPPINGS.VIM };
  }
  
  return mappings[keyName.toLowerCase()] || null;
};

const isNavigationKey = (keyName, mappings = null) => {
  return getNavigationDirection(keyName, mappings) !== null;
};

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

class ShortcutRegistry {
  constructor() {
    this.shortcuts = new Map();
    this.categories = new Set();
  }

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

  unregister(id) {
    this.shortcuts.delete(id);
  }

  getByCategory(category) {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.category === category);
  }

  getGlobalShortcuts() {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.global);
  }

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

  clear() {
    this.shortcuts.clear();
    this.categories.clear();
  }
}

const globalShortcutRegistry = new ShortcutRegistry();
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