const blessed = require('blessed');

/**
 * Blessed screen singleton for terminal UI management
 * Provides global key bindings and screen configuration
 */
class ScreenManager {
  constructor() {
    this.screen = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the blessed screen with configuration and global key bindings
   * @returns {Object} The blessed screen instance
   */
  initialize() {
    if (this.isInitialized) {
      return this.screen;
    }

    // Create blessed screen with configuration
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

    // Set up global key bindings for quit handlers
    this.setupGlobalKeyBindings();

    // Set up cleanup handlers
    this.setupCleanupHandlers();

    this.isInitialized = true;
    return this.screen;
  }

  /**
   * Set up global key bindings for application control
   */
  setupGlobalKeyBindings() {
    // Quit handlers - q, ESC, Ctrl+C
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

    // Enable key input
    this.screen.key(['tab'], () => {
      // Tab handling can be implemented by individual components
    });
  }

  /**
   * Set up cleanup handlers for graceful shutdown
   */
  setupCleanupHandlers() {
    // Handle process termination signals
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.cleanup();
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.cleanup();
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  /**
   * Get the screen instance (initialize if not already done)
   * @returns {Object} The blessed screen instance
   */
  getScreen() {
    if (!this.isInitialized) {
      return this.initialize();
    }
    return this.screen;
  }

  /**
   * Cleanup screen resources and restore terminal
   */
  cleanup() {
    if (this.screen && this.isInitialized) {
      try {
        // Restore cursor and clear screen
        this.screen.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.isInitialized = false;
    this.screen = null;
  }

  /**
   * Render the screen
   */
  render() {
    if (this.screen) {
      this.screen.render();
    }
  }

  /**
   * Check if screen is initialized
   * @returns {boolean} True if screen is initialized
   */
  isReady() {
    return this.isInitialized && this.screen !== null;
  }
}

// Export singleton instance
const screenManager = new ScreenManager();

module.exports = screenManager;