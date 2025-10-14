const { Command } = require('commander');

/**
 * CLI interface for Tipoff NBA Terminal Viewer
 * Handles command parsing and application launch
 */
class CLI {
  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Set up CLI commands and options
   */
  setupCommands() {
    this.program
      .name('tipoff')
      .description('A command-line interface for watching live NBA games in your terminal')
      .version('1.0.0');

    // Main command - launch application
    this.program
      .option('-d, --date <date>', 'Show games for specific date (YYYY-MM-DD)')
      .option('-t, --team <team>', 'Filter games by team abbreviation')
      .action((options) => {
        this.launchApplication(options);
      });
  }

  /**
   * Parse command line arguments and execute appropriate action
   * @param {string[]} argv - Command line arguments
   */
  parse(argv = process.argv) {
    try {
      this.program.parse(argv);
    } catch (error) {
      console.error('Error parsing command:', error.message);
      process.exit(1);
    }
  }

  /**
   * Launch the main application
   * @param {Object} options - Command line options
   */
  launchApplication(options) {
    try {
      // Import and start the main application
      const main = require('./main');
      main.start(options);
    } catch (error) {
      console.error('Error launching application:', error.message);
      process.exit(1);
    }
  }
}

module.exports = CLI;
