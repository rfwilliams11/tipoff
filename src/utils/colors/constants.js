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

module.exports = {
  VALID_COLORS,
  COLOR_ALIASES,
  UI_ELEMENTS,
  DEFAULT_COLORS,
  COLOR_THEMES
}
