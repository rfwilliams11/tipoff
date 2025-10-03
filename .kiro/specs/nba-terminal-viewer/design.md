# Design Document

## Overview

Tipoff is a React-based terminal application that renders NBA game information using Blessed for terminal UI. The application follows a Redux-based state management pattern with two main views: a scoreboard view for browsing games and a detailed game view for live updates. The system uses polling-based data fetching from ESPN's unofficial API to provide real-time game information.

## Architecture

### Tech Stack
- **React + Redux Toolkit**: UI state management and component rendering
- **Blessed**: Terminal UI rendering library providing widgets and screen management
- **React-Blessed**: Bridge library connecting React components to Blessed terminal widgets
- **Axios**: HTTP client for API requests with compression and error handling
- **Commander.js**: CLI argument parsing and command handling
- **Date-fns**: Date manipulation and formatting utilities

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Layer     │    │  React Layer    │    │   Data Layer    │
│                 │    │                 │    │                 │
│ • Commander.js  │───▶│ • Components    │───▶│ • Redux Store   │
│ • Config mgmt   │    │ • React-Blessed │    │ • API Services  │
│ • Entry point   │    │ • Event handling│    │ • Polling logic │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Terminal Layer  │    │  State Layer    │    │ Network Layer   │
│                 │    │                 │    │                 │
│ • Blessed screen│    │ • Redux slices  │    │ • ESPN API      │
│ • Key bindings  │    │ • Selectors     │    │ • Error handling│
│ • Rendering     │    │ • Middleware    │    │ • Rate limiting │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components and Interfaces

### Core Components

#### 1. Application Bootstrap (`src/main.js`)
- Initializes React-Blessed rendering
- Sets up Redux Provider
- Configures global error handling
- Provides requestAnimationFrame polyfill for terminal environment

#### 2. Terminal Screen Management (`src/screen.js`)
- Singleton Blessed screen instance
- Global key bindings (quit, navigation)
- Screen configuration and cleanup

#### 3. CLI Interface (`src/cli.js`)
- Command-line argument parsing
- Configuration subcommands
- Application launch coordination

#### 4. Main Application Component (`src/components/App.jsx`)
```jsx
interface AppProps {}

interface AppState {
  currentView: 'scoreboard' | 'game'
  selectedGameId: string | null
}

// Manages top-level view routing and global key handlers
```

#### 5. Scoreboard Component (`src/components/Scoreboard.jsx`)
```jsx
interface ScoreboardProps {
  games: Game[]
  selectedIndex: number
  date: Date
  loading: boolean
  error: string | null
}

// Displays daily game list with navigation
```

#### 6. Game View Components
```jsx
// Game container
interface GameProps {
  gameId: string
}

// Live game display
interface LiveGameProps {
  gameData: GameData
  liveData: LiveData
}

// Box score statistics
interface BoxScoreProps {
  teamStats: TeamStats[]
}

// Play-by-play list
interface PlayByPlayProps {
  plays: Play[]
  scrollPosition: number
}
```

### Data Interfaces

#### Redux Store Structure
```typescript
interface RootState {
  scoreboard: {
    loading: boolean
    error: string | null
    date: Date
    games: Game[]
    selectedIndex: number
  }
  games: {
    loading: boolean
    error: string | null
    selectedId: string | null
    games: Record<string, GameDetail>
  }
  config: {
    favorites: string[]
    colors: ColorConfig
  }
  ui: {
    currentView: 'scoreboard' | 'game'
    scrollPosition: number
  }
}

interface Game {
  id: string
  homeTeam: Team
  awayTeam: Team
  status: GameStatus
  startTime: Date
  venue: Venue
}

interface GameDetail {
  gameData: {
    teams: [Team, Team]
    status: GameStatus
    venue: Venue
    officials: Official[]
  }
  liveData: {
    boxscore: BoxScore
    plays: Play[]
    currentPlay: Play | null
    clock: ClockInfo
  }
}

interface Team {
  id: string
  name: string
  abbreviation: string
  displayName: string
  color: string
  logo: string
  score?: number
}

interface Play {
  id: string
  period: number
  clock: string
  description: string
  type: PlayType
  team?: Team
  players: Player[]
}
```

## Data Models

### API Response Mapping

#### ESPN Scoreboard API Response
```typescript
// Maps ESPN scoreboard response to internal Game objects
const mapScoreboardResponse = (response: ESPNScoreboardResponse): Game[] => {
  return response.events.map(event => ({
    id: event.id,
    homeTeam: mapTeam(event.competitions[0].competitors.find(c => c.homeAway === 'home')),
    awayTeam: mapTeam(event.competitions[0].competitors.find(c => c.homeAway === 'away')),
    status: mapGameStatus(event.status),
    startTime: new Date(event.date),
    venue: mapVenue(event.competitions[0].venue)
  }))
}
```

#### ESPN Game Detail API Response
```typescript
// Maps ESPN game summary response to internal GameDetail object
const mapGameDetailResponse = (response: ESPNGameResponse): GameDetail => {
  return {
    gameData: {
      teams: [mapTeam(response.header.competitions[0].competitors[0]), 
              mapTeam(response.header.competitions[0].competitors[1])],
      status: mapGameStatus(response.header.competitions[0].status),
      venue: mapVenue(response.header.competitions[0].venue)
    },
    liveData: {
      boxscore: mapBoxScore(response.boxscore),
      plays: response.plays?.items?.map(mapPlay) || [],
      currentPlay: response.plays?.current ? mapPlay(response.plays.current) : null,
      clock: mapClockInfo(response.header.competitions[0].status)
    }
  }
}
```

### Data Validation and Normalization

#### Input Validation
```typescript
const validateGameData = (data: any): GameDetail | null => {
  if (!data || !data.header || !data.header.competitions) {
    return null
  }
  
  // Validate required fields and provide defaults
  return normalizeGameData(data)
}
```

## Error Handling

### Network Error Strategy
```typescript
// Exponential backoff for failed requests
const createRetryMiddleware = () => {
  return (store) => (next) => (action) => {
    if (action.type.endsWith('/pending')) {
      // Set loading state
    }
    
    if (action.type.endsWith('/rejected')) {
      // Handle error with retry logic
      const retryCount = action.meta?.retryCount || 0
      if (retryCount < 3) {
        setTimeout(() => {
          store.dispatch({
            ...action.meta.originalAction,
            meta: { ...action.meta, retryCount: retryCount + 1 }
          })
        }, Math.pow(2, retryCount) * 1000)
      }
    }
    
    return next(action)
  }
}
```

### API Error Handling
```typescript
const apiErrorHandler = (error: AxiosError) => {
  if (error.response?.status === 429) {
    // Rate limit - implement backoff
    return { type: 'RATE_LIMITED', retryAfter: error.response.headers['retry-after'] }
  }
  
  if (error.response?.status >= 500) {
    // Server error - retry with backoff
    return { type: 'SERVER_ERROR', retryable: true }
  }
  
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    // Network error - retry with backoff
    return { type: 'NETWORK_ERROR', retryable: true }
  }
  
  // Client error - don't retry
  return { type: 'CLIENT_ERROR', retryable: false, message: error.message }
}
```

## Testing Strategy

### Unit Testing Approach
```typescript
// Redux slice testing
describe('scoreboardSlice', () => {
  it('should handle fetchScoreboard.fulfilled', () => {
    const initialState = { games: [], loading: true, error: null }
    const action = { type: 'scoreboard/fetchScoreboard/fulfilled', payload: mockGames }
    const result = scoreboardSlice.reducer(initialState, action)
    
    expect(result.games).toEqual(mockGames)
    expect(result.loading).toBe(false)
    expect(result.error).toBe(null)
  })
})

// Component testing with React Testing Library
describe('Scoreboard', () => {
  it('should render games list', () => {
    const mockProps = {
      games: mockGames,
      selectedIndex: 0,
      date: new Date(),
      loading: false,
      error: null
    }
    
    render(<Scoreboard {...mockProps} />)
    expect(screen.getByText('LAL vs GSW')).toBeInTheDocument()
  })
})
```

### Integration Testing
```typescript
// API integration tests
describe('ESPN API Integration', () => {
  it('should fetch scoreboard data', async () => {
    const date = new Date('2025-01-15')
    const result = await fetchScoreboardData(date)
    
    expect(result).toHaveProperty('events')
    expect(Array.isArray(result.events)).toBe(true)
  })
  
  it('should handle API errors gracefully', async () => {
    // Mock network error
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'))
    
    const result = await fetchScoreboardData(new Date())
    expect(result).toEqual({ error: 'Network Error', events: [] })
  })
})
```

### Terminal UI Testing
```typescript
// Blessed component testing
describe('Terminal UI', () => {
  it('should handle keyboard navigation', () => {
    const screen = blessed.screen()
    const scoreboard = new ScoreboardWidget({ screen })
    
    // Simulate key press
    screen.emit('keypress', null, { name: 'down' })
    
    expect(scoreboard.selectedIndex).toBe(1)
  })
})
```

## Performance Considerations

### Polling Optimization
```typescript
const getPollingInterval = (gameStatus: GameStatus): number | null => {
  switch (gameStatus) {
    case 'in_progress':
      return 5000  // 5 seconds during live play
    case 'halftime':
    case 'timeout':
      return 30000 // 30 seconds during breaks
    case 'final':
      return null  // Stop polling
    case 'scheduled':
      return 60000 // 1 minute for scheduled games
    default:
      return 15000 // 15 seconds default
  }
}
```

### Memory Management
```typescript
// Limit play-by-play history to prevent memory bloat
const MAX_PLAYS_HISTORY = 50

const playByPlaySlice = createSlice({
  name: 'playByPlay',
  initialState: { plays: [] },
  reducers: {
    addPlay: (state, action) => {
      state.plays.unshift(action.payload)
      if (state.plays.length > MAX_PLAYS_HISTORY) {
        state.plays = state.plays.slice(0, MAX_PLAYS_HISTORY)
      }
    }
  }
})
```

### Rendering Optimization
```typescript
// Memoized selectors to prevent unnecessary re-renders
export const selectVisiblePlays = createSelector(
  [selectAllPlays, selectScrollPosition],
  (plays, scrollPosition) => {
    const VISIBLE_PLAYS = 10
    return plays.slice(scrollPosition, scrollPosition + VISIBLE_PLAYS)
  }
)

// React.memo for expensive components
export const PlayByPlay = React.memo(({ plays, scrollPosition }) => {
  const visiblePlays = useMemo(() => 
    plays.slice(scrollPosition, scrollPosition + 10), 
    [plays, scrollPosition]
  )
  
  return (
    <box>
      {visiblePlays.map(play => <PlayItem key={play.id} play={play} />)}
    </box>
  )
})
```

## Security Considerations

### API Security
- Use HTTPS for all API requests
- Implement request timeout limits
- Validate all incoming data before processing
- Sanitize display strings to prevent terminal injection

### Configuration Security
- Store user preferences in local config files with appropriate permissions
- Validate configuration values before applying
- Provide secure defaults for all settings

## Deployment and Distribution

### Package Structure
```
tipoff/
├── package.json
├── bin/
│   └── tipoff              # Executable script
├── src/
│   ├── cli.js             # CLI entry point
│   ├── main.js            # Application bootstrap
│   ├── screen.js          # Terminal screen setup
│   ├── config.js          # Configuration management
│   ├── store/             # Redux store and slices
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   └── utils/             # Utility functions
├── config/
│   └── default.json       # Default configuration
└── README.md
```

### Installation and Usage
```bash
# Global installation
npm install -g tipoff

# Usage
tipoff                        # Launch with today's games
tipoff config favorites LAL   # Set favorite team
tipoff config color.score yellow  # Set score color
```