const React = require('react');
const { useSelector, useDispatch } = require('react-redux');
const { useEffect, useState, useCallback } = React;

// Import components
const Scoreboard = require('./Scoreboard.jsx');
const Game = require('./Game.jsx');

// Import Redux actions and selectors
const {
  fetchScoreboard,
  selectScoreboardState,
  navigateToNextDay,
  navigateToPreviousDay,
  navigateToToday
} = require('../store/scoreboardSlice');

const { 
  selectGame, 
  clearSelectedGame,
  selectSelectedGameId: selectGamesSelectedGameId,
  selectSelectedGame
} = require('../store/gamesSlice');

const { loadConfig } = require('../store/configSlice');

// Import screen manager for global key handling
const screenManager = require('../screen');

/**
 * Main App component with view routing and global keyboard shortcuts
 * Manages the application's view state and coordinates between scoreboard and game views
 */
const App = React.memo(() => {
  const dispatch = useDispatch();
  
  // Redux state
  const scoreboardState = useSelector(selectScoreboardState);
  const gamesSelectedGameId = useSelector(selectGamesSelectedGameId);
  const selectedGame = useSelector(selectSelectedGame);
  
  // Local view state
  const [currentView, setCurrentView] = useState('scoreboard');
  
  // Initialize application on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load user configuration
        await dispatch(loadConfig()).unwrap();

        // Initial scoreboard fetch will be triggered by the auto-fetch effect
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [dispatch]);
  
  // Handle view switching
  const switchToScoreboard = useCallback(() => {
    setCurrentView('scoreboard');
    dispatch(clearSelectedGame());
  }, [dispatch]);
  
  const switchToGame = useCallback((gameId) => {
    if (gameId) {
      dispatch(selectGame(gameId));
      setCurrentView('game');
    }
  }, [dispatch]);
  
  // Handle global keyboard shortcuts
  useEffect(() => {
    const screen = screenManager.getScreen();
    if (!screen) return;

    const handleGlobalKeys = (ch, key) => {
      if (!key) return;

      switch (key.name) {
        case 'c':
          // Return to scoreboard view
          switchToScoreboard();
          break;

        case 'n':
          // Navigate to next day (only in scoreboard view)
          if (currentView === 'scoreboard') {
            dispatch(navigateToNextDay());
            // fetchScoreboard will be called automatically by the date change effect
          }
          break;

        case 'p':
          // Navigate to previous day (only in scoreboard view)
          if (currentView === 'scoreboard') {
            dispatch(navigateToPreviousDay());
            // fetchScoreboard will be called automatically by the date change effect
          }
          break;

        case 't':
          // Navigate to today (only in scoreboard view)
          if (currentView === 'scoreboard') {
            dispatch(navigateToToday());
            // fetchScoreboard will be called automatically by the date change effect
          }
          break;
      }
    };

    // Register global key handler with once flag to prevent double firing
    screen.on('keypress', handleGlobalKeys);

    // Cleanup
    return () => {
      screen.removeListener('keypress', handleGlobalKeys);
    };
  }, [
    currentView,
    dispatch,
    switchToScoreboard
  ]);
  
  // Auto-fetch scoreboard when date changes
  useEffect(() => {
    if (currentView === 'scoreboard') {
      dispatch(fetchScoreboard(scoreboardState.date));
    }
  }, [scoreboardState.date, currentView, dispatch]);
  
  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'game':
        if (gamesSelectedGameId) {
          return React.createElement(Game, {
            gameId: gamesSelectedGameId,
            onBackToScoreboard: switchToScoreboard
          });
        }
        // Fall through to scoreboard if no game selected
        
      case 'scoreboard':
      default:
        return React.createElement(Scoreboard, {
          onGameSelect: switchToGame
        });
    }
  };
  
  // Memoized app container style
  const appStyle = React.useMemo(() => ({
    fg: 'white',
    bg: 'black'
  }), []);
  
  // Main app container
  return React.createElement('box', {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: appStyle
  }, renderCurrentView());
});

module.exports = App;