const { useEffect, useRef, useCallback } = require('react');
const screenManager = require('../screen');

/**
 * Custom hook for handling keyboard events in terminal UI components
 * Provides component-level key bindings with automatic cleanup
 * 
 * @param {string|string[]} keys - Key name(s) to listen for (e.g., 'enter', ['up', 'k'])
 * @param {Function} handler - Function to call when key is pressed
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether the key handler is enabled (default: true)
 * @param {boolean} options.preventDefault - Whether to prevent default key behavior (default: false)
 * @param {string[]} options.modifiers - Required modifier keys (e.g., ['ctrl', 'shift'])
 * @param {Function} options.condition - Function that returns boolean to conditionally handle key
 */
const useKey = (keys, handler, options = {}) => {
  const {
    enabled = true,
    preventDefault = false,
    modifiers = [],
    condition
  } = options;
  
  // Store handler in ref to avoid stale closures
  const handlerRef = useRef(handler);
  const conditionRef = useRef(condition);
  
  // Update refs when handler or condition changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  
  useEffect(() => {
    conditionRef.current = condition;
  }, [condition]);
  
  // Normalize keys to array
  const keyArray = Array.isArray(keys) ? keys : [keys];
  
  // Create stable key handler
  const keyHandler = useCallback((ch, key) => {
    // Skip if disabled
    if (!enabled) return;
    
    // Skip if no key object
    if (!key) return;
    
    // Check if condition is met (if provided)
    if (conditionRef.current && !conditionRef.current()) {
      return;
    }
    
    // Check if key matches any of the target keys
    const keyMatches = keyArray.some(targetKey => {
      // Handle special key mappings
      const normalizedKey = normalizeKeyName(key.name);
      const normalizedTarget = normalizeKeyName(targetKey);
      
      return normalizedKey === normalizedTarget;
    });
    
    if (!keyMatches) return;
    
    // Check modifier requirements
    if (modifiers.length > 0) {
      const hasRequiredModifiers = modifiers.every(modifier => {
        switch (modifier.toLowerCase()) {
          case 'ctrl':
          case 'control':
            return key.ctrl;
          case 'shift':
            return key.shift;
          case 'alt':
          case 'meta':
            return key.meta;
          default:
            return false;
        }
      });
      
      if (!hasRequiredModifiers) return;
    }
    
    // Prevent default if requested
    if (preventDefault && key.preventDefault) {
      key.preventDefault();
    }
    
    // Call the handler
    try {
      handlerRef.current(key, ch);
    } catch (error) {
      console.error('Error in key handler:', error);
    }
  }, [enabled, keyArray, modifiers, preventDefault]);
  
  // Set up and cleanup event listener
  useEffect(() => {
    if (!enabled) return;
    
    const screen = screenManager.getScreen();
    if (!screen) return;
    
    // Add event listener
    screen.on('keypress', keyHandler);
    
    // Cleanup function
    return () => {
      screen.removeListener('keypress', keyHandler);
    };
  }, [keyHandler, enabled]);
};

/**
 * Normalize key names to handle variations and aliases
 * @param {string} keyName - The key name to normalize
 * @returns {string} Normalized key name
 */
const normalizeKeyName = (keyName) => {
  if (!keyName) return '';
  
  const keyMap = {
    // Arrow keys
    'up': 'up',
    'down': 'down',
    'left': 'left',
    'right': 'right',
    
    // Vim-style navigation
    'k': 'k',
    'j': 'j',
    'h': 'h',
    'l': 'l',
    
    // Special keys
    'enter': 'enter',
    'return': 'enter',
    'space': 'space',
    'tab': 'tab',
    'escape': 'escape',
    'esc': 'escape',
    'backspace': 'backspace',
    'delete': 'delete',
    'home': 'home',
    'end': 'end',
    'pageup': 'pageup',
    'pagedown': 'pagedown',
    
    // Function keys
    'f1': 'f1', 'f2': 'f2', 'f3': 'f3', 'f4': 'f4',
    'f5': 'f5', 'f6': 'f6', 'f7': 'f7', 'f8': 'f8',
    'f9': 'f9', 'f10': 'f10', 'f11': 'f11', 'f12': 'f12',
    
    // Letters and numbers (lowercase)
    ...Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map(c => [c, c])),
    ...Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => [c, c.toLowerCase()])),
    ...Object.fromEntries('0123456789'.split('').map(c => [c, c]))
  };
  
  return keyMap[keyName.toLowerCase()] || keyName.toLowerCase();
};

/**
 * Hook for handling multiple key combinations
 * @param {Object} keyMap - Object mapping keys to handlers
 * @param {Object} options - Global options for all key handlers
 */
const useKeys = (keyMap, options = {}) => {
  Object.entries(keyMap).forEach(([keys, handler]) => {
    useKey(keys, handler, options);
  });
};

/**
 * Hook for handling key sequences (e.g., 'g g' for vim-style navigation)
 * @param {string[]} sequence - Array of keys that must be pressed in order
 * @param {Function} handler - Function to call when sequence is completed
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout in ms to reset sequence (default: 1000)
 */
const useKeySequence = (sequence, handler, options = {}) => {
  const { timeout = 1000, ...otherOptions } = options;
  const sequenceRef = useRef([]);
  const timeoutRef = useRef(null);
  
  const resetSequence = useCallback(() => {
    sequenceRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  const sequenceHandler = useCallback((key) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Add key to sequence
    sequenceRef.current.push(key.name);
    
    // Check if sequence matches
    const currentSequence = sequenceRef.current;
    const targetSequence = sequence.map(k => normalizeKeyName(k));
    
    if (currentSequence.length === targetSequence.length) {
      // Check if sequences match
      const matches = currentSequence.every((key, index) => 
        normalizeKeyName(key) === targetSequence[index]
      );
      
      if (matches) {
        resetSequence();
        handler(key);
        return;
      } else {
        // Reset if sequence doesn't match
        resetSequence();
        return;
      }
    }
    
    // Set timeout to reset sequence
    timeoutRef.current = setTimeout(resetSequence, timeout);
  }, [sequence, handler, timeout, resetSequence]);
  
  // Listen for any key to build sequence
  useKey(
    // Listen to all keys by using a condition that always returns true
    'a', // Dummy key, we'll handle all keys in the condition
    sequenceHandler,
    {
      ...otherOptions,
      condition: () => true // Handle all keys
    }
  );
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
};

module.exports = {
  useKey,
  useKeys,
  useKeySequence,
  normalizeKeyName
};