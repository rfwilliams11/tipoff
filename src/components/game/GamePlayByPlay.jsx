const GamePlayByPlay = ({ plays, isCompleted }) => {
  if (!plays || plays.length === 0 || isCompleted) {
    return '';
  }

  const lines = [];
  lines.push('{bold}{magenta-fg}▸ RECENT PLAYS{/magenta-fg}{/bold}');
  lines.push('');

  const filteredPlays = plays.filter(play => {
    const playType = (play.type || '').toLowerCase();
    const desc = (play.description || '').toLowerCase();

    if (playType.includes('rebound') && desc.includes('defensive')) {
      return false;
    }

    return true;
  });

  const recentPlays = filteredPlays.slice(-20).reverse();

  recentPlays.forEach(play => {
    const periodStr = play.periodDisplay || (play.period ? `${play.period}Q` : '   ');
    const clockStr = (play.clock || '').padEnd(5);

    let typeColor = 'white-fg';
    let typeText = '';

    const playType = (play.type || '').toLowerCase();
    const desc = (play.description || '').toLowerCase();

    if (play.scoringPlay) {
      typeColor = 'cyan-fg';
      if (playType.includes('3pt') || playType.includes('three point') || desc.includes('three point')) {
        typeText = '[3PT]';
      } else if (playType.includes('free throw')) {
        typeText = '[FT]';
      } else if (desc.includes('dunk')) {
        typeText = '[Dunk]';
      } else if (desc.includes('layup')) {
        typeText = '[Layup]';
      } else {
        typeText = '[FG]';
      }
    } else if (playType.includes('rebound')) {
      typeColor = 'yellow-fg';
      typeText = '[Rebound]';
    } else if (playType.includes('steal')) {
      typeColor = 'magenta-fg';
      typeText = '[Steal]';
    } else if (playType.includes('block')) {
      typeColor = 'red-fg';
      typeText = '[Block]';
    } else if (playType.includes('turnover')) {
      typeColor = 'red-fg';
      typeText = '[TO]';
    } else if (playType.includes('timeout')) {
      typeColor = 'gray-fg';
      typeText = '[Timeout]';
    } else if (playType.includes('substitution') || playType.includes('sub ')) {
      typeColor = 'gray-fg';
      typeText = '[Sub]';
    } else if (playType.includes('jumpball') || playType.includes('jump ball')) {
      typeColor = 'blue-fg';
      typeText = '[Jumpball]';
    } else if (playType.includes('miss')) {
      typeColor = 'gray-fg';
      typeText = '[Miss]';
    }

    const prefix = `[${periodStr}] ${clockStr}`;
    const typeTag = typeText ? `{${typeColor}}${typeText.padEnd(12)}{/${typeColor}}` : ''.padEnd(12);

    let descText = play.description || '';
    const maxDescLength = 100;
    if (descText.length > maxDescLength) {
      descText = descText.substring(0, maxDescLength - 3) + '...';
    }

    let scoreStr = '';
    if (play.scoringPlay && (play.awayScore !== undefined || play.homeScore !== undefined)) {
      scoreStr = ` {cyan-fg}{bold}${play.awayScore}-${play.homeScore}{/bold}{/cyan-fg}`;
    }

    lines.push(`  ${prefix} ${typeTag} ${descText}${scoreStr}`);
  });

  return lines.join('\n');
};

module.exports = GamePlayByPlay;
