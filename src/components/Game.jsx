const React = require('react');
const { useSelector, useDispatch } = require('react-redux');
const { useEffect, useCallback, useMemo } = React;

// Import Redux actions and selectors
const {
  fetchGameDetail,
  pollGameUpdates,
  startPolling,
  stopPolling,
  selectSelectedGameId,
  selectSelectedGame,
  selectIsLoading,
  selectError
} = require('../store/gamesSlice');

const {
  selectPollingIntervalForGame
} = require('../store/configSlice');

// Import screen manager for key handling
const screenManager = require('../screen');

/**
 * Game view container component for detailed game display
 * Manages polling lifecycle, data fetching, and view switching
 */
const Game = React.memo(({ gameId, onBackToScoreboard }) => {
  const dispatch = useDispatch();
  
  // Redux state
  const selectedGameId = useSelector(selectSelectedGameId);
  const selectedGame = useSelector(selectSelectedGame);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  
  // Get polling interval based on game status
  const currentGameStatus = selectedGame?.gameData?.status?.description || 'scheduled';
  const pollingInterval = useSelector(state => 
    selectPollingIntervalForGame(state, currentGameStatus.toLowerCase())
  );
  
  // Fetch game details when component mounts or gameId changes
  useEffect(() => {
    if (gameId && !selectedGame) {
      dispatch(fetchGameDetail(gameId));
    }
  }, [gameId, selectedGame, dispatch]);
  
  // Set up polling for live updates
  useEffect(() => {
    if (!selectedGame || !gameId) return;
    
    const gameStatus = selectedGame.gameData.status;
    
    // Only poll if game is not completed
    if (!gameStatus.completed) {
      // Start polling with appropriate interval
      dispatch(startPolling({ 
        gameId, 
        interval: pollingInterval 
      }));
      
      // Set up polling interval
      const pollInterval = setInterval(() => {
        dispatch(pollGameUpdates(gameId));
      }, pollingInterval);
      
      console.log(`Started polling for game ${gameId} every ${pollingInterval}ms`);
      
      // Cleanup function
      return () => {
        clearInterval(pollInterval);
        dispatch(stopPolling(gameId));
        console.log(`Stopped polling for game ${gameId}`);
      };
    }
  }, [selectedGame, gameId, pollingInterval, dispatch]);
  
  // Handle keyboard navigation for game view
  useEffect(() => {
    const screen = screenManager.getScreen();
    if (!screen) return;
    
    const handleGameKeys = (ch, key) => {
      if (!key) return;
      
      switch (key.name) {
        case 'c':
        case 'escape':
          // Return to scoreboard
          if (onBackToScoreboard) {
            onBackToScoreboard();
          }
          break;
          
        case 'r':
          // Refresh game data
          if (gameId) {
            dispatch(fetchGameDetail(gameId));
          }
          break;
      }
    };
    
    // Register key handler
    screen.on('keypress', handleGameKeys);
    
    // Cleanup
    return () => {
      screen.removeListener('keypress', handleGameKeys);
    };
  }, [gameId, dispatch, onBackToScoreboard]);
  
  // Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      if (gameId) {
        dispatch(stopPolling(gameId));
      }
    };
  }, [gameId, dispatch]);
  
  // Memoized game status formatting
  const gameStatus = useMemo(() => {
    if (!selectedGame) return 'Loading...';
    
    const status = selectedGame.gameData.status;
    
    if (status.completed) {
      return 'FINAL';
    } else if (status.description === 'Scheduled') {
      const startTime = new Date(selectedGame.gameData.startTime);
      return `Scheduled - ${startTime.toLocaleTimeString()}`;
    } else {
      // Live game
      const period = status.period || 1;
      const clock = status.displayClock || status.clock || '';
      return `${period}Q ${clock}`;
    }
  }, [selectedGame]);
  
  // Memoized team info formatting
  const teamInfo = useMemo(() => {
    if (!selectedGame || !selectedGame.gameData.teams) {
      return { away: 'Unknown Team', home: 'Unknown Team' };
    }
    
    const awayTeam = selectedGame.gameData.teams[1]; // Away team
    const homeTeam = selectedGame.gameData.teams[0]; // Home team
    
    const formatTeam = (team, isHome = false) => {
      if (!team) return 'Unknown Team';
      
      const name = team.displayName || team.name || 'Unknown';
      const score = team.score !== undefined ? team.score : 0;
      const record = team.record ? ` (${team.record})` : '';
      
      return `${name}${record}: ${score}`;
    };
    
    return {
      away: formatTeam(awayTeam),
      home: formatTeam(homeTeam, true)
    };
  }, [selectedGame]);
  
  // Memoized content generation
  const content = useMemo(() => {
    if (isLoading && !selectedGame) {
      return 'Loading game details...';
    }

    if (error && !selectedGame) {
      return `Error loading game: ${error}\n\nPress 'r' to retry or 'c' to return to scoreboard`;
    }

    if (!selectedGame) {
      return 'No game selected\n\nPress \'c\' to return to scoreboard';
    }

    // Build game content with better formatting
    const lines = [];

    // Title bar
    lines.push('┌─────────────────────────────────────────────────────────────────────────┐');

    // Game matchup - more compact
    const awayTeam = selectedGame.gameData.teams[1]; // Away team
    const homeTeam = selectedGame.gameData.teams[0]; // Home team

    const awayLine = `${awayTeam.name} (${awayTeam.abbreviation})`.padEnd(45);
    const homeLine = `${homeTeam.name} (${homeTeam.abbreviation})`.padEnd(45);

    lines.push(`│ {bold}${awayLine}{/bold} {yellow-fg}${String(awayTeam.score).padStart(3)}{/yellow-fg} │`);
    lines.push(`│ {bold}${homeLine}{/bold} {yellow-fg}${String(homeTeam.score).padStart(3)}{/yellow-fg} │`);
    lines.push('├─────────────────────────────────────────────────────────────────────────┤');

    // Game status and info - compact
    const statusLine = `Status: ${gameStatus}`.padEnd(50);
    lines.push(`│ ${statusLine}│`);
    if (selectedGame.gameData.venue && selectedGame.gameData.venue !== 'Unknown Venue') {
      const venueLine = `Venue: ${selectedGame.gameData.venue}`.padEnd(50).substring(0, 50);
      lines.push(`│ ${venueLine}│`);
    }
    lines.push('└─────────────────────────────────────────────────────────────────────────┘');
    lines.push('');

    // Live data section
    if (selectedGame.liveData) {
      // Current play
      if (selectedGame.liveData.currentPlay) {
        lines.push('{bold}{green-fg}▸ CURRENT PLAY{/green-fg}{/bold}');
        lines.push(`  ${selectedGame.liveData.currentPlay.description}`);
        lines.push('');
      }

      // Box score - show only key stats in a compact format
      if (selectedGame.liveData.boxscore && selectedGame.liveData.boxscore.length > 0) {
        lines.push('{bold}{cyan-fg}▸ TEAM STATISTICS{/cyan-fg}{/bold}');

        // Create a side-by-side comparison
        const statsToShow = [
          { key: 'fieldGoalPct', label: 'FG%', format: v => v },
          { key: 'threePointPct', label: '3P%', format: v => v },
          { key: 'freeThrowPct', label: 'FT%', format: v => v },
          { key: 'rebounds', label: 'REB', format: v => v },
          { key: 'assists', label: 'AST', format: v => v },
          { key: 'turnovers', label: 'TO', format: v => v },
          { key: 'steals', label: 'STL', format: v => v },
          { key: 'blocks', label: 'BLK', format: v => v }
        ];

        // Get stats for both teams
        const awayStats = selectedGame.liveData.boxscore.find(ts =>
          ts.teamId === awayTeam.id
        );
        const homeStats = selectedGame.liveData.boxscore.find(ts =>
          ts.teamId === homeTeam.id
        );

        if (awayStats && homeStats) {
          // Header
          lines.push(`  ${''.padEnd(15)} ${awayTeam.abbreviation.padEnd(8)} ${homeTeam.abbreviation.padEnd(8)}`);
          lines.push(`  ${'-'.repeat(35)}`);

          // Show each stat
          statsToShow.forEach(({ key, label }) => {
            const awayStat = awayStats.statistics?.find(s => s.name === key || s.abbreviation === key);
            const homeStat = homeStats.statistics?.find(s => s.name === key || s.abbreviation === key);

            if (awayStat || homeStat) {
              const awayVal = (awayStat?.displayValue || 'N/A').padEnd(8);
              const homeVal = (homeStat?.displayValue || 'N/A').padEnd(8);
              lines.push(`  ${label.padEnd(15)} ${awayVal} ${homeVal}`);
            }
          });
        }
        lines.push('');
      }

      // Recent plays preview - more compact
      if (selectedGame.liveData.plays && selectedGame.liveData.plays.length > 0) {
        lines.push('{bold}{magenta-fg}▸ RECENT PLAYS{/magenta-fg}{/bold}');
        const recentPlays = selectedGame.liveData.plays.slice(0, 8);
        recentPlays.forEach(play => {
          const quarter = play.period ? `Q${play.period}` : '   ';
          const clock = (play.clock || '').padEnd(5);
          const desc = play.description.length > 60 ? play.description.substring(0, 57) + '...' : play.description;
          lines.push(`  ${quarter} ${clock} ${desc}`);
        });
        lines.push('');
      }
    }

    // Footer
    lines.push('{dim}─────────────────────────────────────────────────────────────────────────{/dim}');
    lines.push('{cyan-fg}Keys:{/cyan-fg} {bold}c{/bold}=Scoreboard {bold}r{/bold}=Refresh {bold}↑↓{/bold}=Scroll {bold}q{/bold}=Quit');

    return lines.join('\n');
  }, [isLoading, error, selectedGame, teamInfo, gameStatus]);
  
  // Memoized style based on state
  const boxStyle = useMemo(() => {
    if (isLoading && !selectedGame) {
      return { fg: 'blue', bg: 'black' };
    } else if (error && !selectedGame) {
      return { fg: 'red', bg: 'black' };
    } else if (!selectedGame) {
      return { fg: 'yellow', bg: 'black' };
    } else {
      return { fg: 'white', bg: 'black' };
    }
  }, [isLoading, error, selectedGame]);
  
  return React.createElement('box', {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    content,
    tags: true,
    scrollable: !!selectedGame,
    alwaysScroll: !!selectedGame,
    scrollbar: selectedGame ? {
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

module.exports = Game;