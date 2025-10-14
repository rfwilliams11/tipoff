const blessed = require('blessed');

class ScreenManager {
  constructor() {
    this.screen = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      return this.screen;
    }

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Tipoff - NBA Terminal Viewer',
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: null
      },
      debug: false,
      warnings: false
    });

    this.setupGlobalKeyBindings();
    this.setupCleanupHandlers();

    this.isInitialized = true;
    return this.screen;
  }

  setupGlobalKeyBindings() {
    this.screen.key(['q', 'Q'], () => {
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(['escape'], () => {
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(['C-c'], () => {
      this.cleanup();
      process.exit(0);
    });

    this.screen.key(['tab'], () => {});
  }

  setupCleanupHandlers() {
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      this.cleanup();
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.cleanup();
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  getScreen() {
    if (!this.isInitialized) {
      return this.initialize();
    }
    return this.screen;
  }

  cleanup() {
    if (this.screen && this.isInitialized) {
      try {
        this.screen.destroy();
      } catch (error) {}
    }
    this.isInitialized = false;
    this.screen = null;
  }

  render() {
    if (this.screen) {
      this.screen.render();
    }
  }

  isReady() {
    return this.isInitialized && this.screen !== null;
  }
}

const screenManager = new ScreenManager();

module.exports = screenManager;