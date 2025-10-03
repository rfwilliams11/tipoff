const { useEffect, useCallback, useRef } = require('react');
const { globalFocusManager } = require('../utils/navigation');

/**
 * Hook for managing focus in terminal UI components
 * Provides focus registration, navigation handling, and cleanup
 * 
 * @param {string} id - Unique identifier for this focusable element
 * @param {Object} options - Focus configuration options
 * @param {Function} options.onFocus - Called when element gains focus
 * @param {Function} options.onBlur - Called when element loses focus
 * @param {Function} options.onNavigate - Called for navigation within element
 * @param {number} options.tabIndex - Tab order (default: 0)
 * @param {boolean} options.disabled - Whether element can receive focus
 * @param {boolean} options.autoFocus - Whether to focus on mount
 * @returns {Object} Focus management utilities
 */
const useFocus = (id, options = {}) => {
  const {
    onFocus,
    onBlur,
    onNavigate,
    tabIndex = 0,
    disabled = false,
    autoFocus = false
  } = options;
  
  // Store callbacks in refs to avoid stale closures
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const onNavigateRef = useRef(onNavigate);
  
  // Update refs when callbacks change
  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);
  
  useEffect(() => {
    onBlurRef.current = onBlur;
  }, [onBlur]);
  
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);
  
  // Check if this element has focus
  const hasFocus = globalFocusManager.hasFocus(id);
  
  // Focus management functions
  const focus = useCallback(() => {
    return globalFocusManager.focus(id);
  }, [id]);
  
  const blur = useCallback(() => {
    if (hasFocus) {
      globalFocusManager.blur();
    }
  }, [hasFocus]);
  
  const navigate = useCallback((direction, data) => {
    return globalFocusManager.navigate(direction, data);
  }, []);
  
  // Register with focus manager
  useEffect(() => {
    const element = {
      onFocus: () => {
        if (onFocusRef.current) {
          onFocusRef.current();
        }
      },
      onBlur: () => {
        if (onBlurRef.current) {
          onBlurRef.current();
        }
      },
      onNavigate: (direction, data) => {
        if (onNavigateRef.current) {
          return onNavigateRef.current(direction, data);
        }
        return false;
      },
      tabIndex,
      disabled
    };
    
    globalFocusManager.register(id, element);
    
    // Auto-focus if requested
    if (autoFocus && !disabled) {
      globalFocusManager.focus(id);
    }
    
    // Cleanup
    return () => {
      globalFocusManager.unregister(id);
    };
  }, [id, tabIndex, disabled, autoFocus]);
  
  // Update disabled state
  useEffect(() => {
    const element = globalFocusManager.focusableElements.get(id);
    if (element) {
      element.disabled = disabled;
    }
  }, [id, disabled]);
  
  return {
    hasFocus,
    focus,
    blur,
    navigate,
    disabled
  };
};

/**
 * Hook for managing focus within a list component
 * Provides list-specific navigation and selection handling
 * 
 * @param {string} id - Unique identifier for this list
 * @param {Array} items - Array of list items
 * @param {Object} options - List focus options
 * @param {number} options.selectedIndex - Currently selected index
 * @param {Function} options.onSelectionChange - Called when selection changes
 * @param {Function} options.onItemActivate - Called when item is activated (Enter)
 * @param {boolean} options.wrap - Whether to wrap navigation at boundaries
 * @param {number} options.pageSize - Items to skip for page navigation
 * @returns {Object} List focus utilities
 */
const useListFocus = (id, items, options = {}) => {
  const {
    selectedIndex = 0,
    onSelectionChange,
    onItemActivate,
    wrap = true,
    pageSize = 10
  } = options;
  
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onItemActivateRef = useRef(onItemActivate);
  
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);
  
  useEffect(() => {
    onItemActivateRef.current = onItemActivate;
  }, [onItemActivate]);
  
  // Navigation handler for list
  const handleNavigate = useCallback((direction, data) => {
    const { calculateNewIndex, DIRECTIONS } = require('../utils/navigation');
    
    let newIndex = selectedIndex;
    
    switch (direction) {
      case DIRECTIONS.UP:
      case DIRECTIONS.DOWN:
      case DIRECTIONS.HOME:
      case DIRECTIONS.END:
      case DIRECTIONS.PAGE_UP:
      case DIRECTIONS.PAGE_DOWN:
        newIndex = calculateNewIndex(selectedIndex, items.length, direction, {
          wrap,
          pageSize
        });
        break;
        
      default:
        return false;
    }
    
    if (newIndex !== selectedIndex && onSelectionChangeRef.current) {
      onSelectionChangeRef.current(newIndex);
    }
    
    return true;
  }, [selectedIndex, items.length, wrap, pageSize]);
  
  // Item activation handler
  const handleActivate = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < items.length && onItemActivateRef.current) {
      onItemActivateRef.current(selectedIndex, items[selectedIndex]);
    }
  }, [selectedIndex, items]);
  
  // Use base focus hook
  const focusUtils = useFocus(id, {
    onNavigate: handleNavigate,
    ...options
  });
  
  return {
    ...focusUtils,
    selectedIndex,
    handleNavigate,
    handleActivate
  };
};

/**
 * Hook for managing scrollable content focus
 * Provides scroll-specific navigation and position management
 * 
 * @param {string} id - Unique identifier for this scrollable
 * @param {Object} options - Scroll focus options
 * @param {number} options.scrollPosition - Current scroll position
 * @param {number} options.contentHeight - Total content height
 * @param {number} options.viewportHeight - Visible viewport height
 * @param {Function} options.onScrollChange - Called when scroll position changes
 * @param {number} options.scrollStep - Lines to scroll per step
 * @returns {Object} Scroll focus utilities
 */
const useScrollFocus = (id, options = {}) => {
  const {
    scrollPosition = 0,
    contentHeight = 0,
    viewportHeight = 10,
    onScrollChange,
    scrollStep = 1
  } = options;
  
  const onScrollChangeRef = useRef(onScrollChange);
  
  useEffect(() => {
    onScrollChangeRef.current = onScrollChange;
  }, [onScrollChange]);
  
  // Navigation handler for scrolling
  const handleNavigate = useCallback((direction, data) => {
    const { DIRECTIONS } = require('../utils/navigation');
    
    let newScrollPosition = scrollPosition;
    
    switch (direction) {
      case DIRECTIONS.UP:
        newScrollPosition = Math.max(0, scrollPosition - scrollStep);
        break;
        
      case DIRECTIONS.DOWN:
        newScrollPosition = Math.min(
          Math.max(0, contentHeight - viewportHeight),
          scrollPosition + scrollStep
        );
        break;
        
      case DIRECTIONS.PAGE_UP:
        newScrollPosition = Math.max(0, scrollPosition - viewportHeight);
        break;
        
      case DIRECTIONS.PAGE_DOWN:
        newScrollPosition = Math.min(
          Math.max(0, contentHeight - viewportHeight),
          scrollPosition + viewportHeight
        );
        break;
        
      case DIRECTIONS.HOME:
        newScrollPosition = 0;
        break;
        
      case DIRECTIONS.END:
        newScrollPosition = Math.max(0, contentHeight - viewportHeight);
        break;
        
      default:
        return false;
    }
    
    if (newScrollPosition !== scrollPosition && onScrollChangeRef.current) {
      onScrollChangeRef.current(newScrollPosition);
    }
    
    return true;
  }, [scrollPosition, contentHeight, viewportHeight, scrollStep]);
  
  // Use base focus hook
  const focusUtils = useFocus(id, {
    onNavigate: handleNavigate,
    ...options
  });
  
  return {
    ...focusUtils,
    scrollPosition,
    handleNavigate
  };
};

module.exports = {
  useFocus,
  useListFocus,
  useScrollFocus
};