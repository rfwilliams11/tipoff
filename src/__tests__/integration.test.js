// Integration test for core application functionality
import { configureStore } from '@reduxjs/toolkit'
import scoreboardSlice, { selectNextGame, selectGameByIndex } from '../store/scoreboardSlice'
import gamesSlice, { selectGame, clearSelectedGame } from '../store/gamesSlice'

describe('Application Integration', () => {
  let store

  beforeEach(() => {
    store = configureStore({
      reducer: {
        scoreboard: scoreboardSlice,
        games: gamesSlice
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false
        })
    })
  })

  it('should handle complete user workflow', () => {
    // 1. Load games into scoreboard
    const mockGames = [
      { id: '1', homeTeam: { id: 'LAL' }, awayTeam: { id: 'GSW' } },
      { id: '2', homeTeam: { id: 'BOS' }, awayTeam: { id: 'MIA' } }
    ]
    
    store.dispatch({ 
      type: 'scoreboard/fetchScoreboard/fulfilled', 
      payload: { games: mockGames } 
    })

    // 2. Navigate through games
    expect(store.getState().scoreboard.selectedIndex).toBe(0)
    store.dispatch(selectNextGame())
    expect(store.getState().scoreboard.selectedIndex).toBe(1)

    // 3. Select a game for detailed view
    const selectedGame = store.getState().scoreboard.games[1]
    store.dispatch(selectGame(selectedGame.id))
    expect(store.getState().games.selectedId).toBe(selectedGame.id)

    // 4. Return to scoreboard
    store.dispatch(clearSelectedGame())
    expect(store.getState().games.selectedId).toBe(null)
  })

  it('should maintain state consistency', () => {
    const state = store.getState()

    // Check initial state structure
    expect(state.scoreboard).toBeDefined()
    expect(state.games).toBeDefined()

    // Check default values
    expect(state.scoreboard.games).toEqual([])
    expect(state.scoreboard.selectedIndex).toBe(0)
    expect(state.games.selectedId).toBe(null)
  })
})