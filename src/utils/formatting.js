const { format } = require('date-fns');

const formatGameTime = (game) => {
  if (game.status.completed) {
    return 'FINAL';
  } else if (game.status.description === 'Scheduled') {
    return format(new Date(game.startTime), 'h:mm a');
  } else {
    return `${game.status.period}Q ${game.status.displayClock || ''}`;
  }
};

const formatTeamScore = (team, game) => {
  if (game.status.completed || game.status.description !== 'Scheduled') {
    return team.score !== undefined ? team.score.toString() : '0';
  }
  return '';
};

const getGameStatusColor = (game, colors) => {
  if (game.status.completed) {
    return colors.completedGame;
  } else if (game.status.description === 'Scheduled') {
    return colors.teamName;
  } else {
    return colors.liveGame;
  }
};

const formatPercentage = (value) => {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
};

const formatShootingStats = (made, attempted, percentage) => {
  const madeStr = made !== undefined ? made : 0;
  const attemptedStr = attempted !== undefined ? attempted : 0;
  const pctStr = formatPercentage(percentage);

  return `${madeStr}/${attemptedStr} (${pctStr})`;
};

module.exports = {
  formatGameTime,
  formatTeamScore,
  getGameStatusColor,
  formatPercentage,
  formatShootingStats
};
