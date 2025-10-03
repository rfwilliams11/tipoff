const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { 
  isValidTeam, 
  normalizeTeam, 
  getTeamInfo, 
  getTeamSuggestions,
  VALID_TEAM_ABBREVIATIONS 
} = require('./utils/teams');
const {
  isValidColor,
  normalizeColor,
  getColorSuggestions,
  isValidUIElement,
  getUIElements,
  getUIElementDescription,
  validateColorConfig,
  applyColorTheme,
  getColorThemes,
  formatColorConfig,
  DEFAULT_COLORS
} = require('./utils/colors');

/**
 * CLI interface for Tipoff NBA Terminal Viewer
 * Handles command parsing, configuration management, and application launch
 */
class CLI {
  constructor() {
    this.program = new Command();
    this.configDir = path.join(os.homedir(), '.tipoff');
    this.configFile = path.join(this.configDir, 'config.json');
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

    // Config command for managing user preferences
    const configCmd = this.program
      .command('config')
      .description('Manage user preferences and settings');

    // Config subcommands
    configCmd
      .command('show')
      .description('Show current configuration')
      .action(() => {
        this.showConfig();
      });

    configCmd
      .command('set <key> <value>')
      .description('Set a configuration value')
      .action((key, value) => {
        this.setConfig(key, value);
      });

    configCmd
      .command('favorites')
      .alias('fav')
      .description('Manage favorite teams')
      .argument('[action]', 'Action: add, remove, list, clear', 'list')
      .argument('[team]', 'Team abbreviation (required for add/remove)')
      .action((action, team) => {
        this.manageFavorites(action, team);
      });

    // Add specific favorite team commands for convenience
    configCmd
      .command('add-favorite <team>')
      .alias('add-fav')
      .description('Add a team to favorites')
      .action((team) => {
        this.manageFavorites('add', team);
      });

    configCmd
      .command('remove-favorite <team>')
      .alias('rm-fav')
      .description('Remove a team from favorites')
      .action((team) => {
        this.manageFavorites('remove', team);
      });

    configCmd
      .command('colors')
      .alias('color')
      .description('Manage color preferences')
      .argument('[element]', 'UI element (score, teamName, selectedGame, etc.)')
      .argument('[color]', 'Color name (red, blue, brightgreen, etc.)')
      .action((element, color) => {
        this.manageColors(element, color);
      });

    // Add color theme commands
    configCmd
      .command('theme [themeName]')
      .description('Apply a color theme or list available themes')
      .action((themeName) => {
        this.manageColorTheme(themeName);
      });

    // Add color preview command
    configCmd
      .command('preview')
      .description('Preview current color configuration')
      .action(() => {
        this.previewColors();
      });

    configCmd
      .command('reset')
      .description('Reset configuration to defaults')
      .action(() => {
        this.resetConfig();
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
      // Load configuration
      const config = this.loadConfig();
      
      // Merge command line options with config
      const appOptions = {
        ...config,
        ...options
      };

      // Import and start the main application
      const main = require('./main');
      main.start(appOptions);
    } catch (error) {
      console.error('Error launching application:', error.message);
      process.exit(1);
    }
  }

  /**
   * Load configuration from file
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = fs.readFileSync(this.configFile, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn('Warning: Could not load config file, using defaults');
    }

    // Return default configuration
    return this.getDefaultConfig();
  }

  /**
   * Save configuration to file
   * @param {Object} config - Configuration object to save
   */
  saveConfig(config) {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Write config file
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error.message);
      process.exit(1);
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration object
   */
  getDefaultConfig() {
    return {
      favorites: [],
      colors: {
        score: 'yellow',
        team: 'white',
        status: 'green',
        background: 'black',
        highlight: 'blue'
      },
      polling: {
        live: 5000,
        halftime: 30000,
        scheduled: 60000,
        final: null
      },
      display: {
        dateFormat: 'MMM dd, yyyy',
        timeFormat: 'h:mm a'
      }
    };
  }

  /**
   * Show current configuration
   */
  showConfig() {
    const config = this.loadConfig();
    console.log('Current Configuration:');
    console.log(JSON.stringify(config, null, 2));
  }

  /**
   * Set a configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @param {string} value - Configuration value
   */
  setConfig(key, value) {
    const config = this.loadConfig();
    
    // Handle dot notation for nested keys
    const keys = key.split('.');
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // Parse value if it looks like JSON
    let parsedValue = value;
    try {
      if (value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false' || !isNaN(value)) {
        parsedValue = JSON.parse(value);
      }
    } catch (e) {
      // Keep as string if parsing fails
    }
    
    current[keys[keys.length - 1]] = parsedValue;
    
    this.saveConfig(config);
    console.log(`Set ${key} = ${value}`);
  }

  /**
   * Manage favorite teams
   * @param {string} action - Action to perform (add, remove, list, clear)
   * @param {string} team - Team abbreviation
   */
  manageFavorites(action, team) {
    const config = this.loadConfig();
    
    switch (action) {
      case 'add':
        if (!team) {
          console.error('Team abbreviation required for add action');
          console.log('Usage: tipoff config favorites add <TEAM>');
          console.log('Valid teams:', VALID_TEAM_ABBREVIATIONS.slice(0, 15).join(', '), '...');
          process.exit(1);
        }
        
        const normalizedTeam = normalizeTeam(team);
        if (!normalizedTeam) {
          console.error(`Invalid team: ${team}`);
          const suggestions = getTeamSuggestions(team);
          if (suggestions.length > 0) {
            console.log('Did you mean:', suggestions.join(', ') + '?');
          } else {
            console.log('Valid teams:', VALID_TEAM_ABBREVIATIONS.slice(0, 15).join(', '), '...');
          }
          process.exit(1);
        }
        
        if (!config.favorites.includes(normalizedTeam)) {
          config.favorites.push(normalizedTeam);
          this.saveConfig(config);
          const teamInfo = getTeamInfo(normalizedTeam);
          console.log(`✓ Added ${normalizedTeam} (${teamInfo.name}) to favorites`);
          console.log(`Favorite teams (${config.favorites.length}): ${config.favorites.join(', ')}`);
        } else {
          const teamInfo = getTeamInfo(normalizedTeam);
          console.log(`${normalizedTeam} (${teamInfo.name}) is already in favorites`);
        }
        break;
        
      case 'remove':
      case 'rm':
        if (!team) {
          console.error('Team abbreviation required for remove action');
          console.log('Usage: tipoff config favorites remove <TEAM>');
          if (config.favorites.length > 0) {
            console.log('Current favorites:', config.favorites.join(', '));
          }
          process.exit(1);
        }
        
        const teamToRemove = normalizeTeam(team);
        if (!teamToRemove) {
          console.error(`Invalid team: ${team}`);
          const suggestions = getTeamSuggestions(team);
          if (suggestions.length > 0) {
            console.log('Did you mean:', suggestions.join(', ') + '?');
          }
          process.exit(1);
        }
        
        const index = config.favorites.indexOf(teamToRemove);
        if (index > -1) {
          config.favorites.splice(index, 1);
          this.saveConfig(config);
          const teamInfo = getTeamInfo(teamToRemove);
          console.log(`✓ Removed ${teamToRemove} (${teamInfo.name}) from favorites`);
          if (config.favorites.length > 0) {
            console.log(`Remaining favorites (${config.favorites.length}): ${config.favorites.join(', ')}`);
          } else {
            console.log('No favorite teams remaining');
          }
        } else {
          const teamInfo = getTeamInfo(teamToRemove);
          console.log(`${teamToRemove} (${teamInfo.name}) is not in favorites`);
          if (config.favorites.length > 0) {
            console.log('Current favorites:', config.favorites.join(', '));
          }
        }
        break;
        
      case 'clear':
        if (config.favorites.length > 0) {
          const count = config.favorites.length;
          config.favorites = [];
          this.saveConfig(config);
          console.log(`✓ Cleared ${count} favorite team(s)`);
        } else {
          console.log('No favorite teams to clear');
        }
        break;
        
      case 'list':
      default:
        if (config.favorites.length > 0) {
          console.log(`Favorite teams (${config.favorites.length}):`);
          config.favorites.forEach((team, index) => {
            const teamInfo = getTeamInfo(team);
            const teamName = teamInfo ? teamInfo.name : 'Unknown Team';
            console.log(`  ${index + 1}. ${team} - ${teamName}`);
          });
          console.log('\n★ Favorite teams will be highlighted in the scoreboard');
        } else {
          console.log('No favorite teams configured');
          console.log('\nAdd favorites with: tipoff config favorites add <TEAM>');
          console.log('Examples: tipoff config favorites add LAL');
          console.log('          tipoff config favorites add "Golden State"');
          console.log('Valid teams:', VALID_TEAM_ABBREVIATIONS.slice(0, 10).join(', '), '...');
        }
        break;
    }
  }

  /**
   * Manage color preferences
   * @param {string} element - UI element to configure
   * @param {string} color - Color value
   */
  manageColors(element, color) {
    const config = this.loadConfig();
    
    if (!element) {
      console.log('Current color configuration:');
      console.log(formatColorConfig(config.colors, true));
      console.log('\nAvailable UI elements:', getUIElements().join(', '));
      console.log('\nUsage: tipoff config colors <element> <color>');
      console.log('Example: tipoff config colors score brightgreen');
      return;
    }
    
    if (!isValidUIElement(element)) {
      console.error(`Unknown UI element: ${element}`);
      console.log('Available elements:', getUIElements().join(', '));
      return;
    }
    
    if (!color) {
      const currentColor = config.colors[element];
      const description = getUIElementDescription(element);
      console.log(`${element}: ${currentColor} - ${description}`);
      return;
    }
    
    const normalizedColor = normalizeColor(color);
    if (!normalizedColor) {
      console.error(`Invalid color: ${color}`);
      const suggestions = getColorSuggestions(color);
      if (suggestions.length > 0) {
        console.log('Did you mean:', suggestions.join(', ') + '?');
      } else {
        console.log('Valid colors: red, green, blue, yellow, cyan, magenta, white, black, gray');
        console.log('Bright colors: brightred, brightgreen, brightblue, etc.');
      }
      return;
    }
    
    config.colors[element] = normalizedColor;
    this.saveConfig(config);
    
    const description = getUIElementDescription(element);
    console.log(`✓ Set ${element} (${description}) to ${normalizedColor}`);
    console.log(`Preview: This text would appear in ${normalizedColor}`);
  }

  /**
   * Manage color themes
   * @param {string} themeName - Theme name to apply
   */
  manageColorTheme(themeName) {
    const config = this.loadConfig();
    
    if (!themeName) {
      console.log('Available color themes:');
      const themes = getColorThemes();
      themes.forEach(theme => {
        console.log(`  ${theme.key}: ${theme.name} - ${theme.description}`);
      });
      console.log('\nUsage: tipoff config theme <themeName>');
      console.log('Example: tipoff config theme dark');
      return;
    }
    
    const themeColors = applyColorTheme(themeName);
    if (!themeColors) {
      console.error(`Unknown theme: ${themeName}`);
      const themes = getColorThemes();
      console.log('Available themes:', themes.map(t => t.key).join(', '));
      return;
    }
    
    config.colors = themeColors;
    this.saveConfig(config);
    
    console.log(`✓ Applied ${themeName} theme`);
    console.log('\nNew color configuration:');
    console.log(formatColorConfig(config.colors));
  }

  /**
   * Preview current color configuration
   */
  previewColors() {
    const config = this.loadConfig();
    
    console.log('Current Color Configuration Preview:');
    console.log('=====================================');
    console.log(formatColorConfig(config.colors, true));
    
    console.log('\nColor Usage Examples:');
    console.log('- Scores will appear in:', config.colors.score);
    console.log('- Team names will appear in:', config.colors.teamName);
    console.log('- Selected games will be highlighted in:', config.colors.selectedGame);
    console.log('- Live games will appear in:', config.colors.liveGame);
    console.log('- Completed games will appear in:', config.colors.completedGame);
    console.log('- Error messages will appear in:', config.colors.error);
    console.log('- Info messages will appear in:', config.colors.info);
    
    console.log('\nTo change colors: tipoff config colors <element> <color>');
    console.log('To apply a theme: tipoff config theme <themeName>');
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig() {
    const defaultConfig = this.getDefaultConfig();
    this.saveConfig(defaultConfig);
    console.log('Configuration reset to defaults');
  }
}

module.exports = CLI;