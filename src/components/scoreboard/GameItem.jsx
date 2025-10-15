const { formatGameTime, formatTeamScore } = require('../../utils/formatting');

const GameItem = ({ game, index, isSelected }) => {
    const awayTeamBaseName = game.awayTeam.name;
    const homeTeamBaseName = game.homeTeam.name;

    const awayScore = formatTeamScore(game.awayTeam, game);
    const homeScore = formatTeamScore(game.homeTeam, game);

    const gameTime = formatGameTime(game);

    const isLive = !game.status.completed && game.status.description !== 'Scheduled';
    const isFinal = game.status.completed;

    const awayScoreNum = parseInt(awayScore) || 0;
    const homeScoreNum = parseInt(homeScore) || 0;
    const awayWinning = awayScoreNum > homeScoreNum && (isFinal || isLive);
    const homeWinning = homeScoreNum > awayScoreNum && (isFinal || isLive);

    const awayTeamWidth = 25;
    const scoreWidth = 3;
    const homeTeamWidth = 25;
    const timeColumnStart = 65;

    let gameLine = '';
    let plainTextLength = 0;

    const awaySection = awayTeamBaseName;
    const awayPlainText = awayTeamBaseName;

    const awayPadding = Math.max(0, awayTeamWidth - awayPlainText.length);
    gameLine += awaySection + ' '.repeat(awayPadding);
    plainTextLength += awayTeamWidth;

    gameLine += '  ';
    plainTextLength += 2;

    const awayScoreDisplay = awayScore || '';
    if (awayScoreDisplay) {
      const awayScorePadded = awayScoreDisplay.toString().padStart(scoreWidth);
      if (awayWinning) {
        gameLine += `{green-fg}{bold}${awayScorePadded}{/bold}{/green-fg}`;
      } else if (homeWinning) {
        gameLine += `{gray-fg}${awayScorePadded}{/gray-fg}`;
      } else {
        gameLine += awayScorePadded;
      }
      plainTextLength += scoreWidth;
    } else {
      gameLine += ' '.repeat(scoreWidth);
      plainTextLength += scoreWidth;
    }

    gameLine += '  {cyan-fg}@{/cyan-fg}  ';
    plainTextLength += 5;

    const homeScoreDisplay = homeScore || '';
    if (homeScoreDisplay) {
      const homeScorePadded = homeScoreDisplay.toString().padStart(scoreWidth);
      if (homeWinning) {
        gameLine += `{green-fg}{bold}${homeScorePadded}{/bold}{/green-fg}`;
      } else if (awayWinning) {
        gameLine += `{gray-fg}${homeScorePadded}{/gray-fg}`;
      } else {
        gameLine += homeScorePadded;
      }
      plainTextLength += scoreWidth;
    } else {
      gameLine += ' '.repeat(scoreWidth);
      plainTextLength += scoreWidth;
    }

    gameLine += '  ';
    plainTextLength += 2;

    const homeSection = homeTeamBaseName;
    const homePlainText = homeTeamBaseName;

    gameLine += homeSection;
    plainTextLength += homePlainText.length;

    const paddingNeeded = Math.max(1, timeColumnStart - plainTextLength);
    gameLine += ' '.repeat(paddingNeeded);

    const timeWidth = 10;
    if (isLive) {
      const paddedTime = gameTime.padStart(timeWidth);
      gameLine += `{black-bg}{green-fg}{bold}${paddedTime}{/bold}{/green-fg}{/black-bg}`;
    } else if (isFinal) {
      const paddedTime = gameTime.padStart(timeWidth);
      gameLine += `{yellow-fg}${paddedTime}{/yellow-fg}`;
    } else {
      const paddedTime = gameTime.padStart(timeWidth);
      gameLine += `{cyan-fg}${paddedTime}{/cyan-fg}`;
    }

  const prefix = isSelected ? '{magenta-fg}▶{/magenta-fg} ' : '  ';
  return `${prefix}${gameLine}`;
};

module.exports = GameItem;
