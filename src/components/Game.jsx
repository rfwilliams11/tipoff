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

      // Cleanup function
      return () => {
        clearInterval(pollInterval);
        dispatch(stopPolling(gameId));
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

    // Game matchup
    const awayTeam = selectedGame.gameData.teams[1]; // Away team
    const homeTeam = selectedGame.gameData.teams[0]; // Home team

    // Format game date/time
    const gameDate = new Date(selectedGame.gameData.startTime);
    const dateStr = gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Title bar with date/time - using proper box drawing
    const contentWidth = 73;

    lines.push('┌' + '─'.repeat(contentWidth) + '┐');
    const metaText = `${dateStr} • ${timeStr}`;
    lines.push('│ ' + metaText.padEnd(contentWidth - 1) + '│');
    lines.push('├' + '─'.repeat(contentWidth) + '┤');

    // Team scores - build plain text first, then add formatting
    const awayTeamText = `${awayTeam.name} (${awayTeam.abbreviation})`;
    const homeTeamText = `${homeTeam.name} (${homeTeam.abbreviation})`;

    const awayScoreText = String(awayTeam.score);
    const homeScoreText = String(homeTeam.score);

    // Build the full line with spacing, then add tags
    const awayFullText = (awayTeamText + ' '.repeat(contentWidth - 1 - awayTeamText.length - awayScoreText.length) + awayScoreText);
    const homeFullText = (homeTeamText + ' '.repeat(contentWidth - 1 - homeTeamText.length - homeScoreText.length) + homeScoreText);

    // Now add formatting tags
    lines.push('│ ' + `{bold}${awayTeamText}{/bold}` + ' '.repeat(contentWidth - 1 - awayTeamText.length - awayScoreText.length) + `{yellow-fg}${awayScoreText}{/yellow-fg}` + '│');
    lines.push('│ ' + `{bold}${homeTeamText}{/bold}` + ' '.repeat(contentWidth - 1 - homeTeamText.length - homeScoreText.length) + `{yellow-fg}${homeScoreText}{/yellow-fg}` + '│');

    lines.push('├' + '─'.repeat(contentWidth) + '┤');

    // Status indicator
    const status = selectedGame.gameData.status;
    const statusText = status.completed ? 'FINAL' :
                       status.description === 'Scheduled' ? 'UPCOMING' :
                       gameStatus;

    const statusIndicator = status.completed ? '{yellow-fg}FINAL{/yellow-fg}' :
                           status.description === 'Scheduled' ? '{cyan-fg}UPCOMING{/cyan-fg}' :
                           `{green-fg}${gameStatus}{/green-fg}`;

    lines.push('│ ' + statusIndicator.padEnd(contentWidth - 1 + statusIndicator.length - statusText.length) + '│');
    lines.push('└' + '─'.repeat(contentWidth) + '┘');
    lines.push('');

    // Live data section
    if (selectedGame.liveData) {
      // Current play
      if (selectedGame.liveData.currentPlay) {
        lines.push('{bold}{green-fg}▸ CURRENT PLAY{/green-fg}{/bold}');
        lines.push(`  ${selectedGame.liveData.currentPlay.description}`);
        lines.push('');
      }

      // Box score and Player Leaders side-by-side (only show if game is not upcoming)
      const isUpcoming = status.description === 'Scheduled';
      const hasBoxscore = selectedGame.liveData.boxscore && selectedGame.liveData.boxscore.length > 0 && !isUpcoming;
      const hasLeaders = selectedGame.liveData.leaders && selectedGame.liveData.leaders.length > 0 && !isUpcoming;

      if (hasBoxscore || hasLeaders) {
        // Two column layout: Team Stats | Stat Leaders
        const leftColumn = [];
        const rightColumn = [];

        // Build Team Statistics column
        if (hasBoxscore) {
          leftColumn.push('{bold}{cyan-fg}▸ BOX SCORE{/cyan-fg}{/bold}');

          const statsToShow = [
            { key: 'fieldGoalPct', label: 'FG%' },
            { key: 'threePointFieldGoalPct', label: '3P%' },
            { key: 'freeThrowPct', label: 'FT%' },
            { key: 'totalRebounds', label: 'REB' },
            { key: 'assists', label: 'AST' },
            { key: 'turnovers', label: 'TO' },
            { key: 'steals', label: 'STL' },
            { key: 'blocks', label: 'BLK' }
          ];

          const awayStats = selectedGame.liveData.boxscore.find(ts => ts.teamId === awayTeam.id);
          const homeStats = selectedGame.liveData.boxscore.find(ts => ts.teamId === homeTeam.id);

          if (awayStats && homeStats) {
            leftColumn.push(`${''.padEnd(15)} ${awayTeam.abbreviation.padEnd(8)} ${homeTeam.abbreviation.padEnd(8)}`);
            leftColumn.push(`${'-'.repeat(35)}`);

            statsToShow.forEach(({ key, label }) => {
              const awayStat = awayStats.statistics?.find(s => s.name === key || s.abbreviation === key);
              const homeStat = homeStats.statistics?.find(s => s.name === key || s.abbreviation === key);

              if (awayStat || homeStat) {
                const awayVal = (awayStat?.displayValue || 'N/A').padEnd(8);
                const homeVal = (homeStat?.displayValue || 'N/A').padEnd(8);
                leftColumn.push(`${label.padEnd(15)} ${awayVal} ${homeVal}`);
              }
            });
          }
        }

        // Build Stat Leaders column
        if (hasLeaders) {
          rightColumn.push('');

          const awayLeaders = selectedGame.liveData.leaders.find(tl => tl.teamId === awayTeam.id);
          const homeLeaders = selectedGame.liveData.leaders.find(tl => tl.teamId === homeTeam.id);

          const leaderStats = ['points', 'rebounds', 'assists'];

          leaderStats.forEach(statName => {
            const awayLeader = awayLeaders?.leaders?.find(l => l.name === statName);
            const homeLeader = homeLeaders?.leaders?.find(l => l.name === statName);

            if (awayLeader?.leaders?.[0] || homeLeader?.leaders?.[0]) {
              const statLabel = awayLeader?.displayName || homeLeader?.displayName || statName.toUpperCase();
              rightColumn.push(`{bold}${statLabel}{/bold}`);

              if (awayLeader?.leaders?.[0]) {
                const leader = awayLeader.leaders[0];
                const name = leader.athlete.shortName || leader.athlete.displayName;
                const teamLabel = `${awayTeam.abbreviation}:`;
                rightColumn.push(`  ${teamLabel.padEnd(6)} ${name.padEnd(18)}${leader.displayValue.padStart(3)}`);
              } else {
                rightColumn.push('');
              }

              if (homeLeader?.leaders?.[0]) {
                const leader = homeLeader.leaders[0];
                const name = leader.athlete.shortName || leader.athlete.displayName;
                const teamLabel = `${homeTeam.abbreviation}:`;
                rightColumn.push(`  ${teamLabel.padEnd(6)} ${name.padEnd(18)}${leader.displayValue.padStart(3)}`);
              } else {
                rightColumn.push('');
              }
            }
          });
        }

        // Combine columns side by side
        const maxLines = Math.max(leftColumn.length, rightColumn.length);
        for (let i = 0; i < maxLines; i++) {
          const left = (leftColumn[i] || '').padEnd(45);
          const right = rightColumn[i] || '';
          lines.push(`  ${left}${right}`);
        }
        lines.push('');
      }

      // Recent plays - full play-by-play log with color coding (only show if game is not final)
      if (selectedGame.liveData.plays && selectedGame.liveData.plays.length > 0 && !status.completed) {
        lines.push('{bold}{magenta-fg}▸ RECENT PLAYS{/magenta-fg}{/bold}');
        lines.push('');

        // ESPN API returns plays in chronological order (oldest first)
        // Filter out defensive rebounds first
        const filteredPlays = selectedGame.liveData.plays.filter(play => {
          const playType = (play.type || '').toLowerCase();
          const desc = (play.description || '').toLowerCase();

          // Skip defensive rebounds
          if (playType.includes('rebound') && desc.includes('defensive')) {
            return false;
          }

          return true;
        });

        // Get the last 20 plays (most recent) and reverse to show newest first
        const recentPlays = filteredPlays.slice(-20).reverse();

        recentPlays.forEach(play => {
          // Format period and clock - use the displayValue from API
          const periodStr = play.periodDisplay || (play.period ? `${play.period}Q` : '   ');
          const clockStr = (play.clock || '').padEnd(5);

          // Determine play type color based on type
          let typeColor = 'white-fg';
          let typeText = '';

          const playType = (play.type || '').toLowerCase();
          const desc = (play.description || '').toLowerCase();

          if (play.scoringPlay) {
            // Scoring plays - use cyan
            typeColor = 'cyan-fg';
            if (playType.includes('3pt') || playType.includes('three point') || desc.includes('three point')) {
              typeText = '[3PT]';
            } else if (playType.includes('free throw')) {
              typeText = '[FT]';
            } else if (desc.includes('dunk')) {
              typeText = '[Dunk]';
            } else if (desc.includes('layup')) {
              typeText = '[Layup]';
            } else {
              typeText = '[FG]';
            }
          } else if (playType.includes('rebound')) {
            // Only offensive rebounds at this point (defensive filtered out)
            typeColor = 'yellow-fg';
            typeText = '[Rebound]';
          } else if (playType.includes('steal')) {
            typeColor = 'magenta-fg';
            typeText = '[Steal]';
          } else if (playType.includes('block')) {
            typeColor = 'red-fg';
            typeText = '[Block]';
          } else if (playType.includes('turnover')) {
            typeColor = 'red-fg';
            typeText = '[TO]';
          } else if (playType.includes('timeout')) {
            typeColor = 'gray-fg';
            typeText = '[Timeout]';
          } else if (playType.includes('substitution') || playType.includes('sub ')) {
            typeColor = 'gray-fg';
            typeText = '[Sub]';
          } else if (playType.includes('jumpball') || playType.includes('jump ball')) {
            typeColor = 'blue-fg';
            typeText = '[Jumpball]';
          } else if (playType.includes('miss')) {
            typeColor = 'gray-fg';
            typeText = '[Miss]';
          }

          // Build the play line
          const prefix = `[${periodStr}] ${clockStr}`;
          const typeTag = typeText ? `{${typeColor}}${typeText.padEnd(12)}{/${typeColor}}` : ''.padEnd(12);

          // Description - allow longer text, truncate only if extremely long
          let descText = play.description || '';
          const maxDescLength = 100;
          if (descText.length > maxDescLength) {
            descText = descText.substring(0, maxDescLength - 3) + '...';
          }

          // Add score if it's a scoring play - highlight with cyan
          let scoreStr = '';
          if (play.scoringPlay && (play.awayScore !== undefined || play.homeScore !== undefined)) {
            scoreStr = ` {cyan-fg}{bold}${play.awayScore}-${play.homeScore}{/bold}{/cyan-fg}`;
          }

          lines.push(`  ${prefix} ${typeTag} ${descText}${scoreStr}`);
        });
        lines.push('');
      }
    }

    // Footer
    lines.push(`${'-'.repeat(80)}`);
    lines.push('{cyan-fg}Keys:{/cyan-fg} {bold}c{/bold}=Scoreboard {bold}↑↓{/bold}=Scroll {bold}q{/bold}=Quit');

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