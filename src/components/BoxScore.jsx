const React = require('react');
const { useSelector } = require('react-redux');
const { useMemo } = React;

// Import Redux selectors
const { selectColors } = require('../store/configSlice');

/**
 * BoxScore component for displaying team statistics comparison
 * Shows formatted statistics with visual indicators for performance
 */
const BoxScore = React.memo(({ teamStats = [] }) => {
  // Redux state
  const colors = useSelector(selectColors);
  
  // Memoized team statistics processing
  const processedStats = useMemo(() => {
    if (!teamStats || teamStats.length < 2) {
      return { away: null, home: null };
    }
    
    const away = teamStats[1] || null; // Away team
    const home = teamStats[0] || null; // Home team
    
    return { away, home };
  }, [teamStats]);
  
  // Format percentage with visual indicator
  const formatPercentage = (value, compareValue = null) => {
    if (value === undefined || value === null) return 'N/A';
    
    const percentage = (value * 100).toFixed(1);
    let indicator = '';
    
    // Add visual indicator if comparing values
    if (compareValue !== null && compareValue !== undefined) {
      if (value > compareValue) {
        indicator = ' ↑'; // Better performance
      } else if (value < compareValue) {
        indicator = ' ↓'; // Worse performance
      } else {
        indicator = ' ='; // Equal performance
      }
    }
    
    return `${percentage}%${indicator}`;
  };
  
  // Format counting stat with comparison
  const formatCountingStat = (value, compareValue = null) => {
    if (value === undefined || value === null) return '0';
    
    let indicator = '';
    
    // Add visual indicator if comparing values
    if (compareValue !== null && compareValue !== undefined) {
      if (value > compareValue) {
        indicator = ' ↑';
      } else if (value < compareValue) {
        indicator = ' ↓';
      } else {
        indicator = ' =';
      }
    }
    
    return `${value}${indicator}`;
  };
  
  // Format shooting stats (made/attempted)
  const formatShootingStats = (made, attempted, percentage, compareMade = null, compareAttempted = null, comparePercentage = null) => {
    const madeStr = made !== undefined ? made : 0;
    const attemptedStr = attempted !== undefined ? attempted : 0;
    const pctStr = formatPercentage(percentage, comparePercentage);
    
    return `${madeStr}/${attemptedStr} (${pctStr})`;
  };
  
  // Get stat categories for display
  const getStatCategories = () => {
    return [
      {
        label: 'Field Goals',
        key: 'fieldGoals',
        format: 'shooting'
      },
      {
        label: '3-Pointers',
        key: 'threePointers',
        format: 'shooting'
      },
      {
        label: 'Free Throws',
        key: 'freeThrows',
        format: 'shooting'
      },
      {
        label: 'Rebounds',
        key: 'rebounds',
        format: 'counting'
      },
      {
        label: 'Assists',
        key: 'assists',
        format: 'counting'
      },
      {
        label: 'Turnovers',
        key: 'turnovers',
        format: 'counting',
        lowerIsBetter: true
      },
      {
        label: 'Steals',
        key: 'steals',
        format: 'counting'
      },
      {
        label: 'Blocks',
        key: 'blocks',
        format: 'counting'
      },
      {
        label: 'Personal Fouls',
        key: 'fouls',
        format: 'counting',
        lowerIsBetter: true
      }
    ];
  };
  
  // Extract stat value based on category
  const getStatValue = (stats, category) => {
    if (!stats) return null;
    
    switch (category.key) {
      case 'fieldGoals':
        return {
          made: stats.fieldGoalsMade,
          attempted: stats.fieldGoalsAttempted,
          percentage: stats.fieldGoalPercentage
        };
      case 'threePointers':
        return {
          made: stats.threePointsMade,
          attempted: stats.threePointsAttempted,
          percentage: stats.threePointPercentage
        };
      case 'freeThrows':
        return {
          made: stats.freeThrowsMade,
          attempted: stats.freeThrowsAttempted,
          percentage: stats.freeThrowPercentage
        };
      case 'rebounds':
        return stats.rebounds;
      case 'assists':
        return stats.assists;
      case 'turnovers':
        return stats.turnovers;
      case 'steals':
        return stats.steals;
      case 'blocks':
        return stats.blocks;
      case 'fouls':
        return stats.fouls || stats.personalFouls;
      default:
        return null;
    }
  };
  
  // Format stat for display
  const formatStat = (category, awayValue, homeValue) => {
    if (category.format === 'shooting') {
      const awayFormatted = awayValue ? 
        formatShootingStats(
          awayValue.made, 
          awayValue.attempted, 
          awayValue.percentage,
          homeValue?.made,
          homeValue?.attempted,
          homeValue?.percentage
        ) : 'N/A';
        
      const homeFormatted = homeValue ? 
        formatShootingStats(
          homeValue.made, 
          homeValue.attempted, 
          homeValue.percentage,
          awayValue?.made,
          awayValue?.attempted,
          awayValue?.percentage
        ) : 'N/A';
        
      return { away: awayFormatted, home: homeFormatted };
    } else {
      // Counting stats
      const awayFormatted = formatCountingStat(awayValue, homeValue);
      const homeFormatted = formatCountingStat(homeValue, awayValue);
      
      return { away: awayFormatted, home: homeFormatted };
    }
  };
  
  // Memoized content generation
  const content = useMemo(() => {
    // Handle missing data
    if (!processedStats.away && !processedStats.home) {
      return 'No team statistics available\n\nStats will appear here during and after games';
    }
    
    // Build content
    let content = '';
    
    // Header
    content += 'TEAM STATISTICS\n';
    content += '===============\n\n';
    
    // Team names header
    const awayTeamName = processedStats.away?.team?.displayName || 'Away Team';
    const homeTeamName = processedStats.home?.team?.displayName || 'Home Team';
    
    content += `${awayTeamName.padEnd(25)} | ${homeTeamName}\n`;
    content += '-'.repeat(25) + ' | ' + '-'.repeat(25) + '\n\n';
    
    // Statistics table
    const categories = getStatCategories();
    
    categories.forEach(category => {
      const awayValue = getStatValue(processedStats.away, category);
      const homeValue = getStatValue(processedStats.home, category);
      const formatted = formatStat(category, awayValue, homeValue);
      
      const label = category.label.padEnd(15);
      const awayStr = formatted.away.padEnd(25);
      const homeStr = formatted.home;
      
      content += `${label}: ${awayStr} | ${homeStr}\n`;
    });
    
    // Additional team stats if available
    if (processedStats.away || processedStats.home) {
      content += '\n';
      content += 'ADDITIONAL STATS\n';
      content += '================\n\n';
      
      // Points in paint, fast break points, etc.
      const additionalStats = [
        { label: 'Points in Paint', key: 'pointsInPaint' },
        { label: 'Fast Break Points', key: 'fastBreakPoints' },
        { label: 'Points off Turnovers', key: 'pointsOffTurnovers' },
        { label: 'Second Chance Points', key: 'secondChancePoints' },
        { label: 'Bench Points', key: 'benchPoints' }
      ];
      
      additionalStats.forEach(stat => {
        const awayValue = processedStats.away?.[stat.key];
        const homeValue = processedStats.home?.[stat.key];
        
        if (awayValue !== undefined || homeValue !== undefined) {
          const awayStr = (awayValue || 0).toString().padEnd(25);
          const homeStr = (homeValue || 0).toString();
          
          content += `${stat.label.padEnd(15)}: ${awayStr} | ${homeStr}\n`;
        }
      });
    }
    
    // Legend
    content += '\n';
    content += 'Legend: ↑ = Better  ↓ = Worse  = = Equal\n';
    content += 'Note: Arrows compare team performance against opponent';
    
    return content;
  }, [processedStats]);
  
  // Memoized style
  const boxStyle = useMemo(() => {
    if (!processedStats.away && !processedStats.home) {
      return { fg: colors.info || 'blue', bg: 'black' };
    }
    return { fg: 'white', bg: 'black' };
  }, [processedStats.away, processedStats.home, colors]);
  
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

module.exports = BoxScore;