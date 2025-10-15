const { useEffect } = require('react');
const screenManager = require('../screen');

const useKeyboardNavigation = (handlers) => {
  useEffect(() => {
    const screen = screenManager.getScreen();
    if (!screen) return;

    const handleKeys = (ch, key) => {
      if (!key) return;

      const handler = handlers[key.name];
      if (handler) {
        handler(key);
      }
    };

    screen.on('keypress', handleKeys);

    return () => {
      screen.removeListener('keypress', handleKeys);
    };
  }, [handlers]);
};

module.exports = { useKeyboardNavigation };
