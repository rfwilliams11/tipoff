const { VALID_COLORS, COLOR_ALIASES, UI_ELEMENTS, DEFAULT_COLORS } = require('./constants')

function isValidColor(color) {
  if (!color || typeof color !== 'string') return false

  const lowerColor = color.toLowerCase().trim()
  return VALID_COLORS.includes(lowerColor) ||
         Object.keys(COLOR_ALIASES).includes(lowerColor)
}

function normalizeColor(color) {
  if (!color || typeof color !== 'string') return null

  const lowerColor = color.toLowerCase().trim()

  // Check if it's already a valid color
  if (VALID_COLORS.includes(lowerColor)) {
    return lowerColor
  }

  // Check aliases
  if (COLOR_ALIASES[lowerColor]) {
    return COLOR_ALIASES[lowerColor]
  }

  return null
}

function getColorSuggestions(input) {
  if (!input || typeof input !== 'string') return []

  const lowerInput = input.toLowerCase().trim()
  const suggestions = []

  // Find colors that start with the input
  VALID_COLORS.forEach(color => {
    if (color.startsWith(lowerInput)) {
      suggestions.push(color)
    }
  })

  // Find aliases that start with the input
  Object.keys(COLOR_ALIASES).forEach(alias => {
    if (alias.startsWith(lowerInput)) {
      suggestions.push(alias)
    }
  })

  // Find colors that contain the input
  if (suggestions.length < 5) {
    VALID_COLORS.forEach(color => {
      if (color.includes(lowerInput) && !suggestions.includes(color)) {
        suggestions.push(color)
      }
    })
  }

  return suggestions.slice(0, 5)
}

function isValidUIElement(element) {
  if (!element || typeof element !== 'string') return false
  return Object.keys(UI_ELEMENTS).includes(element.toLowerCase())
}

function getUIElements() {
  return Object.keys(UI_ELEMENTS)
}

function getUIElementDescription(element) {
  if (!element || typeof element !== 'string') return null
  return UI_ELEMENTS[element.toLowerCase()] || null
}

function validateColorConfig(colors) {
  if (!colors || typeof colors !== 'object') {
    return {
      valid: false,
      errors: ['Colors must be an object'],
      normalized: DEFAULT_COLORS
    }
  }

  const errors = []
  const normalized = { ...DEFAULT_COLORS }

  for (const [element, color] of Object.entries(colors)) {
    if (!isValidUIElement(element)) {
      errors.push(`Unknown UI element: ${element}`)
      continue
    }

    const normalizedColor = normalizeColor(color)
    if (!normalizedColor) {
      errors.push(`Invalid color '${color}' for ${element}`)
      const suggestions = getColorSuggestions(color)
      if (suggestions.length > 0) {
        errors.push(`Did you mean: ${suggestions.join(', ')}?`)
      }
    } else {
      normalized[element] = normalizedColor
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized
  }
}

module.exports = {
  isValidColor,
  normalizeColor,
  getColorSuggestions,
  isValidUIElement,
  getUIElements,
  getUIElementDescription,
  validateColorConfig
}
