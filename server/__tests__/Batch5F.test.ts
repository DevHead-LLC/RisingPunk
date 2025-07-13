import { BattleTimerService } from '../src/services/BattleTimer';
import { BattleUpdater } from '../src/services/BattleUpdater';
import { BATTLE_CONFIG } from '../src/config/battleConfig';

describe('Batch 5F: Server Battle State Updates and Timer Management', () => {
  let timerService: BattleTimerService;
  let battleUpdater: BattleUpdater;

  beforeEach(() => {
    timerService = BattleTimerService.getInstance();
    battleUpdater = BattleUpdater.getInstance();
    
    // Clean up any existing timers
    timerService.stopAllTimers();
  });

  afterEach(() => {
    timerService.stopAllTimers();
  });

  describe('Configuration Constants', () => {
    test('should have correct timer durations from intentions documents', () => {
      // Test that configuration matches battle-intentions.md exactly
      expect(BATTLE_CONFIG.COUNTDOWN_DURATION).toBe(3);
      expect(BATTLE_CONFIG.BATTLE_DURATION).toBe(20);
    });

    test('should have correct update intervals for server-client coordination', () => {
      // Test that update intervals match the architecture requirements
      expect(BATTLE_CONFIG.UPDATE_INTERVAL).toBe(100); // Server calculates every 100ms
      expect(BATTLE_CONFIG.SYNC_INTERVAL).toBe(1000);  // Client receives every 1s
    });
  });

  describe('BattleTimer Service', () => {
    test('should manage timer state without starting intervals', () => {
      const battleId = 'test-battle-regression';
      
      // Test initial state
      expect(timerService.isTimerActive(battleId)).toBe(false);
      expect(timerService.getTimeRemaining(battleId)).toBeNull();
      
      // Test statistics
      const stats = timerService.getTimerStats();
      expect(stats.activeBattles).toBe(0);
      expect(stats.totalTimers).toBe(0);
    });

    test('should handle cleanup operations safely', () => {
      // Test that cleanup methods don't throw errors
      expect(() => {
        timerService.stopAllTimers();
      }).not.toThrow();
      
      expect(() => {
        timerService.forceEndBattle('non-existent');
      }).not.toThrow();
    });
  });

  describe('BattleUpdater Service', () => {
    test('should return update statistics', () => {
      const stats = battleUpdater.getUpdateStats();
      expect(stats).toHaveProperty('activeBattles');
      expect(stats).toHaveProperty('lastUpdate');
      expect(typeof stats.activeBattles).toBe('number');
      expect(typeof stats.lastUpdate).toBe('number');
    });

    test('should return active battle IDs array', () => {
      const activeIds = battleUpdater.getActiveBattleIds();
      expect(Array.isArray(activeIds)).toBe(true);
    });
  });

  describe('Integration', () => {
    test('should have singleton pattern working correctly', () => {
      const timer1 = BattleTimerService.getInstance();
      const timer2 = BattleTimerService.getInstance();
      expect(timer1).toBe(timer2);
      
      const updater1 = BattleUpdater.getInstance();
      const updater2 = BattleUpdater.getInstance();
      expect(updater1).toBe(updater2);
    });
  });
}); 