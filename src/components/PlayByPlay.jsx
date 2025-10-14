const React = require('react');
const { useState, useEffect, useMemo, useCallback } = React;

// Import screen manager for key handling
const screenManager = require('../screen');

// Hardcoded default colors (no longer configurable)
const DEFAULT_COLORS = {
  liveGame: 'green',
  error: 'red',
  info: 'blue',
  teamName: 'cyan'
};

/**
 * PlayByPlay component for displaying scrollable game events
 * Handles play formatting, keyboard scrolling, and event display
 */
const PlayByPlay = React.memo(({ plays = [], currentPlay = null }) => {
  
  // Local state for scrolling
  const [scrollPosition, setScrollPosition] = useState(0);
  const [visibleLines, setVisibleLines] = useState(20); // Default visible lines
  
  // Memoized formatted plays
  const formattedPlays = useMemo(() => {
    if (!plays || plays.length === 0) return [];
    
    return plays.map((play, index) => {
      const period = play.period || 1;
      const clock = play.clock || '';
      const description = play.description || 'Unknown play';
      const team = play.team ? play.team.abbreviation || play.team.name : '';
      const players = play.players ? play.players.map(p => p.name).join(', ') : '';
      
      // Format period display
      const periodDisplay = period <= 4 ? `${period}Q` : `OT${period - 4}`;
      
      // Build play line
      let playLine = `${periodDisplay} ${clock.padEnd(8)} `;
      
      if (team) {
        playLine += `${team.padEnd(4)} `;
      }
      
      playLine += description;
      
      if (players) {
        playLine += ` (${players})`;
      }
      
      return {
        id: play.id || index,
        line: playLine,
        period: play.period,
        clock: play.clock,
        team: play.team,
        type: play.type,
        isCurrentPlay: currentPlay && play.id === currentPlay.id
      };
    });
  }, [plays, currentPlay]);
  
  // Handle keyboard scrolling
  useEffect(() => {
    const screen = screenManager.getScreen();
    if (!screen) return;
    
    const handlePlayByPlayKeys = (ch, key) => {
      if (!key) return;
      
      switch (key.name) {
        case 'up':
        case 'k':
          // Scroll up
          setScrollPosition(prev => Math.max(0, prev - 1));
          break;
          
        case 'down':
        case 'j':
          // Scroll down
          setScrollPosition(prev => 
            Math.min(Math.max(0, formattedPlays.length - visibleLines), prev + 1)
          );
          break;
          
        case 'pageup':
          // Page up
          setScrollPosition(prev => Math.max(0, prev - visibleLines));
          break;
          
        case 'pagedown':
          // Page down
          setScrollPosition(prev => 
            Math.min(Math.max(0, formattedPlays.length - visibleLines), prev + visibleLines)
          );
          break;
          
        case 'home':
          // Go to top
          setScrollPosition(0);
          break;
          
        case 'end':
          // Go to bottom
          setScrollPosition(Math.max(0, formattedPlays.length - visibleLines));
          break;
      }
    };
    
    // Register key handler
    screen.on('keypress', handlePlayByPlayKeys);
    
    // Cleanup
    return () => {
      screen.removeListener('keypress', handlePlayByPlayKeys);
    };
  }, [formattedPlays.length, visibleLines]);
  
  // Auto-scroll to current play when it changes
  useEffect(() => {
    if (currentPlay && formattedPlays.length > 0) {
      const currentPlayIndex = formattedPlays.findIndex(p => p.isCurrentPlay);
      if (currentPlayIndex >= 0) {
        // Scroll to show current play in the middle of the visible area
        const targetPosition = Math.max(0, currentPlayIndex - Math.floor(visibleLines / 2));
        setScrollPosition(Math.min(targetPosition, Math.max(0, formattedPlays.length - visibleLines)));
      }
    }
  }, [currentPlay, formattedPlays, visibleLines]);
  
  // Get visible plays based on scroll position (optimized for large lists)
  const visiblePlays = useMemo(() => {
    const startIndex = Math.max(0, scrollPosition);
    const endIndex = Math.min(formattedPlays.length, scrollPosition + visibleLines);
    return formattedPlays.slice(startIndex, endIndex);
  }, [formattedPlays, scrollPosition, visibleLines]);
  
  // Format play type for styling
  const getPlayTypeStyle = useCallback((playType) => {
    switch (playType) {
      case 'shot-made':
        return { fg: DEFAULT_COLORS.liveGame };
      case 'shot-missed':
        return { fg: DEFAULT_COLORS.error };
      case 'free-throw':
        return { fg: DEFAULT_COLORS.info };
      case 'rebound':
        return { fg: DEFAULT_COLORS.teamName };
      case 'turnover':
        return { fg: DEFAULT_COLORS.error };
      case 'foul':
        return { fg: 'yellow' };
      case 'timeout':
        return { fg: 'magenta' };
      case 'substitution':
        return { fg: 'gray' };
      default:
        return { fg: 'white' };
    }
  }, []);
  
  // Memoized content generation
  const content = useMemo(() => {
    // Handle empty plays
    if (!plays || plays.length === 0) {
      return 'No play-by-play data available\n\nPlays will appear here during live games';
    }
    
    // Build content for visible plays
    let content = '';
    
    // Header
    content += 'PLAY-BY-PLAY\n';
    content += '============\n\n';
    
    // Show scroll position indicator
    if (formattedPlays.length > visibleLines) {
      const totalPlays = formattedPlays.length;
      const startPlay = scrollPosition + 1;
      const endPlay = Math.min(scrollPosition + visibleLines, totalPlays);
      content += `Showing ${startPlay}-${endPlay} of ${totalPlays} plays\n\n`;
    }
    
    // Render visible plays
    visiblePlays.forEach((play, index) => {
      const prefix = play.isCurrentPlay ? '► ' : '  ';
      content += `${prefix}${play.line}\n`;
    });
    
    // Footer with navigation help
    if (formattedPlays.length > visibleLines) {
      content += '\n';
      content += 'Navigation: ↑↓/jk=Scroll  PgUp/PgDn=Page  Home/End=Top/Bottom';
    }
    
    return content;
  }, [plays.length, formattedPlays.length, visibleLines, scrollPosition, visiblePlays]);
  
  // Memoized style
  const boxStyle = useMemo(() => {
    if (!plays || plays.length === 0) {
      return { fg: DEFAULT_COLORS.info, bg: 'black' };
    }
    return { fg: 'white', bg: 'black' };
  }, [plays?.length]);
  
  return React.createElement('box', {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    content,
    tags: true,
    scrollable: false, // We handle scrolling manually
    style: boxStyle,
    border: {
      type: 'line'
    }
  });
});

module.exports = PlayByPlay;