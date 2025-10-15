const DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  HOME: 'home',
  END: 'end',
  PAGE_UP: 'pageup',
  PAGE_DOWN: 'pagedown'
}

const KEY_MAPPINGS = {
  // Arrow keys
  ARROWS: {
    up: DIRECTIONS.UP,
    down: DIRECTIONS.DOWN,
    left: DIRECTIONS.LEFT,
    right: DIRECTIONS.RIGHT,
    home: DIRECTIONS.HOME,
    end: DIRECTIONS.END,
    pageup: DIRECTIONS.PAGE_UP,
    pagedown: DIRECTIONS.PAGE_DOWN
  },

  // Vim-style navigation
  VIM: {
    k: DIRECTIONS.UP,
    j: DIRECTIONS.DOWN,
    h: DIRECTIONS.LEFT,
    l: DIRECTIONS.RIGHT,
    g: DIRECTIONS.HOME, // gg for top
    G: DIRECTIONS.END   // G for bottom
  },

  // WASD navigation
  WASD: {
    w: DIRECTIONS.UP,
    s: DIRECTIONS.DOWN,
    a: DIRECTIONS.LEFT,
    d: DIRECTIONS.RIGHT
  }
}

module.exports = {
  DIRECTIONS,
  KEY_MAPPINGS
}
