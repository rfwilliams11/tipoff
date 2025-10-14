# Tipoff - NBA Terminal Viewer

A command-line interface for watching live NBA games directly in your terminal.

## Installation

```bash
npm install -g tipoff
```

## Usage

```bash
# Launch with today's games
tipoff

# Show games for a specific date
tipoff --date 2024-01-15

# Filter games by team
tipoff --team LAL
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## Features

- View today's NBA games in terminal
- Navigate between different dates
- View detailed game information with live updates
- Real-time statistics and play-by-play
- Keyboard navigation and shortcuts

## Keyboard Controls

### Scoreboard View
- `↑`/`↓` or `j`/`k` - Navigate between games
- `Enter` - View detailed game information
- `n` - Next day
- `p` - Previous day
- `t` - Go to today
- `q` - Quit

### Game Detail View
- `c` or `Esc` - Return to scoreboard
- `↑`/`↓` - Scroll through content
- `q` - Quit

## License

MIT
