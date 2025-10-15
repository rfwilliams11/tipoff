class FocusManager {
  constructor() {
    this.focusableElements = new Map()
    this.currentFocus = null
    this.focusHistory = []
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
    })
  }

  unregister(id) {
    if (this.currentFocus === id) {
      this.blur()
    }
    this.focusableElements.delete(id)
  }

  focus(id) {
    const element = this.focusableElements.get(id)
    if (!element || element.disabled) {
      return false
    }

    // Blur current element
    if (this.currentFocus && this.currentFocus !== id) {
      this.blur()
    }

    // Set new focus
    this.currentFocus = id
    this.focusHistory.push(id)

    // Keep history manageable
    if (this.focusHistory.length > 10) {
      this.focusHistory.shift()
    }

    // Call focus handler
    try {
      element.onFocus()
    } catch (error) {
      console.error(`Error in focus handler for ${id}:`, error)
    }

    return true
  }

  blur() {
    if (!this.currentFocus) return

    const element = this.focusableElements.get(this.currentFocus)
    if (element) {
      try {
        element.onBlur()
      } catch (error) {
        console.error(`Error in blur handler for ${this.currentFocus}:`, error)
      }
    }

    this.currentFocus = null
  }

  focusNext() {
    const elements = Array.from(this.focusableElements.values())
      .filter(el => !el.disabled)
      .sort((a, b) => a.tabIndex - b.tabIndex)

    if (elements.length === 0) return false

    const currentIndex = elements.findIndex(el => el.id === this.currentFocus)
    const nextIndex = (currentIndex + 1) % elements.length

    return this.focus(elements[nextIndex].id)
  }

  focusPrevious() {
    const elements = Array.from(this.focusableElements.values())
      .filter(el => !el.disabled)
      .sort((a, b) => a.tabIndex - b.tabIndex)

    if (elements.length === 0) return false

    const currentIndex = elements.findIndex(el => el.id === this.currentFocus)
    const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1

    return this.focus(elements[prevIndex].id)
  }

  navigate(direction, data) {
    if (!this.currentFocus) return false

    const element = this.focusableElements.get(this.currentFocus)
    if (!element) return false

    try {
      return element.onNavigate(direction, data) || false
    } catch (error) {
      console.error(`Error in navigate handler for ${this.currentFocus}:`, error)
      return false
    }
  }

  getCurrentFocus() {
    return this.currentFocus
  }

  hasFocus(id) {
    return this.currentFocus === id
  }

  restorePreviousFocus() {
    if (this.focusHistory.length < 2) return false

    // Remove current focus from history
    this.focusHistory.pop()

    // Get previous focus
    const previousId = this.focusHistory.pop()

    return this.focus(previousId)
  }

  clear() {
    this.blur()
    this.focusableElements.clear()
    this.focusHistory = []
  }
}

const globalFocusManager = new FocusManager()

module.exports = {
  FocusManager,
  globalFocusManager
}
