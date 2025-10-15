const { COLOR_THEMES } = require('./constants')
const { normalizeColor, getUIElementDescription } = require('./validation')

function applyColorTheme(themeName) {
  if (!themeName || typeof themeName !== 'string') return null

  const theme = COLOR_THEMES[themeName.toLowerCase()]
  return theme ? { ...theme.colors } : null
}

function getColorThemes() {
  return Object.entries(COLOR_THEMES).map(([key, theme]) => ({
    key,
    name: theme.name,
    description: theme.description
  }))
}

function createColorPreview(color, text = null) {
  const normalizedColor = normalizeColor(color)
  if (!normalizedColor) return `Invalid color: ${color}`

  const displayText = text || normalizedColor
  return `{${normalizedColor}-fg}${displayText}{/}`
}

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

module.exports = {
  applyColorTheme,
  getColorThemes,
  createColorPreview,
  formatColorConfig,
  hexToTerminalColor,
  getComplementaryColor
}
