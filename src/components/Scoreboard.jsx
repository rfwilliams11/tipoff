const React = require('react');
const { useSelector, useDispatch } = require('react-redux');
const { useEffect, useCallback, useMemo } = React;

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

const { useKeyboardNavigation } = require('../hooks/useKeyboardNavigation');
const { DEFAULT_COLORS } = require('../constants/colors');
const GameItem = require('./scoreboard/GameItem.jsx');

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
  
  useKeyboardNavigation({
    up: () => dispatch(selectPreviousGame()),
    k: () => dispatch(selectPreviousGame()),
    down: () => dispatch(selectNextGame()),
    j: () => dispatch(selectNextGame()),
    home: () => {
      if (games.length > 0) {
        dispatch(selectGameByIndex(0));
      }
    },
    end: () => {
      if (games.length > 0) {
        dispatch(selectGameByIndex(games.length - 1));
      }
    },
    enter: () => {
      if (games.length > 0 && selectedIndex < games.length) {
        const selectedGame = games[selectedIndex];
        if (selectedGame && onGameSelect) {
          onGameSelect(selectedGame.id);
        }
      }
    }
  });
  
  // Reset selection when games change
  useEffect(() => {
    if (games.length > 0 && selectedIndex >= games.length) {
      dispatch(resetSelection());
    }
  }, [games.length, selectedIndex, dispatch]);
  
  
  const gameItems = useMemo(() => {
    return games.map((game, index) => ({
      index,
      game,
      isSelected: index === selectedIndex
    }));
  }, [games, selectedIndex]);
  
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
      content += GameItem(gameItem) + '\n';

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