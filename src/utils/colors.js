/**
 * Color utility functions for terminal UI
 * Provides color validation, conversion, and management functionality
 */

// Valid terminal colors supported by Blessed
const VALID_COLORS = [
  // Basic colors
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  // Bright colors
  'gray', 'grey', 'brightred', 'brightgreen', 'brightyellow', 'brightblue',
  'brightmagenta', 'brightcyan', 'brightwhite',
  // Additional colors
  'lightblack', 'lightred', 'lightgreen', 'lightyellow', 'lightblue',
  'lightmagenta', 'lightcyan', 'lightwhite'
]

// Color aliases for user convenience
const COLOR_ALIASES = {
  // Common aliases
  'bright red': 'brightred',
  'bright green': 'brightgreen',
  'bright yellow': 'brightyellow',
  'bright blue': 'brightblue',
  'bright magenta': 'brightmagenta',
  'bright cyan': 'brightcyan',
  'bright white': 'brightwhite',
  'light red': 'lightred',
  'light green': 'lightgreen',
  'light yellow': 'lightyellow',
  'light blue': 'lightblue',
  'light magenta': 'lightmagenta',
  'light cyan': 'lightcyan',
  'light white': 'lightwhite',
  
  // Intuitive aliases
  'orange': 'yellow',
  'purple': 'magenta',
  'pink': 'lightmagenta',
  'lime': 'lightgreen',
  'aqua': 'cyan',
  'silver': 'gray',
  'gold': 'yellow',
  'navy': 'blue',
  'maroon': 'red',
  'olive': 'yellow',
  'teal': 'cyan',
  'fuchsia': 'magenta'
}

// UI element descriptions for help text
const UI_ELEMENTS = {
  score: 'Game scores and numbers',
  teamName: 'Team names and abbreviations',
  selectedGame: 'Currently selected game highlight',
  liveGame: 'Live/in-progress game indicator',
  completedGame: 'Completed game text',
  error: 'Error messages',
  info: 'Information messages',
  background: 'Background color'
}

// Default color scheme
const DEFAULT_COLORS = {
  score: 'white',
  teamName: 'cyan',
  selectedGame: 'yellow',
  liveGame: 'green',
  completedGame: 'gray',
  error: 'red',
  info: 'blue',
  background: 'black'
}

// Predefined color themes
const COLOR_THEMES = {
  default: {
    name: 'Default',
    description: 'Standard terminal colors',
    colors: DEFAULT_COLORS
  },
  dark: {
    name: 'Dark',
    description: 'Dark theme with muted colors',
    colors: {
      score: 'gray',
      teamName: 'lightblue',
      selectedGame: 'white',
      liveGame: 'lightgreen',
      completedGame: 'gray',
      error: 'lightred',
      info: 'lightcyan',
      background: 'black'
    }
  },
  bright: {
    name: 'Bright',
    description: 'Bright and vibrant colors',
    colors: {
      score: 'brightyellow',
      teamName: 'brightcyan',
      selectedGame: 'brightwhite',
      liveGame: 'brightgreen',
      completedGame: 'gray',
      error: 'brightred',
      info: 'brightblue',
      background: 'black'
    }
  },
  minimal: {
    name: 'Minimal',
    description: 'Minimal monochrome theme',
    colors: {
      score: 'white',
      teamName: 'white',
      selectedGame: 'black',
      liveGame: 'white',
      completedGame: 'gray',
      error: 'white',
      info: 'gray',
      background: 'black'
    }
  },
  neon: {
    name: 'Neon',
    description: 'Neon-style bright colors',
    colors: {
      score: 'brightmagenta',
      teamName: 'brightcyan',
      selectedGame: 'brightyellow',
      liveGame: 'brightgreen',
      completedGame: 'gray',
      error: 'brightred',
      info: 'brightblue',
      background: 'black'
    }
  }
}

/**
 * Validates if a color is valid for terminal use
 * @param {string} color - Color name to validate
 * @returns {boolean} - True if valid
 */
function isValidColor(color) {
  if (!color || typeof color !== 'string') return false
  
  const lowerColor = color.toLowerCase().trim()
  return VALID_COLORS.includes(lowerColor) || 
         Object.keys(COLOR_ALIASES).includes(lowerColor)
}

/**
 * Normalizes a color name to a valid terminal color
 * @param {string} color - Color name to normalize
 * @returns {string|null} - Normalized color or null if invalid
 */
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

/**
 * Gets color suggestions for invalid input
 * @param {string} input - Invalid color input
 * @returns {Array} - Array of suggested colors
 */
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
  
  return suggestions.slice(0, 5) // Limit to 5 suggestions
}

/**
 * Validates a UI element name
 * @param {string} element - UI element name
 * @returns {boolean} - True if valid
 */
function isValidUIElement(element) {
  if (!element || typeof element !== 'string') return false
  return Object.keys(UI_ELEMENTS).includes(element.toLowerCase())
}

/**
 * Gets all available UI elements
 * @returns {Array} - Array of UI element names
 */
function getUIElements() {
  return Object.keys(UI_ELEMENTS)
}

/**
 * Gets description for a UI element
 * @param {string} element - UI element name
 * @returns {string|null} - Description or null if not found
 */
function getUIElementDescription(element) {
  if (!element || typeof element !== 'string') return null
  return UI_ELEMENTS[element.toLowerCase()] || null
}

/**
 * Validates a complete color configuration
 * @param {Object} colors - Color configuration object
 * @returns {Object} - { valid: boolean, errors: Array, normalized: Object }
 */
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

/**
 * Applies a color theme
 * @param {string} themeName - Name of the theme to apply
 * @returns {Object|null} - Theme colors or null if theme not found
 */
function applyColorTheme(themeName) {
  if (!themeName || typeof themeName !== 'string') return null
  
  const theme = COLOR_THEMES[themeName.toLowerCase()]
  return theme ? { ...theme.colors } : null
}

/**
 * Gets all available color themes
 * @returns {Array} - Array of theme objects with name and description
 */
function getColorThemes() {
  return Object.entries(COLOR_THEMES).map(([key, theme]) => ({
    key,
    name: theme.name,
    description: theme.description
  }))
}

/**
 * Creates a color preview string for terminal display
 * @param {string} color - Color to preview
 * @param {string} text - Text to display (default: color name)
 * @returns {string} - Formatted string for terminal display
 */
function createColorPreview(color, text = null) {
  const normalizedColor = normalizeColor(color)
  if (!normalizedColor) return `Invalid color: ${color}`
  
  const displayText = text || normalizedColor
  return `{${normalizedColor}-fg}${displayText}{/}`
}

/**
 * Formats color configuration for display
 * @param {Object} colors - Color configuration
 * @param {boolean} showDescriptions - Whether to show element descriptions
 * @returns {string} - Formatted color configuration
 */
function formatColorConfig(colors, showDescriptions = false) {
  if (!colors || typeof colors !== 'object') {
    return 'No color configuration'
  }
  
  const lines = []
  
  for (const [element, color] of Object.entries(colors)) {
    const description = showDescriptions ? ` - ${getUIElementDescription(element) || ''}` : ''
    const preview = createColorPreview(color, '●')
    lines.push(`  ${element}: ${color} ${preview}${description}`)
  }
  
  return lines.join('\n')
}

/**
 * Converts hex color to nearest terminal color (basic approximation)
 * @param {string} hex - Hex color code (e.g., '#FF0000')
 * @returns {string|null} - Nearest terminal color or null if invalid
 */
function hexToTerminalColor(hex) {
  if (!hex || typeof hex !== 'string') return null
  
  // Remove # if present
  const cleanHex = hex.replace('#', '').toLowerCase()
  
  // Validate hex format
  if (!/^[0-9a-f]{6}$/.test(cleanHex)) return null
  
  // Parse RGB values
  const r = parseInt(cleanHex.substr(0, 2), 16)
  const g = parseInt(cleanHex.substr(2, 2), 16)
  const b = parseInt(cleanHex.substr(4, 2), 16)
  
  // Simple color mapping based on RGB values
  const brightness = (r + g + b) / 3
  
  if (brightness < 64) return 'black'
  if (brightness > 192) return 'white'
  
  // Find dominant color
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  
  if (diff < 50) {
    // Grayscale
    return brightness > 128 ? 'gray' : 'black'
  }
  
  // Color mapping
  if (r === max) {
    if (g > b) return brightness > 128 ? 'yellow' : 'red'
    return brightness > 128 ? 'brightred' : 'red'
  } else if (g === max) {
    if (r > b) return brightness > 128 ? 'yellow' : 'green'
    return brightness > 128 ? 'brightgreen' : 'green'
  } else {
    if (r > g) return brightness > 128 ? 'brightmagenta' : 'magenta'
    return brightness > 128 ? 'brightblue' : 'blue'
  }
}

/**
 * Gets complementary color for better contrast
 * @param {string} color - Base color
 * @returns {string} - Complementary color
 */
function getComplementaryColor(color) {
  const normalizedColor = normalizeColor(color)
  if (!normalizedColor) return 'white'
  
  // Simple complementary color mapping
  const complementMap = {
    'black': 'white',
    'white': 'black',
    'red': 'cyan',
    'green': 'magenta',
    'blue': 'yellow',
    'cyan': 'red',
    'magenta': 'green',
    'yellow': 'blue',
    'gray': 'white',
    'grey': 'white'
  }
  
  return complementMap[normalizedColor] || 'white'
}

// Export all functions and constants
module.exports = {
  VALID_COLORS,
  COLOR_ALIASES,
  UI_ELEMENTS,
  DEFAULT_COLORS,
  COLOR_THEMES,
  isValidColor,
  normalizeColor,
  getColorSuggestions,
  isValidUIElement,
  getUIElements,
  getUIElementDescription,
  validateColorConfig,
  applyColorTheme,
  getColorThemes,
  createColorPreview,
  formatColorConfig,
  hexToTerminalColor,
  getComplementaryColor
}