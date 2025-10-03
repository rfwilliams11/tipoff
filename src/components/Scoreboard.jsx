const React = require('react');
const { useSelector, useDispatch } = require('react-redux');
const { useEffect, useCallback, useMemo } = React;
const { format } = require('date-fns');

// Import Redux actions and selectors
const {
  selectGames,
  selectSelectedIndex,
  selectCurrentDate,
  selectIsLoading,
  selectError,
  selectFormattedDate,
  selectIsToday,
  selectNextGame,
  selectPreviousGame,
  selectGameByIndex,
  resetSelection
} = require('../store/scoreboardSlice');

const {
  selectGamesWithFavorites,
  selectColors
} = require('../store/configSlice');

// Import screen manager for key handling
const screenManager = require('../screen');

/**
 * Scoreboard component for displaying and navigating NBA games
 * Handles game list rendering, keyboard navigation, and date display
 */
const Scoreboard = React.memo(({ onGameSelect }) => {
  const dispatch = useDispatch();

  // Redux state
  const games = useSelector(selectGames);
  const gamesWithFavorites = useSelector(selectGamesWithFavorites);
  const selectedIndex = useSelector(selectSelectedIndex);
  const currentDate = useSelector(selectCurrentDate);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const formattedDate = useSelector(selectFormattedDate);
  const isToday = useSelector(selectIsToday);
  const colors = useSelector(selectColors);
  
  // Handle keyboard navigation
  useEffect(() => {
    const screen = screenManager.getScreen();
    if (!screen) return;
    
    const handleScoreboardKeys = (ch, key) => {
      if (!key) return;
      
      switch (key.name) {
        case 'up':
        case 'k':
          // Navigate to previous game
          dispatch(selectPreviousGame());
          break;
          
        case 'down':
        case 'j':
          // Navigate to next game
          dispatch(selectNextGame());
          break;
          
        case 'home':
          // Go to first game
          if (games.length > 0) {
            dispatch(selectGameByIndex(0));
          }
          break;
          
        case 'end':
          // Go to last game
          if (games.length > 0) {
            dispatch(selectGameByIndex(games.length - 1));
          }
          break;
          
        case 'enter':
          // Select current game
          if (games.length > 0 && selectedIndex < games.length) {
            const selectedGame = games[selectedIndex];
            if (selectedGame && onGameSelect) {
              onGameSelect(selectedGame.id);
            }
          }
          break;
      }
    };
    
    // Register key handler
    screen.on('keypress', handleScoreboardKeys);
    
    // Cleanup
    return () => {
      screen.removeListener('keypress', handleScoreboardKeys);
    };
  }, [games, selectedIndex, dispatch, onGameSelect]);
  
  // Reset selection when games change
  useEffect(() => {
    if (games.length > 0 && selectedIndex >= games.length) {
      dispatch(resetSelection());
    }
  }, [games.length, selectedIndex, dispatch]);
  
  // Memoized formatting functions
  const formatGameTime = useCallback((game) => {
    if (game.status.completed) {
      return 'FINAL';
    } else if (game.status.description === 'Scheduled') {
      return format(new Date(game.startTime), 'h:mm a');
    } else {
      // Live game - show quarter and time
      return `${game.status.period}Q ${game.status.displayClock || ''}`;
    }
  }, []);
  
  const formatTeamScore = useCallback((team, game) => {
    if (game.status.completed || game.status.description !== 'Scheduled') {
      return team.score !== undefined ? team.score.toString() : '0';
    }
    return '';
  }, []);
  
  const getGameStatusColor = useCallback((game) => {
    if (game.status.completed) {
      return colors.completedGame || 'gray';
    } else if (game.status.description === 'Scheduled') {
      return colors.teamName || 'cyan';
    } else {
      return colors.liveGame || 'green';
    }
  }, [colors]);
  
  // Memoized game items to prevent unnecessary re-renders
  const gameItems = useMemo(() => {
    return games.map((game, index) => {
      const gameWithFavorites = gamesWithFavorites[index] || game;
      const isFavoriteGame = gameWithFavorites.isFavoriteGame;
      
      // Team names with favorite indicators
      const awayTeamName = gameWithFavorites.awayTeamIsFavorite
        ? `★ ${game.awayTeam.name}`
        : game.awayTeam.name;
      const homeTeamName = gameWithFavorites.homeTeamIsFavorite
        ? `★ ${game.homeTeam.name}`
        : game.homeTeam.name;
      
      // Scores
      const awayScore = formatTeamScore(game.awayTeam, game);
      const homeScore = formatTeamScore(game.homeTeam, game);
      
      // Game time/status
      const gameTime = formatGameTime(game);
      
      // Build game line
      let gameLine = '';
      
      // Away team
      gameLine += awayTeamName.padEnd(20);
      if (awayScore) {
        gameLine += awayScore.padStart(3);
      } else {
        gameLine += '   ';
      }
      
      gameLine += '  vs  ';
      
      // Home team
      if (homeScore) {
        gameLine += homeScore.padEnd(3);
      } else {
        gameLine += '   ';
      }
      gameLine += homeTeamName.padEnd(20);
      
      // Game time/status
      gameLine += ` ${gameTime}`;
      
      // Venue (if space allows)
      if (game.venue && game.venue.name) {
        gameLine += ` @ ${game.venue.name}`;
      }
      
      return {
        index,
        content: gameLine,
        isFavoriteGame,
        statusColor: getGameStatusColor(game)
      };
    });
  }, [games, gamesWithFavorites, formatTeamScore, formatGameTime, getGameStatusColor]);
  
  // Memoized content generation
  const content = useMemo(() => {
    if (isLoading) {
      return 'Loading games...';
    }

    if (error) {
      return `Error loading games: ${error}\n\nPress 'r' to retry or 'n'/'p' to change date`;
    }

    if (games.length === 0) {
      return `No games scheduled for ${formattedDate}\n\nPress 'n'/'p' to navigate dates or 't' for today`;
    }
    
    // Build content for games list
    let content = '';
    
    // Header with date
    const dateHeader = isToday ? `Today - ${formattedDate}` : formattedDate;
    content += `${dateHeader}\n`;
    content += '='.repeat(dateHeader.length) + '\n\n';
    
    // Games list
    gameItems.forEach((gameItem) => {
      const prefix = gameItem.index === selectedIndex ? '> ' : '  ';
      content += `${prefix}${gameItem.content}\n`;
    });
    
    // Footer with navigation help
    content += '\n';
    content += 'Navigation: ↑↓/jk=Select  Enter=View  n/p=Date  t=Today  c=Scoreboard  q=Quit';
    
    return content;
  }, [isLoading, error, games.length, formattedDate, isToday, gameItems, selectedIndex]);
  
  // Memoized style based on current state
  const boxStyle = useMemo(() => {
    if (isLoading) {
      return { fg: colors.info || 'blue', bg: 'black' };
    } else if (error) {
      return { fg: colors.error || 'red', bg: 'black' };
    } else if (games.length === 0) {
      return { fg: colors.info || 'blue', bg: 'black' };
    } else {
      return { fg: 'white', bg: 'black' };
    }
  }, [isLoading, error, games.length, colors]);
  
  return React.createElement('box', {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    content,
    tags: true,
    scrollable: games.length > 0,
    alwaysScroll: games.length > 0,
    scrollbar: games.length > 0 ? {
      ch: ' ',
      track: {
        bg: 'gray'
      },
      style: {
        inverse: true
      }
    } : undefined,
    style: boxStyle
  });
});

module.exports = Scoreboard;