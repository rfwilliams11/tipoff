import { configureStore } from '@reduxjs/toolkit'
import scoreboardSlice, {
  selectNextGame,
  selectPreviousGame,
  selectGameByIndex,
  clearError,
  resetSelection
} from '../scoreboardSlice'

describe('scoreboardSlice', () => {
  let store

  const mockGames = [
    {
      id: '1',
      homeTeam: { id: 'LAL', name: 'Los Angeles Lakers', score: 110 },
      awayTeam: { id: 'GSW', name: 'Golden State Warriors', score: 105 },
      status: { completed: true, description: 'Final' }
    },
    {
      id: '2',
      homeTeam: { id: 'BOS', name: 'Boston Celtics', score: 95 },
      awayTeam: { id: 'MIA', name: 'Miami Heat', score: 88 },
      status: { completed: false, description: '3rd Quarter' }
    }
  ]

  beforeEach(() => {
    store = configureStore({
      reducer: {
        scoreboard: scoreboardSlice
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false
        })
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().scoreboard
      expect(state.loading).toBe(false)
      expect(state.error).toBe(null)
      expect(state.games).toEqual([])
      expect(state.selectedIndex).toBe(0)
    })
  })

  describe('game navigation', () => {
    beforeEach(() => {
      // Set up initial state with games
      store.dispatch({ 
        type: 'scoreboard/fetchScoreboard/fulfilled', 
        payload: { games: mockGames } 
      })
    })

    it('should handle selectNextGame', () => {
      store.dispatch(selectNextGame())
      expect(store.getState().scoreboard.selectedIndex).toBe(1)
      
      // Should not go beyond last game
      store.dispatch(selectNextGame())
      expect(store.getState().scoreboard.selectedIndex).toBe(1)
    })

    it('should handle selectPreviousGame', () => {
      store.dispatch(selectGameByIndex(1))
      store.dispatch(selectPreviousGame())
      expect(store.getState().scoreboard.selectedIndex).toBe(0)
      
      // Should not go below 0
      store.dispatch(selectPreviousGame())
      expect(store.getState().scoreboard.selectedIndex).toBe(0)
    })

    it('should handle selectGameByIndex', () => {
      store.dispatch(selectGameByIndex(1))
      expect(store.getState().scoreboard.selectedIndex).toBe(1)
      
      // Should ignore invalid indices
      store.dispatch(selectGameByIndex(10))
      expect(store.getState().scoreboard.selectedIndex).toBe(1)
      
      store.dispatch(selectGameByIndex(-1))
      expect(store.getState().scoreboard.selectedIndex).toBe(1)
    })
  })

  describe('error handling', () => {
    it('should handle clearError', () => {
      // Set an error first
      store.dispatch({ type: 'scoreboard/fetchScoreboard/rejected', payload: { message: 'Test error' } })
      expect(store.getState().scoreboard.error).toBe('Test error')
      
      store.dispatch(clearError())
      expect(store.getState().scoreboard.error).toBe(null)
    })

    it('should handle resetSelection', () => {
      store.dispatch({ 
        type: 'scoreboard/fetchScoreboard/fulfilled', 
        payload: { games: mockGames } 
      })
      store.dispatch(selectGameByIndex(1))
      store.dispatch(resetSelection())
      expect(store.getState().scoreboard.selectedIndex).toBe(0)
    })
  })
})