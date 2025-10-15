const React = require('react');
const { render } = require('react-blessed');
const { Provider } = require('react-redux');
const raf = require('raf');
const screenManager = require('./screen');
const { initializePollingService, cleanupPollingService } = require('./services/pollingService');
const store = require('./store').default;
const App = require('./components/App.jsx');
const logger = require('./utils/logger');

raf.polyfill();

class Application {
  constructor() {
    this.screen = null;
    this.isRunning = false;
    this.options = {};
  }

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

  setupEnvironment() {
    if (typeof global.requestAnimationFrame === 'undefined') {
      global.requestAnimationFrame = (callback) => {
        return setTimeout(callback, 16);
      };
    }

    if (typeof global.cancelAnimationFrame === 'undefined') {
      global.cancelAnimationFrame = (id) => {
        clearTimeout(id);
      };
    }

    process.title = 'tipoff';

    if (process.stdout.isTTY) {
      process.stdout.setEncoding('utf8');
    }
  }

  initializePollingService() {
    try {
      initializePollingService();
      logger.info('Polling service initialized');
    } catch (error) {
      logger.warn('Failed to initialize polling service:', error.message);
    }
  }

  initializeScreen() {
    this.screen = screenManager.initialize();

    if (!this.screen) {
      throw new Error('Failed to initialize terminal screen');
    }

    this.screen.key(['q'], () => {});
  }

  setupErrorHandling() {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      if (errorMessage.includes('React') || errorMessage.includes('Component')) {
        this.handleError('React Error', new Error(errorMessage));
      } else {
        originalConsoleError.apply(console, args);
      }
    };

    process.on('uncaughtException', (error) => {
      this.handleError('Uncaught Exception', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.handleError('Unhandled Promise Rejection', reason);
    });

    process.on('SIGINT', () => {
      logger.info('\nReceived SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      logger.info('\nReceived SIGTERM, shutting down gracefully...');
      this.shutdown();
    });
  }

  renderApplication() {
    try {
      const AppWithProvider = React.createElement(Provider, {
        store: store
      }, React.createElement(App));

      render(AppWithProvider, this.screen);

    } catch (error) {
      this.handleError('Failed to render application', error);
      throw error;
    }
  }

  handleError(context, error) {
    if (this.screen) {
      try {
        screenManager.cleanup();
      } catch (cleanupError) {}
    }

    console.error(`\n${context}:`);
    console.error(error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }

    console.error('\nThe application encountered an error and needs to close.');
    console.error('Please try running the application again.');
  }

  shutdown() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Shutting down application...');
    this.isRunning = false;

    try {
      cleanupPollingService();
      screenManager.cleanup();
      logger.info('Application shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error.message);
      process.exit(1);
    }
  }

  isApplicationRunning() {
    return this.isRunning;
  }

  getOptions() {
    return { ...this.options };
  }
}

const app = new Application();

module.exports = {
  Application,
  start: (options) => app.start(options),
  shutdown: () => app.shutdown(),
  isRunning: () => app.isApplicationRunning(),
  getOptions: () => app.getOptions()
};

if (require.main === module) {
  app.start();
}