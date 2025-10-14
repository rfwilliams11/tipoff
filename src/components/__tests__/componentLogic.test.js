// Unit tests for core application logic
import { configureStore } from '@reduxjs/toolkit'
import scoreboardSlice, {
  selectNextGame,
  selectPreviousGame,
  selectGameByIndex
} from '../../store/scoreboardSlice'
import gamesSlice, {
  selectGame,
  clearSelectedGame
} from '../../store/gamesSlice'

describe('Core Application Logic', () => {
  let store

  const mockGames = [
    {
      id: '1',
      homeTeam: { id: 'LAL', displayName: 'Los Angeles Lakers', score: 110 },
      awayTeam: { id: 'GSW', displayName: 'Golden State Warriors', score: 105 },
      status: { completed: true, description: 'Final' }
    },
    {
      id: '2',
      homeTeam: { id: 'BOS', displayName: 'Boston Celtics', score: 95 },
      awayTeam: { id: 'MIA', displayName: 'Miami Heat', score: 88 },
      status: { completed: false, description: '3rd Quarter' }
    }
  ]

  beforeEach(() => {
    // Disable Redux serialization warnings for tests
    store = configureStore({
      reducer: {
        scoreboard: scoreboardSlice,
        games: gamesSlice
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false
        }),
      preloadedState: {
        scoreboard: {
          loading: false,
          error: null,
          date: '2025-01-15', // Use string instead of Date to avoid serialization warnings
          games: mockGames,
          selectedIndex: 0,
          lastFetched: null
        },
        games: {
          loading: false,
          error: null,
          selectedId: null,
          games: {},
          pollingIntervals: {},
          lastPolled: {},
          memoryStats: { totalGames: 0, totalPlays: 0, lastCleanup: null }
        }
      }
    })
  })

  describe('Game Navigation', () => {
    it('should navigate between games', () => {
      // Test next game selection
      store.dispatch(selectNextGame())
      expect(store.getState().scoreboard.selectedIndex).toBe(1)

      // Test previous game selection
      store.dispatch(selectPreviousGame())
      expect(store.getState().scoreboard.selectedIndex).toBe(0)

      // Test direct game selection
      store.dispatch(selectGameByIndex(1))
      expect(store.getState().scoreboard.selectedIndex).toBe(1)
    })

    it('should handle boundary conditions', () => {
      // Test selecting beyond last game
      store.dispatch(selectGameByIndex(10))
      expect(store.getState().scoreboard.selectedIndex).toBe(0) // Should not change

      // Test selecting negative index
      store.dispatch(selectGameByIndex(-1))
      expect(store.getState().scoreboard.selectedIndex).toBe(0) // Should not change
    })
  })

  describe('Game Selection', () => {
    it('should handle game selection', () => {
      // Test selecting a game
      store.dispatch(selectGame('game123'))
      expect(store.getState().games.selectedId).toBe('game123')

      // Test clearing selection
      store.dispatch(clearSelectedGame())
      expect(store.getState().games.selectedId).toBe(null)
    })
  })

  describe('View Switching', () => {
    it('should handle view switching logic', () => {
      // Start with no selected game (scoreboard view)
      expect(store.getState().games.selectedId).toBe(null)

      // Simulate selecting a game (switch to game view)
      store.dispatch(selectGame('game123'))
      expect(store.getState().games.selectedId).toBe('game123')

      // Simulate going back to scoreboard
      store.dispatch(clearSelectedGame())
      expect(store.getState().games.selectedId).toBe(null)
    })
  })

  describe('State Management', () => {
    it('should maintain correct state structure', () => {
      const state = store.getState()

      // Test scoreboard state
      expect(state.scoreboard.games).toEqual(mockGames)
      expect(state.scoreboard.selectedIndex).toBe(0)
      expect(state.scoreboard.loading).toBe(false)

      // Test games state
      expect(state.games.selectedId).toBe(null)
      expect(state.games.loading).toBe(false)
    })
  })


})