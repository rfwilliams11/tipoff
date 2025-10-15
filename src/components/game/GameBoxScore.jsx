const GameBoxScore = ({ boxscore, awayTeam, homeTeam, isUpcoming }) => {
  if (!boxscore || boxscore.length === 0 || isUpcoming) {
    return '';
  }

  const lines = [];
  lines.push('{bold}{cyan-fg}▸ BOX SCORE{/cyan-fg}{/bold}');

  const statsToShow = [
    { key: 'fieldGoalPct', label: 'FG%' },
    { key: 'threePointFieldGoalPct', label: '3P%' },
    { key: 'freeThrowPct', label: 'FT%' },
    { key: 'totalRebounds', label: 'REB' },
    { key: 'assists', label: 'AST' },
    { key: 'turnovers', label: 'TO' },
    { key: 'steals', label: 'STL' },
    { key: 'blocks', label: 'BLK' }
  ];

  const awayStats = boxscore.find(ts => ts.teamId === awayTeam.id);
  const homeStats = boxscore.find(ts => ts.teamId === homeTeam.id);

  if (awayStats && homeStats) {
    lines.push(`${''.padEnd(15)} ${awayTeam.abbreviation.padEnd(8)} ${homeTeam.abbreviation.padEnd(8)}`);
    lines.push(`${'-'.repeat(35)}`);

    statsToShow.forEach(({ key, label }) => {
      const awayStat = awayStats.statistics?.find(s => s.name === key || s.abbreviation === key);
      const homeStat = homeStats.statistics?.find(s => s.name === key || s.abbreviation === key);

      if (awayStat || homeStat) {
        const awayVal = (awayStat?.displayValue || 'N/A').padEnd(8);
        const homeVal = (homeStat?.displayValue || 'N/A').padEnd(8);
        lines.push(`${label.padEnd(15)} ${awayVal} ${homeVal}`);
      }
    });
  }

  return lines.join('\n');
};

module.exports = GameBoxScore;
