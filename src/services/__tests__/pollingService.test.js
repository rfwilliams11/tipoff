import {
  POLLING_INTERVALS,
  getPollingInterval
} from '../pollingService'



describe('Polling Service', () => {
  describe('POLLING_INTERVALS', () => {
    it('should define correct polling intervals', () => {
      expect(POLLING_INTERVALS.LIVE_GAME).toBe(5000)
      expect(POLLING_INTERVALS.HALFTIME).toBe(30000)
      expect(POLLING_INTERVALS.SCHEDULED).toBe(60000)
      expect(POLLING_INTERVALS.FINAL).toBe(null)
      expect(POLLING_INTERVALS.DEFAULT).toBe(15000)
    })
  })

  describe('getPollingInterval', () => {
    it('should return correct interval for live games', () => {
      const liveGame = {
        gameData: {
          status: {
            completed: false,
            description: '3rd Quarter',
            period: 3
          }
        }
      }
      
      expect(getPollingInterval(liveGame)).toBe(POLLING_INTERVALS.LIVE_GAME)
    })

    it('should return null for completed games', () => {
      const completedGame = {
        gameData: {
          status: {
            completed: true,
            description: 'Final',
            period: 4
          }
        }
      }
      
      expect(getPollingInterval(completedGame)).toBe(POLLING_INTERVALS.FINAL)
    })

    it('should return default interval for missing game data', () => {
      expect(getPollingInterval(null)).toBe(POLLING_INTERVALS.DEFAULT)
      expect(getPollingInterval({})).toBe(POLLING_INTERVALS.DEFAULT)
      expect(getPollingInterval({ gameData: {} })).toBe(POLLING_INTERVALS.DEFAULT)
    })
  })


})