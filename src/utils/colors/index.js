const {
  VALID_COLORS,
  COLOR_ALIASES,
  UI_ELEMENTS,
  DEFAULT_COLORS,
  COLOR_THEMES
} = require('./constants')

const {
  isValidColor,
  normalizeColor,
  getColorSuggestions,
  isValidUIElement,
  getUIElements,
  getUIElementDescription,
  validateColorConfig
} = require('./validation')

const {
  applyColorTheme,
  getColorThemes,
  createColorPreview,
  formatColorConfig,
  hexToTerminalColor,
  getComplementaryColor
} = require('./formatting')

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
