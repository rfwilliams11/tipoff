const { Command } = require('commander');

class CLI {
  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  setupCommands() {
    this.program
      .name('tipoff')
      .description('A command-line interface for following live NBA games in your terminal')
      .version('1.0.0');

    this.program
      .option('-d, --date <date>', 'Show games for specific date (YYYY-MM-DD)')
      .option('-t, --team <team>', 'Filter games by team abbreviation')
      .action((options) => {
        this.launchApplication(options);
      });
  }

  parse(argv = process.argv) {
    try {
      this.program.parse(argv);
    } catch (error) {
      console.error('Error parsing command:', error.message);
      process.exit(1);
    }
  }

  launchApplication(options) {
    try {
      const main = require('./main');
      main.start(options);
    } catch (error) {
      console.error('Error launching application:', error.message);
      process.exit(1);
    }
  }
}

module.exports = CLI;
