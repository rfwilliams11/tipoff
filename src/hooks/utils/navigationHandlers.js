const { calculateNewIndex, DIRECTIONS } = require('../../utils/navigation');

const createListNavigationHandler = (selectedIndex, itemsLength, options = {}) => {
  const { wrap = true, pageSize = 10, onSelectionChange } = options;

  return (direction) => {
    let newIndex = selectedIndex;

    switch (direction) {
      case DIRECTIONS.UP:
      case DIRECTIONS.DOWN:
      case DIRECTIONS.HOME:
      case DIRECTIONS.END:
      case DIRECTIONS.PAGE_UP:
      case DIRECTIONS.PAGE_DOWN:
        newIndex = calculateNewIndex(selectedIndex, itemsLength, direction, {
          wrap,
          pageSize
        });
        break;

      default:
        return false;
    }

    if (newIndex !== selectedIndex && onSelectionChange) {
      onSelectionChange(newIndex);
    }

    return true;
  };
};

const createScrollNavigationHandler = (scrollPosition, contentHeight, viewportHeight, options = {}) => {
  const { scrollStep = 1, onScrollChange } = options;

  return (direction) => {
    let newScrollPosition = scrollPosition;

    switch (direction) {
      case DIRECTIONS.UP:
        newScrollPosition = Math.max(0, scrollPosition - scrollStep);
        break;

      case DIRECTIONS.DOWN:
        newScrollPosition = Math.min(
          Math.max(0, contentHeight - viewportHeight),
          scrollPosition + scrollStep
        );
        break;

      case DIRECTIONS.PAGE_UP:
        newScrollPosition = Math.max(0, scrollPosition - viewportHeight);
        break;

      case DIRECTIONS.PAGE_DOWN:
        newScrollPosition = Math.min(
          Math.max(0, contentHeight - viewportHeight),
          scrollPosition + viewportHeight
        );
        break;

      case DIRECTIONS.HOME:
        newScrollPosition = 0;
        break;

      case DIRECTIONS.END:
        newScrollPosition = Math.max(0, contentHeight - viewportHeight);
        break;

      default:
        return false;
    }

    if (newScrollPosition !== scrollPosition && onScrollChange) {
      onScrollChange(newScrollPosition);
    }

    return true;
  };
};

module.exports = {
  createListNavigationHandler,
  createScrollNavigationHandler
};
