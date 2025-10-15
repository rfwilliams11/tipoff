const GameHeader = ({ gameData, gameStatus }) => {
  if (!gameData) return '';

  const awayTeam = gameData.teams[1];
  const homeTeam = gameData.teams[0];
  const gameDate = new Date(gameData.startTime);
  const dateStr = gameDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const timeStr = gameDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  const contentWidth = 73;
  const lines = [];

  lines.push('┌' + '─'.repeat(contentWidth) + '┐');
  const metaText = `${dateStr} • ${timeStr}`;
  lines.push('│ ' + metaText.padEnd(contentWidth - 1) + '│');
  lines.push('├' + '─'.repeat(contentWidth) + '┤');

  const awayTeamText = `${awayTeam.name} (${awayTeam.abbreviation})`;
  const homeTeamText = `${homeTeam.name} (${homeTeam.abbreviation})`;
  const awayScoreText = String(awayTeam.score);
  const homeScoreText = String(homeTeam.score);

  lines.push('│ ' + `{bold}${awayTeamText}{/bold}` + ' '.repeat(contentWidth - 1 - awayTeamText.length - awayScoreText.length) + `{yellow-fg}${awayScoreText}{/yellow-fg}` + '│');
  lines.push('│ ' + `{bold}${homeTeamText}{/bold}` + ' '.repeat(contentWidth - 1 - homeTeamText.length - homeScoreText.length) + `{yellow-fg}${homeScoreText}{/yellow-fg}` + '│');

  lines.push('├' + '─'.repeat(contentWidth) + '┤');

  const status = gameData.status;
  const startTime = new Date(gameData.startTime);
  const now = new Date();
  const isPastStartTime = now > startTime;
  const isScheduled = status.description === 'Scheduled' && status.period === 0;

  const statusText = status.completed ? 'FINAL' :
                     isScheduled && isPastStartTime ? 'Tipping off soon...' :
                     isScheduled ? 'UPCOMING' :
                     gameStatus;

  const statusIndicator = status.completed ? '{yellow-fg}FINAL{/yellow-fg}' :
                         isScheduled && isPastStartTime ? '{green-fg}Tipping off soon...{/green-fg}' :
                         isScheduled ? '{cyan-fg}UPCOMING{/cyan-fg}' :
                         `{green-fg}${gameStatus}{/green-fg}`;

  lines.push('│ ' + statusIndicator.padEnd(contentWidth - 1 + statusIndicator.length - statusText.length) + '│');
  lines.push('└' + '─'.repeat(contentWidth) + '┘');

  return lines.join('\n');
};

module.exports = GameHeader;
