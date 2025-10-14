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

// Import screen manager for key handling
const screenManager = require('../screen');

const DEFAULT_COLORS = {
  score: 'white',
  teamName: 'cyan',
  selectedGame: 'yellow',
  liveGame: 'green',
  completedGame: 'gray',
  error: 'red',
  info: 'blue',
  background: 'black'
};

const Scoreboard = React.memo(({ onGameSelect }) => {
  const dispatch = useDispatch();

  // Redux state
  const games = useSelector(selectGames);
  const selectedIndex = useSelector(selectSelectedIndex);
  const currentDate = useSelector(selectCurrentDate);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const formattedDate = useSelector(selectFormattedDate);
  const isToday = useSelector(selectIsToday);
  
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
      return DEFAULT_COLORS.completedGame;
    } else if (game.status.description === 'Scheduled') {
      return DEFAULT_COLORS.teamName;
    } else {
      return DEFAULT_COLORS.liveGame;
    }
  }, []);
  
  // Memoized game items to prevent unnecessary re-renders
  const gameItems = useMemo(() => {
    return games.map((game, index) => {
      // Team names (no favorites anymore)
      const awayTeamBaseName = game.awayTeam.name;
      const homeTeamBaseName = game.homeTeam.name;

      // Scores
      const awayScore = formatTeamScore(game.awayTeam, game);
      const homeScore = formatTeamScore(game.homeTeam, game);

      // Game time/status
      const gameTime = formatGameTime(game);

      // Determine game status for styling
      const isLive = !game.status.completed && game.status.description !== 'Scheduled';
      const isFinal = game.status.completed;
      const isScheduled = game.status.description === 'Scheduled';

      // Determine winning/losing teams for score colors
      const awayScoreNum = parseInt(awayScore) || 0;
      const homeScoreNum = parseInt(homeScore) || 0;
      const awayWinning = awayScoreNum > homeScoreNum && (isFinal || isLive);
      const homeWinning = homeScoreNum > awayScoreNum && (isFinal || isLive);

      // Build game line with fixed-width columns for proper alignment
      const awayTeamWidth = 25;  // Fixed width for away team
      const scoreWidth = 3;      // Fixed width for scores
      const homeTeamWidth = 25;  // Fixed width for home team
      const timeColumnStart = 65; // Where time should start (right-aligned)

      let gameLine = '';
      let plainTextLength = 0;

      // Away team section (no favorite indicators)
      const awaySection = awayTeamBaseName;
      const awayPlainText = awayTeamBaseName;

      // Pad to fixed width
      const awayPadding = Math.max(0, awayTeamWidth - awayPlainText.length);
      gameLine += awaySection + ' '.repeat(awayPadding);
      plainTextLength += awayTeamWidth;

      // Away score
      gameLine += '  '; // spacing before score
      plainTextLength += 2;

      const awayScoreDisplay = awayScore || '';
      if (awayScoreDisplay) {
        const awayScorePadded = awayScoreDisplay.toString().padStart(scoreWidth);
        if (awayWinning) {
          gameLine += `{green-fg}{bold}${awayScorePadded}{/bold}{/green-fg}`;
        } else if (homeWinning) {
          gameLine += `{gray-fg}${awayScorePadded}{/gray-fg}`;
        } else {
          gameLine += awayScorePadded;
        }
        plainTextLength += scoreWidth;
      } else {
        gameLine += ' '.repeat(scoreWidth);
        plainTextLength += scoreWidth;
      }

      // @ symbol
      gameLine += '  {cyan-fg}@{/cyan-fg}  ';
      plainTextLength += 5; // 2 spaces + @ + 2 spaces

      // Home score
      const homeScoreDisplay = homeScore || '';
      if (homeScoreDisplay) {
        const homeScorePadded = homeScoreDisplay.toString().padStart(scoreWidth);
        if (homeWinning) {
          gameLine += `{green-fg}{bold}${homeScorePadded}{/bold}{/green-fg}`;
        } else if (awayWinning) {
          gameLine += `{gray-fg}${homeScorePadded}{/gray-fg}`;
        } else {
          gameLine += homeScorePadded;
        }
        plainTextLength += scoreWidth;
      } else {
        gameLine += ' '.repeat(scoreWidth);
        plainTextLength += scoreWidth;
      }

      gameLine += '  '; // spacing after score
      plainTextLength += 2;

      // Home team section (no favorite indicators)
      const homeSection = homeTeamBaseName;
      const homePlainText = homeTeamBaseName;

      gameLine += homeSection;
      plainTextLength += homePlainText.length;

      // Calculate padding before time
      const paddingNeeded = Math.max(1, timeColumnStart - plainTextLength);
      gameLine += ' '.repeat(paddingNeeded);

      // Time portion (right-aligned at fixed position with consistent width)
      const timeWidth = 10; // Fixed width for time display
      if (isLive) {
        const paddedTime = gameTime.padStart(timeWidth);
        gameLine += `{black-bg}{green-fg}{bold}${paddedTime}{/bold}{/green-fg}{/black-bg}`;
      } else if (isFinal) {
        const paddedTime = gameTime.padStart(timeWidth);
        gameLine += `{yellow-fg}${paddedTime}{/yellow-fg}`;
      } else {
        const paddedTime = gameTime.padStart(timeWidth);
        gameLine += `{cyan-fg}${paddedTime}{/cyan-fg}`;
      }

      return {
        index,
        content: gameLine,
        statusColor: getGameStatusColor(game)
      };
    });
  }, [games, formatTeamScore, formatGameTime, getGameStatusColor]);
  
  // Memoized content generation
  const content = useMemo(() => {
    // Build content for games list
    let content = '';

    // ASCII Art Header - always visible
    content += '{cyan-fg}';
    content += '  ███╗   ██╗██████╗  █████╗    ████████╗██╗██████╗  ██████╗ ███████╗███████╗\n';
    content += '  ████╗  ██║██╔══██╗██╔══██╗   ╚══██╔══╝██║██╔══██╗██╔═══██╗██╔════╝██╔════╝\n';
    content += '  ██╔██╗ ██║██████╔╝███████║      ██║   ██║██████╔╝██║   ██║█████╗  █████╗  \n';
    content += '  ██║╚██╗██║██╔══██╗██╔══██║      ██║   ██║██╔═══╝ ██║   ██║██╔══╝  ██╔══╝  \n';
    content += '  ██║ ╚████║██████╔╝██║  ██║      ██║   ██║██║     ╚██████╔╝██║     ██║     \n';
    content += '  ╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═       ╚═╝   ╚═╝╚═╝      ╚═════╝ ╚═╝     ╚═╝     \n';
    content += '{/cyan-fg}\n';

    // Header with date and box drawing - always visible
    const dateHeaderText = isToday ? `Today - ${formattedDate}` : formattedDate;
    const dateHeaderWithTags = `{bold}{cyan-fg}${dateHeaderText}{/cyan-fg}{/bold}`;
    const headerWidth = 75;
    content += '┌' + '─'.repeat(headerWidth) + '┐\n';
    content += '│ ' + dateHeaderWithTags.padEnd(headerWidth - 1 + dateHeaderWithTags.length - dateHeaderText.length) + '│\n';
    content += '└' + '─'.repeat(headerWidth) + '┘\n\n';

    // Handle different states
    if (error && games.length === 0) {
      content += `{red-fg}Error loading games: ${error}{/red-fg}\n\nPress 'r' to retry or 'n'/'p' to change date`;
      return content;
    }

    if (games.length === 0 && !isLoading) {
      content += `{gray-fg}No games scheduled for ${formattedDate}{/gray-fg}\n\nPress 'n'/'p' to navigate dates or 't' for today`;
      return content;
    }

    // Games list
    gameItems.forEach((gameItem, idx) => {
      const prefix = gameItem.index === selectedIndex ? '{magenta-fg}▶{/magenta-fg} ' : '  ';
      content += `${prefix}${gameItem.content}\n`;

      // Add subtle separator between games (but not after last game)
      if (idx < gameItems.length - 1) {
        content += '  {gray-fg}' + '·'.repeat(70) + '{/gray-fg}\n';
      }
    });

    // Footer with navigation help
    content += '\n';
    content += '{gray-fg}' + '─'.repeat(75) + '{/gray-fg}\n';
    content += '{cyan-fg}Keys:{/cyan-fg} {bold}↑↓{/bold}/jk=Select  {bold}Enter{/bold}=View  {bold}n{/bold}/{bold}p{/bold}=Date  {bold}t{/bold}=Today  {bold}q{/bold}=Quit';

    return content;
  }, [isLoading, error, games.length, formattedDate, isToday, gameItems, selectedIndex]);
  
  // Memoized style based on current state
  const boxStyle = useMemo(() => {
    if (isLoading) {
      return { fg: DEFAULT_COLORS.info, bg: 'black' };
    } else if (error) {
      return { fg: DEFAULT_COLORS.error, bg: 'black' };
    } else if (games.length === 0) {
      return { fg: DEFAULT_COLORS.info, bg: 'black' };
    } else {
      return { fg: 'white', bg: 'black' };
    }
  }, [isLoading, error, games.length]);
  
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