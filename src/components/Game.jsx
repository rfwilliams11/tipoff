const React = require('react')
const { useSelector, useDispatch } = require('react-redux')
const { useEffect, useCallback, useMemo } = React

const {
  fetchGameDetail,
  pollGameUpdates,
  startPolling,
  stopPolling,
  selectSelectedGameId,
  selectSelectedGame,
  selectIsLoading,
  selectError
} = require('../store/gamesSlice')

const { useGamePolling } = require('../hooks/useGamePolling')
const { useKeyboardNavigation } = require('../hooks/useKeyboardNavigation')
const GameHeader = require('./game/GameHeader.jsx')
const GameBoxScore = require('./game/GameBoxScore.jsx')
const GameStatLeaders = require('./game/GameStatLeaders.jsx')
const GamePlayByPlay = require('./game/GamePlayByPlay.jsx')

const Game = React.memo(({ gameId, onBackToScoreboard }) => {
  const dispatch = useDispatch()

  const selectedGameId = useSelector(selectSelectedGameId)
  const selectedGame = useSelector(selectSelectedGame)
  const isLoading = useSelector(selectIsLoading)
  const error = useSelector(selectError)

  useEffect(() => {
    if (gameId && !selectedGame) {
      dispatch(fetchGameDetail(gameId))
    }
  }, [gameId, selectedGame, dispatch])

  useGamePolling(selectedGame, gameId, dispatch, {
    startPolling,
    pollGameUpdates,
    stopPolling
  })

  useKeyboardNavigation({
    c: onBackToScoreboard,
    escape: onBackToScoreboard
  })

  const gameStatus = useMemo(() => {
    if (!selectedGame) return 'Loading...'

    const status = selectedGame.gameData.status

    if (status.completed) {
      return 'FINAL'
    } else if (status.description === 'Scheduled') {
      const startTime = new Date(selectedGame.gameData.startTime)
      return `Scheduled - ${startTime.toLocaleTimeString()}`
    } else {
      const period = status.period || 1
      const clock = status.displayClock || status.clock || ''
      return `${period}Q ${clock}`
    }
  }, [selectedGame])

  const content = useMemo(() => {
    if (isLoading && !selectedGame) {
      return 'Loading game details...'
    }

    if (error && !selectedGame) {
      return `Error loading game: ${error}\n\nPress 'r' to retry or 'c' to return to scoreboard`
    }

    if (!selectedGame) {
      return 'No game selected\n\nPress \'c\' to return to scoreboard'
    }

    const lines = []
    const awayTeam = selectedGame.gameData.teams[1]
    const homeTeam = selectedGame.gameData.teams[0]
    const status = selectedGame.gameData.status
    const isUpcoming = status.description === 'Scheduled'

    const headerContent = GameHeader({ gameData: selectedGame.gameData, gameStatus })
    lines.push(headerContent)
    lines.push('')

    if (selectedGame.liveData) {
      if (selectedGame.liveData.currentPlay) {
        lines.push('{bold}{green-fg}▸ CURRENT PLAY{/green-fg}{/bold}')
        lines.push(`  ${selectedGame.liveData.currentPlay.description}`)
        lines.push('')
      }

      const hasBoxscore = selectedGame.liveData.boxscore && selectedGame.liveData.boxscore.length > 0 && !isUpcoming
      const hasLeaders = selectedGame.liveData.leaders && selectedGame.liveData.leaders.length > 0 && !isUpcoming

      if (hasBoxscore || hasLeaders) {
        const leftColumn = []
        const rightColumn = []

        if (hasBoxscore) {
          const boxScoreContent = GameBoxScore({
            boxscore: selectedGame.liveData.boxscore,
            awayTeam,
            homeTeam,
            isUpcoming
          })
          leftColumn.push(...boxScoreContent.split('\n'))
        }

        if (hasLeaders) {
          const leadersContent = GameStatLeaders({
            leaders: selectedGame.liveData.leaders,
            awayTeam,
            homeTeam,
            isUpcoming
          })
          rightColumn.push(...leadersContent.split('\n'))
        }

        const maxLines = Math.max(leftColumn.length, rightColumn.length)
        for (let i = 0; i < maxLines; i++) {
          const left = (leftColumn[i] || '').padEnd(45)
          const right = rightColumn[i] || ''
          lines.push(`  ${left}${right}`)
        }
        lines.push('')
      }

      if (selectedGame.liveData.plays && selectedGame.liveData.plays.length > 0 && !status.completed) {
        const playByPlayContent = GamePlayByPlay({
          plays: selectedGame.liveData.plays,
          isCompleted: status.completed
        })
        lines.push(playByPlayContent)
        lines.push('')
      }
    }

    lines.push(`${'-'.repeat(75)}`)
    lines.push('{cyan-fg}Keys:{/cyan-fg} {bold}c{/bold}=Scoreboard {bold}↑↓{/bold}=Scroll {bold}q{/bold}=Quit')

    return lines.join('\n')
  }, [isLoading, error, selectedGame, gameStatus])

  const boxStyle = useMemo(() => {
    if (isLoading && !selectedGame) {
      return { fg: 'blue', bg: 'black' }
    } else if (error && !selectedGame) {
      return { fg: 'red', bg: 'black' }
    } else if (!selectedGame) {
      return { fg: 'yellow', bg: 'black' }
    } else {
      return { fg: 'white', bg: 'black' }
    }
  }, [isLoading, error, selectedGame])

  return React.createElement('box', {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    content,
    tags: true,
    scrollable: !!selectedGame,
    alwaysScroll: !!selectedGame,
    scrollbar: selectedGame ? {
      ch: ' ',
      track: {
        bg: 'gray'
      },
      style: {
        inverse: true
      }
    } : undefined,
    style: boxStyle
  })
})

module.exports = Game
