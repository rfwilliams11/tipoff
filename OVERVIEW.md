# NBA Terminal Viewer - Technical Overview

## Application Summary

A CLI application for watching live NBA games directly in the terminal. Built with React + Redux rendering to terminal via Blessed, providing real-time game updates with efficient data fetching.

---

## Architecture

### Tech Stack
- **React + Redux Toolkit** - UI state management in terminal environment
- **Blessed** - Terminal UI rendering library
- **React-Blessed** - Bridge between React components and Blessed terminal widgets
- **Axios** - HTTP client for API requests
- **Data Source** - Third-party NBA data API (ESPN, NBA.com scraping, or commercial API)

### Core Structure

```
src/
├── cli.js              # CLI entry point, command handling
├── main.js             # Application bootstrap
├── screen.js           # Blessed terminal screen setup
├── config.js           # User configuration (colors, favorites)
├── store/
│   └── index.js        # Redux store configuration
├── features/
│   ├── scoreboard.js   # Daily game schedule/scores (Redux slice)
│   ├── games.js        # Individual game details (Redux slice)
│   └── keys.js         # Keyboard shortcut management
├── components/
│   ├── App.jsx         # Main application component
│   ├── Scoreboard.jsx  # Daily games list view
│   ├── Game.jsx        # Individual game container
│   ├── LiveGame.jsx    # Live game display layout
│   ├── PreviewGame.jsx # Pre-game information
│   ├── FinishedGame.jsx # Final score display
│   ├── BoxScore.jsx    # Team/player statistics box
│   ├── PlayByPlay.jsx  # Scrollable play list
│   ├── CurrentPlay.jsx # Active possession display
│   └── HelpBar.jsx     # Keyboard shortcuts help
└── hooks/
    └── useKey.js       # Keyboard event handling
```

---

## Core Components

### 1. Entry Point & Terminal Setup

**CLI (src/cli.js)**
- Commander.js for CLI argument parsing
- `config` subcommand for user preferences (team colors, favorites)
- Main action launches React terminal interface

**Screen (src/screen.js)**
- Blessed screen instance (singleton)
- Global keybindings (q/ESC/Ctrl+C to quit)
- React components render to this instead of DOM

**Bootstrap (src/main.js)**
- Polyfills (requestAnimationFrame)
- Error handling setup
- React-Blessed render call with Redux Provider

### 2. State Management (Redux)

**Store Configuration (src/store/index.js)**
```javascript
{
  scoreboard: {
    loading: false,
    error: null,
    date: Date,
    games: []
  },
  games: {
    loading: false,
    error: null,
    selectedId: string,
    games: {
      [gameId]: {
        gameData: {},    // Teams, venue, status
        liveData: {}     // Score, plays, box score
      }
    }
  },
  keys: {} // Keyboard shortcuts registry
}
```

### 3. Two Main Views

**Scoreboard View**
- Displays all NBA games for selected date
- Shows game status (scheduled/live/final)
- Team names, scores (if started)
- Navigation: arrow keys or vim keys (h/j/k/l)
- Actions: n/p (next/prev day), t (today), Enter (select game)

**Game View**
- Live game details for selected game
- Components:
  - **Quarter/Time display**
  - **Current score**
  - **Team stats** (FG%, 3P%, FT%, rebounds, assists, turnovers)
  - **Play-by-play scrollable list**
  - **Current possession indicator**

---

## Data Fetching Strategy

### Without Official API Support

Since NBA doesn't provide a public differential patching API like MLB, we use **full-replacement polling**:

#### Scoreboard Data
```javascript
// src/features/scoreboard.js
export const fetchScoreboard = createAsyncThunk(
  'scoreboard/fetch',
  async (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Option 1: ESPN API (unofficial)
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateStr}`;

    const response = await axios.get(url);
    return response.data;
  }
);
```

#### Game Details
```javascript
// src/features/games.js
export const fetchGame = createAsyncThunk(
  'games/fetch',
  async (gameId) => {
    // Full game data fetch - no differential patching
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${gameId}`;
    const response = await axios.get(url);
    return response.data;
  }
);
```

#### Polling Implementation
```javascript
// src/components/Game.jsx
const updateGameData = () => {
  dispatch(fetchGame(id))
    .unwrap()
    .then(() => {
      // Adaptive polling based on game state
      const wait = getPollingInterval(gameStatus);
      if (wait) {
        timerRef.current = setTimeout(updateGameData, wait);
      }
    });
};

const getPollingInterval = (status) => {
  if (status === 'in_progress') return 5000;   // 5s during live play
  if (status === 'halftime') return 30000;     // 30s during halftime
  if (status === 'final') return null;         // Stop polling
  return 15000;                                // 15s default
};
```

### Reducer Logic (Simplified)

```javascript
// src/features/games.js
extraReducers: (builder) => {
  builder.addCase(fetchGame.fulfilled, (state, action) => {
    const id = state.selectedId;
    state.games[id] = action.payload;  // Direct replacement
    state.loading = false;
    state.error = null;
  });
}
```

---

## Optimization Strategies

### 1. Smart Polling
- **Live games**: 5-10 second intervals
- **Halftime/timeouts**: 30 second intervals
- **Finished games**: Stop polling
- **Scheduled games**: 60 second intervals (check for start)

### 2. Response Compression
```javascript
axios.get(url, {
  headers: { 'Accept-Encoding': 'gzip, deflate' }
})
```

### 3. Selective Re-rendering
```javascript
// Memoized selectors prevent unnecessary component updates
export const selectPlayByPlay = createSelector(
  selectLiveData,
  data => data.plays,
  {
    memoizeOptions: {
      equalityCheck: shallowEqual,
      maxSize: 5
    }
  }
);
```

### 4. Data Normalization
Store minimal data, compute derived values in selectors:
```javascript
// Don't store: formatted strings, computed stats
// Do store: raw scores, timestamps, play IDs
```

---

## Key Features

### User Configuration
```bash
# Set favorite team
nba-viewer config favorites LAL

# Customize colors
nba-viewer config color.score yellow
nba-viewer config color.current-team blue

# View all settings
nba-viewer config
```

### Navigation
```
Global:
  q/ESC       - Quit
  c           - Scoreboard view

Scoreboard:
  ↑↓/jk       - Navigate games
  ←→/hl       - Navigate games (horizontal)
  Enter       - View selected game
  p           - Previous day
  n           - Next day
  t           - Today

Game View:
  ↑↓/jk       - Scroll play-by-play
```

### Display Elements

**Live Game View Layout**
```
┌─────────────────────────────────────────────────────┐
│ Q3 5:42                    LAL 78 - GSW 82          │
├─────────────────────────────────────────────────────┤
│ Team Stats          │  Play-by-Play                 │
│ LAL: 45% FG         │  [MADE FG] Curry 3PT (25pts) │
│      38% 3PT        │  [MISS] James layup           │
│      25 REB         │  [REBOUND] Green (DEF)        │
│                     │  [MADE FG] Green dunk         │
│ GSW: 48% FG         │  [TIMEOUT] Lakers             │
│      42% 3PT        │                               │
│      28 REB         │  [Q2]                         │
│                     │  [MADE FT] Davis (2/2)        │
└─────────────────────┴───────────────────────────────┘
```

---

## Data Flow

1. **App Launch** → Fetch today's scoreboard
2. **User selects game** → Fetch full game data
3. **Polling loop** → Fetch full game updates at adaptive intervals
4. **Redux update** → Replace game state entirely
5. **React re-render** → Blessed updates terminal display
6. **User exits game** → Clear polling timeout

---

## Performance Considerations

### Bandwidth Usage
Without differential patching:
- **Per update**: ~50-150 KB (vs. ~5 KB with patches)
- **Per game (2.5 hours)**: ~50-150 MB
- **Mitigation**: Adaptive polling, compression, selective updates

### CPU Usage
- React reconciliation on every update
- Blessed terminal re-rendering
- **Mitigation**: Memoized selectors, shouldComponentUpdate

### Memory
- Store only current viewed game data
- Clear old game data when switching views
- Limit play-by-play history (last 50 plays)

---

## Data Sources

### Option 1: ESPN API (Unofficial)
- **Pros**: Free, comprehensive, JSON format
- **Cons**: Unofficial, may break, rate limits unknown
- **Endpoints**:
  - Scoreboard: `site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`


