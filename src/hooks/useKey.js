const { useEffect, useCallback } = require('react')
const screenManager = require('../screen')
const { useCallbackRef } = require('./utils/useCallbackRef')
const { normalizeKeyName } = require('../utils/keyNormalization')
const { checkModifiers } = require('./utils/modifierChecks')

const useKey = (keys, handler, options = {}) => {
  const {
    enabled = true,
    preventDefault = false,
    modifiers = [],
    condition
  } = options

  const handlerRef = useCallbackRef(handler)
  const conditionRef = useCallbackRef(condition)

  const keyArray = Array.isArray(keys) ? keys : [keys]

  const keyHandler = useCallback((ch, key) => {
    if (!enabled || !key) return

    if (conditionRef.current && !conditionRef.current()) {
      return
    }

    const keyMatches = keyArray.some(targetKey => {
      const normalizedKey = normalizeKeyName(key.name)
      const normalizedTarget = normalizeKeyName(targetKey)
      return normalizedKey === normalizedTarget
    })

    if (!keyMatches) return

    if (!checkModifiers(key, modifiers)) return

    if (preventDefault && key.preventDefault) {
      key.preventDefault()
    }

    try {
      handlerRef.current(key, ch)
    } catch (error) {
      console.error('Error in key handler:', error)
    }
  }, [enabled, keyArray, modifiers, preventDefault, handlerRef, conditionRef])

  useEffect(() => {
    if (!enabled) return

    const screen = screenManager.getScreen()
    if (!screen) return

    screen.on('keypress', keyHandler)

    return () => {
      screen.removeListener('keypress', keyHandler)
    }
  }, [keyHandler, enabled])
}

// Note: useKeys is disabled due to React hooks rules violations
// (Cannot call hooks inside loops). If needed, implement without forEach.
// const useKeys = (keyMap, options = {}) => {
//   Object.entries(keyMap).forEach(([keys, handler]) => {
//     useKey(keys, handler, options)
//   })
// }

const useKeySequence = (sequence, handler, options = {}) => {
  const { timeout = 1000, ...otherOptions } = options
  const { useRef } = require('react')
  const sequenceRef = useRef([])
  const timeoutRef = useRef(null)

  const resetSequence = useCallback(() => {
    sequenceRef.current = []
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const sequenceHandler = useCallback((key) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    sequenceRef.current.push(key.name)

    const currentSequence = sequenceRef.current
    const targetSequence = sequence.map(k => normalizeKeyName(k))

    if (currentSequence.length === targetSequence.length) {
      const matches = currentSequence.every((key, index) =>
        normalizeKeyName(key) === targetSequence[index]
      )

      if (matches) {
        resetSequence()
        handler(key)
        return
      } else {
        resetSequence()
        return
      }
    }

    timeoutRef.current = setTimeout(resetSequence, timeout)
  }, [sequence, handler, timeout, resetSequence])

  useKey('a', sequenceHandler, {
    ...otherOptions,
    condition: () => true
  })

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
}

module.exports = {
  useKey,
  // useKeys, // Disabled - see comment above
  useKeySequence
}
