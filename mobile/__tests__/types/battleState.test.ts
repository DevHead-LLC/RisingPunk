/**
 * @file battleState.test.ts
 * @description Tests for battle state types
 */

import { BattleTimerConfig, BattleStateData, BattleStateAction } from '../../src/types/battleState';
import { BattlePhase } from '../../src/types/battleTypes';

describe('BattleState Types', () => {
  describe('BattleTimerConfig', () => {
    it('should have correct structure', () => {
      const config: BattleTimerConfig = {
        countdownDuration: 3,
        battleDuration: 20
      };

      expect(config.countdownDuration).toBe(3);
      expect(config.battleDuration).toBe(20);
    });
  });

  describe('BattleStateData', () => {
    it('should have correct structure', () => {
      const state: BattleStateData = {
        phase: BattlePhase.COUNTDOWN,
        countdown: 3,
        battleTime: 0,
        maxBattleTime: 20,
        isPaused: false
      };

      expect(state.phase).toBe(BattlePhase.COUNTDOWN);
      expect(state.countdown).toBe(3);
      expect(state.battleTime).toBe(0);
      expect(state.maxBattleTime).toBe(20);
      expect(state.isPaused).toBe(false);
    });
  });

  describe('BattleStateAction', () => {
    it('should support all action types', () => {
      const startCountdown: BattleStateAction = { type: 'START_COUNTDOWN' };
      const startBattle: BattleStateAction = { type: 'START_BATTLE' };
      const endBattle: BattleStateAction = { type: 'END_BATTLE', winner: 'user' };
      const updateTimer: BattleStateAction = { type: 'UPDATE_TIMER', time: 5 };
      const updateCountdown: BattleStateAction = { type: 'UPDATE_COUNTDOWN', countdown: 2 };
      const pauseBattle: BattleStateAction = { type: 'PAUSE_BATTLE' };
      const resumeBattle: BattleStateAction = { type: 'RESUME_BATTLE' };
      const resetBattle: BattleStateAction = { type: 'RESET_BATTLE' };

      expect(startCountdown.type).toBe('START_COUNTDOWN');
      expect(startBattle.type).toBe('START_BATTLE');
      expect(endBattle.type).toBe('END_BATTLE');
      expect(endBattle.winner).toBe('user');
      expect(updateTimer.type).toBe('UPDATE_TIMER');
      expect(updateTimer.time).toBe(5);
      expect(updateCountdown.type).toBe('UPDATE_COUNTDOWN');
      expect(updateCountdown.countdown).toBe(2);
      expect(pauseBattle.type).toBe('PAUSE_BATTLE');
      expect(resumeBattle.type).toBe('RESUME_BATTLE');
      expect(resetBattle.type).toBe('RESET_BATTLE');
    });
  });
}); 