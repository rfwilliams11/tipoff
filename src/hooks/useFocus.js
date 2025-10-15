const { useEffect, useCallback } = require('react')
const { globalFocusManager } = require('../utils/navigation')
const { useCallbackRefs } = require('./utils/useCallbackRef')
const { createListNavigationHandler, createScrollNavigationHandler } = require('./utils/navigationHandlers')

const useFocus = (id, options = {}) => {
  const {
    onFocus,
    onBlur,
    onNavigate,
    tabIndex = 0,
    disabled = false,
    autoFocus = false
  } = options

  const callbackRefs = useCallbackRefs({ onFocus, onBlur, onNavigate })

  const hasFocus = globalFocusManager.hasFocus(id)

  const focus = useCallback(() => {
    return globalFocusManager.focus(id)
  }, [id])

  const blur = useCallback(() => {
    if (hasFocus) {
      globalFocusManager.blur()
    }
  }, [hasFocus])

  const navigate = useCallback((direction, data) => {
    return globalFocusManager.navigate(direction, data)
  }, [])

  useEffect(() => {
    const element = {
      onFocus: () => {
        if (callbackRefs.onFocus.current) {
          callbackRefs.onFocus.current()
        }
      },
      onBlur: () => {
        if (callbackRefs.onBlur.current) {
          callbackRefs.onBlur.current()
        }
      },
      onNavigate: (direction, data) => {
        if (callbackRefs.onNavigate.current) {
          return callbackRefs.onNavigate.current(direction, data)
        }
        return false
      },
      tabIndex,
      disabled
    }

    globalFocusManager.register(id, element)

    if (autoFocus && !disabled) {
      globalFocusManager.focus(id)
    }

    return () => {
      globalFocusManager.unregister(id)
    }
  }, [id, tabIndex, disabled, autoFocus, callbackRefs])

  useEffect(() => {
    const element = globalFocusManager.focusableElements.get(id)
    if (element) {
      element.disabled = disabled
    }
  }, [id, disabled])

  return {
    hasFocus,
    focus,
    blur,
    navigate,
    disabled
  }
}

const useListFocus = (id, items, options = {}) => {
  const {
    selectedIndex = 0,
    onSelectionChange,
    onItemActivate,
    wrap = true,
    pageSize = 10
  } = options

  const callbackRefs = useCallbackRefs({ onSelectionChange, onItemActivate })

  const handleNavigate = useCallback((direction, data) => {
    const handler = createListNavigationHandler(
      selectedIndex,
      items.length,
      {
        wrap,
        pageSize,
        onSelectionChange: (newIndex) => {
          if (callbackRefs.onSelectionChange.current) {
            callbackRefs.onSelectionChange.current(newIndex)
          }
        }
      }
    )
    return handler(direction)
  }, [selectedIndex, items.length, wrap, pageSize, callbackRefs])

  const handleActivate = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < items.length && callbackRefs.onItemActivate.current) {
      callbackRefs.onItemActivate.current(selectedIndex, items[selectedIndex])
    }
  }, [selectedIndex, items, callbackRefs])

  const focusUtils = useFocus(id, {
    onNavigate: handleNavigate,
    ...options
  })

  return {
    ...focusUtils,
    selectedIndex,
    handleNavigate,
    handleActivate
  }
}

const useScrollFocus = (id, options = {}) => {
  const {
    scrollPosition = 0,
    contentHeight = 0,
    viewportHeight = 10,
    onScrollChange,
    scrollStep = 1
  } = options

  const callbackRefs = useCallbackRefs({ onScrollChange })

  const handleNavigate = useCallback((direction, data) => {
    const handler = createScrollNavigationHandler(
      scrollPosition,
      contentHeight,
      viewportHeight,
      {
        scrollStep,
        onScrollChange: (newPosition) => {
          if (callbackRefs.onScrollChange.current) {
            callbackRefs.onScrollChange.current(newPosition)
          }
        }
      }
    )
    return handler(direction)
  }, [scrollPosition, contentHeight, viewportHeight, scrollStep, callbackRefs])

  const focusUtils = useFocus(id, {
    onNavigate: handleNavigate,
    ...options
  })

  return {
    ...focusUtils,
    scrollPosition,
    handleNavigate
  }
}

module.exports = {
  useFocus,
  useListFocus,
  useScrollFocus
}
