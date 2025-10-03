const React = require('react');
const { render } = require('react-blessed');
const { Provider } = require('react-redux');
const raf = require('raf');
const screenManager = require('./screen');
const { initializePollingService, cleanupPollingService } = require('./services/pollingService');
const store = require('./store').default;
const App = require('./components/App.jsx');

// Polyfill requestAnimationFrame for react-blessed
raf.polyfill();

/**
 * React-Blessed application bootstrap
 * Handles React rendering to terminal, error handling, and graceful shutdown
 */
class Application {
  constructor() {
    this.screen = null;
    this.isRunning = false;
    this.options = {};
  }

  /**
   * Start the application with given options
   * @param {Object} options - Application configuration options
   */
  start(options = {}) {
    try {
      this.options = options;
      this.setupEnvironment();
      this.initializePollingService();
      this.initializeScreen();
      this.setupErrorHandling();
      this.renderApplication();
      this.isRunning = true;
    } catch (error) {
      this.handleError('Failed to start application', error);
      this.shutdown();
    }
  }

  /**
   * Set up terminal environment and polyfills
   */
  setupEnvironment() {
    // Add requestAnimationFrame polyfill for terminal environment
    if (typeof global.requestAnimationFrame === 'undefined') {
      global.requestAnimationFrame = (callback) => {
        return setTimeout(callback, 16); // ~60fps
      };
    }

    if (typeof global.cancelAnimationFrame === 'undefined') {
      global.cancelAnimationFrame = (id) => {
        clearTimeout(id);
      };
    }

    // Set up process title
    process.title = 'tipoff';

    // Ensure proper terminal encoding
    if (process.stdout.isTTY) {
      process.stdout.setEncoding('utf8');
    }
  }

  /**
   * Initialize polling service for live updates
   */
  initializePollingService() {
    try {
      initializePollingService();
      if (process.env.NODE_ENV === 'development') {
        console.log('Polling service initialized');
      }
    } catch (error) {
      console.warn('Failed to initialize polling service:', error.message);
    }
  }

  /**
   * Initialize the blessed screen
   */
  initializeScreen() {
    this.screen = screenManager.initialize();
    
    if (!this.screen) {
      throw new Error('Failed to initialize terminal screen');
    }

    // Enable key input on the screen
    this.screen.key(['q'], () => {}); // This enables key input
  }

  /**
   * Set up global error handling
   */
  setupErrorHandling() {
    // Handle React errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Check if this is a React error
      const errorMessage = args.join(' ');
      if (errorMessage.includes('React') || errorMessage.includes('Component')) {
        this.handleError('React Error', new Error(errorMessage));
      } else {
        originalConsoleError.apply(console, args);
      }
    };

    // Handle application-level errors
    process.on('uncaughtException', (error) => {
      this.handleError('Uncaught Exception', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.handleError('Unhandled Promise Rejection', reason);
    });

    // Handle graceful shutdown signals
    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM, shutting down gracefully...');
      this.shutdown();
    });
  }

  /**
   * Render the React application to the terminal
   */
  renderApplication() {
    try {
      // Create the main App component wrapped in Redux Provider
      const AppWithProvider = React.createElement(Provider, {
        store: store
      }, React.createElement(App));

      // Render React component to blessed screen
      // react-blessed will handle updates automatically via requestAnimationFrame
      render(AppWithProvider, this.screen);

    } catch (error) {
      this.handleError('Failed to render application', error);
      throw error;
    }
  }

  /**
   * Handle application errors gracefully
   * @param {string} context - Error context description
   * @param {Error} error - The error object
   */
  handleError(context, error) {
    // Clean up screen first
    if (this.screen) {
      try {
        screenManager.cleanup();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Log error to console
    console.error(`\n${context}:`);
    console.error(error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }

    // Provide user-friendly error message
    console.error('\nThe application encountered an error and needs to close.');
    console.error('Please try running the application again.');
  }

  /**
   * Gracefully shutdown the application
   */
  shutdown() {
    if (!this.isRunning) {
      return;
    }

    console.log('Shutting down application...');
    this.isRunning = false;

    try {
      // Cleanup polling service
      cleanupPollingService();

      // Cleanup screen
      screenManager.cleanup();

      console.log('Application shutdown complete');

      // Exit process
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error.message);
      // Force exit if graceful shutdown fails
      process.exit(1);
    }
  }

  /**
   * Check if application is running
   * @returns {boolean} True if application is running
   */
  isApplicationRunning() {
    return this.isRunning;
  }

  /**
   * Get current application options
   * @returns {Object} Current options
   */
  getOptions() {
    return { ...this.options };
  }
}

// Create and export application instance
const app = new Application();

// Export both the class and instance for flexibility
module.exports = {
  Application,
  start: (options) => app.start(options),
  shutdown: () => app.shutdown(),
  isRunning: () => app.isApplicationRunning(),
  getOptions: () => app.getOptions()
};