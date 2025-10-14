const React = require('react');
const { useMemo } = React;

// Hardcoded default colors (no longer configurable)
const DEFAULT_COLORS = {
  error: 'red',
  info: 'blue'
};

/**
 * LiveGame component for displaying active game information
 * Shows quarter/time, team scores, statistics, and possession indicator
 */
const LiveGame = React.memo(({ gameData, liveData }) => {
  
  // Memoized game status formatting
  const gameStatus = useMemo(() => {
    if (!gameData || !gameData.status) return 'Unknown';
    
    const status = gameData.status;
    
    if (status.completed) {
      return 'FINAL';
    } else if (status.description === 'Scheduled') {
      return 'Scheduled';
    } else {
      // Live game
      const period = status.period || 1;
      const clock = status.displayClock || status.clock || '';
      const periodName = period <= 4 ? `${period}Q` : `OT${period - 4}`;
      return `${periodName} ${clock}`;
    }
  }, [gameData]);
  
  // Memoized team information
  const teamInfo = useMemo(() => {
    if (!gameData || !gameData.teams || gameData.teams.length < 2) {
      return { away: null, home: null };
    }
    
    return {
      away: gameData.teams[1], // Away team
      home: gameData.teams[0]  // Home team
    };
  }, [gameData]);
  
  // Memoized team statistics
  const teamStats = useMemo(() => {
    if (!liveData || !liveData.boxscore) {
      return { away: null, home: null };
    }
    
    const boxscore = liveData.boxscore;
    
    return {
      away: boxscore.teams?.[1] || null,
      home: boxscore.teams?.[0] || null
    };
  }, [liveData]);
  
  // Determine current possession
  const currentPossession = useMemo(() => {
    if (!liveData || !liveData.currentPlay) return null;
    
    const currentPlay = liveData.currentPlay;
    return currentPlay.team || null;
  }, [liveData]);
  
  // Format percentage statistics
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };
  
  // Format team statistics for display
  const formatTeamStats = (stats) => {
    if (!stats) return 'No stats available';
    
    return {
      fieldGoals: `${stats.fieldGoalsMade || 0}/${stats.fieldGoalsAttempted || 0}`,
      fieldGoalPct: formatPercentage(stats.fieldGoalPercentage),
      threePointers: `${stats.threePointsMade || 0}/${stats.threePointsAttempted || 0}`,
      threePointPct: formatPercentage(stats.threePointPercentage),
      freeThrows: `${stats.freeThrowsMade || 0}/${stats.freeThrowsAttempted || 0}`,
      freeThrowPct: formatPercentage(stats.freeThrowPercentage),
      rebounds: stats.rebounds || 0,
      assists: stats.assists || 0,
      turnovers: stats.turnovers || 0,
      steals: stats.steals || 0,
      blocks: stats.blocks || 0
    };
  };
  
  // Render team score with possession indicator
  const renderTeamScore = (team, isHome, hasPossession) => {
    if (!team) return 'Unknown Team: 0';
    
    const name = team.displayName || team.name || 'Unknown';
    const score = team.score !== undefined ? team.score : 0;
    const possessionIndicator = hasPossession ? ' ●' : '';
    
    return `${name}: ${score}${possessionIndicator}`;
  };
  
  // Render team statistics section
  const renderTeamStatsSection = (team, stats, label) => {
    if (!team || !stats) return `${label}: No data`;
    
    const formattedStats = formatTeamStats(stats);
    
    return [
      `${label} (${team.displayName || team.name})`,
      `FG: ${formattedStats.fieldGoals} (${formattedStats.fieldGoalPct})`,
      `3P: ${formattedStats.threePointers} (${formattedStats.threePointPct})`,
      `FT: ${formattedStats.freeThrows} (${formattedStats.freeThrowPct})`,
      `REB: ${formattedStats.rebounds}  AST: ${formattedStats.assists}  TO: ${formattedStats.turnovers}`,
      `STL: ${formattedStats.steals}  BLK: ${formattedStats.blocks}`
    ].join('\n');
  };
  
  // Memoized content generation
  const content = useMemo(() => {
    // Handle missing data
    if (!gameData) {
      return 'No game data available';
    }
    
    // Build content
    let content = '';
    
    // Game header with status
    content += `${gameStatus}\n`;
    content += '='.repeat(gameStatus.length) + '\n\n';
    
    // Team scores with possession indicators
    const awayHasPossession = currentPossession && teamInfo.away && 
      currentPossession.id === teamInfo.away.id;
    const homeHasPossession = currentPossession && teamInfo.home && 
      currentPossession.id === teamInfo.home.id;
    
    content += `${renderTeamScore(teamInfo.away, false, awayHasPossession)}\n`;
    content += `${renderTeamScore(teamInfo.home, true, homeHasPossession)}\n\n`;
    
    // Venue information
    if (gameData.venue && gameData.venue.name) {
      content += `Venue: ${gameData.venue.name}\n\n`;
    }
    
    // Team statistics (if available)
    if (teamStats.away || teamStats.home) {
      content += 'TEAM STATISTICS\n';
      content += '===============\n\n';
      
      if (teamStats.away) {
        content += renderTeamStatsSection(teamInfo.away, teamStats.away, 'Away Team');
        content += '\n\n';
      }
      
      if (teamStats.home) {
        content += renderTeamStatsSection(teamInfo.home, teamStats.home, 'Home Team');
        content += '\n\n';
      }
    }
    
    // Current play information
    if (liveData && liveData.currentPlay) {
      content += 'CURRENT PLAY\n';
      content += '============\n';
      content += `${liveData.currentPlay.description}\n\n`;
    }
    
    // Game status specific information
    if (gameData.status) {
      if (gameData.status.completed) {
        content += 'Game completed\n';
      } else if (gameData.status.description === 'Halftime') {
        content += 'Halftime\n';
      } else if (gameData.status.description === 'Timeout') {
        content += 'Timeout\n';
      }
    }
    
    return content;
  }, [gameData, gameStatus, teamInfo, currentPossession, teamStats, liveData]);
  
  // Memoized style
  const boxStyle = useMemo(() => {
    if (!gameData) {
      return { fg: DEFAULT_COLORS.error, bg: 'black' };
    }
    return { fg: 'white', bg: 'black' };
  }, [gameData]);
  
  return React.createElement('box', {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    content,
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'gray'
      },
      style: {
        inverse: true
      }
    },
    style: boxStyle,
    border: {
      type: 'line'
    }
  });
});

module.exports = LiveGame;