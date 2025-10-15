const GameStatLeaders = ({ leaders, awayTeam, homeTeam, isUpcoming }) => {
  if (!leaders || leaders.length === 0 || isUpcoming) {
    return '';
  }

  const lines = [''];

  const awayLeaders = leaders.find(tl => tl.teamId === awayTeam.id);
  const homeLeaders = leaders.find(tl => tl.teamId === homeTeam.id);

  const leaderStats = ['points', 'rebounds', 'assists'];

  leaderStats.forEach(statName => {
    const awayLeader = awayLeaders?.leaders?.find(l => l.name === statName);
    const homeLeader = homeLeaders?.leaders?.find(l => l.name === statName);

    if (awayLeader?.leaders?.[0] || homeLeader?.leaders?.[0]) {
      const statLabel = awayLeader?.displayName || homeLeader?.displayName || statName.toUpperCase();
      lines.push(`{bold}${statLabel}{/bold}`);

      if (awayLeader?.leaders?.[0]) {
        const leader = awayLeader.leaders[0];
        const name = leader.athlete.shortName || leader.athlete.displayName;
        const teamLabel = `${awayTeam.abbreviation}:`;
        lines.push(`  ${teamLabel.padEnd(6)} ${name.padEnd(18)}${leader.displayValue.padStart(3)}`);
      } else {
        lines.push('');
      }

      if (homeLeader?.leaders?.[0]) {
        const leader = homeLeader.leaders[0];
        const name = leader.athlete.shortName || leader.athlete.displayName;
        const teamLabel = `${homeTeam.abbreviation}:`;
        lines.push(`  ${teamLabel.padEnd(6)} ${name.padEnd(18)}${leader.displayValue.padStart(3)}`);
      } else {
        lines.push('');
      }
    }
  });

  return lines.join('\n');
};

module.exports = GameStatLeaders;
