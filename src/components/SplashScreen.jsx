const React = require('react');
const { useEffect, useState, useCallback } = React;

/**
 * SplashScreen component for displaying an animated intro
 * Shows "NBA TIPOFF" ASCII art with letter-by-letter animation
 */
const SplashScreen = ({ onComplete }) => {
  const [visibleChars, setVisibleChars] = useState(0);
  const [skipped, setSkipped] = useState(false);

  // ASCII art lines for "NBA TIPOFF"
  const artLines = [
    '  ███╗   ██╗██████╗  █████╗     ████████╗██╗██████╗  ██████╗ ███████╗███████╗',
    '  ████╗  ██║██╔══██╗██╔══██╗    ╚══██╔══╝██║██╔══██╗██╔═══██╗██╔════╝██╔════╝',
    '  ██╔██╗ ██║██████╔╝███████║       ██║   ██║██████╔╝██║   ██║█████╗  █████╗  ',
    '  ██║╚██╗██║██╔══██╗██╔══██║       ██║   ██║██╔═══╝ ██║   ██║██╔══╝  ██╔══╝  ',
    '  ██║ ╚████║██████╔╝██║  ██║       ██║   ██║██║     ╚██████╔╝██║     ██║     ',
    '  ╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝       ╚═╝   ╚═╝╚═╝      ╚═════╝ ╚═╝     ╚═╝     '
  ];

  // Calculate total characters needed for full animation
  const maxLineLength = Math.max(...artLines.map(line => line.length));
  const totalChars = maxLineLength;

  // Handle animation progression
  useEffect(() => {
    if (skipped) return;

    if (visibleChars < totalChars) {
      const timer = setTimeout(() => {
        setVisibleChars(prev => prev + 1);
      }, 30); // 30ms per character for smooth animation

      return () => clearTimeout(timer);
    } else {
      // Animation complete - wait a moment then call onComplete
      const completeTimer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 500); // Brief pause at end

      return () => clearTimeout(completeTimer);
    }
  }, [visibleChars, totalChars, skipped, onComplete]);

  // Handle key press to skip animation
  useEffect(() => {
    const handleSkip = () => {
      if (!skipped) {
        setSkipped(true);
        if (onComplete) onComplete();
      }
    };

    // Set up key listener on screen
    const screenManager = require('../screen');
    const screen = screenManager.getScreen();

    if (screen) {
      screen.on('keypress', handleSkip);
      return () => {
        screen.removeListener('keypress', handleSkip);
      };
    }
  }, [skipped, onComplete]);

  // Build content with progressive reveal
  const buildContent = useCallback(() => {
    let content = '';

    content += '{cyan-fg}{bold}';

    artLines.forEach(line => {
      // Reveal characters up to visibleChars
      const revealedLine = line.substring(0, visibleChars);
      content += revealedLine + '\n';
    });

    content += '{/bold}{/cyan-fg}';

    return content;
  }, [visibleChars, totalChars, artLines]);

  const content = buildContent();

  return React.createElement('box', {
    top: 'center',
    left: 'center',
    width: '100%',
    height: '100%',
    content,
    tags: true,
    style: {
      fg: 'white',
      bg: 'black'
    }
  });
};

module.exports = SplashScreen;
