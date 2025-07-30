/**
 * @file movementSpeed.test.ts
 * @description Test that movement speed follows bot stats during initial movement
 */

import { MovementCalculationService } from '../src/services/MovementCalculationService';
import { createTestBattalion, TEST_BOT_STATS } from './testUtils';
import { NodeOwner, BotType } from '../src/types/battle';

describe('Movement Speed - Initial Movement', () => {
  describe('Movement duration follows bot speed stats', () => {
    it('should calculate correct movement duration for different bot types', () => {
      // Create test battalions with different bot types
      const guardianBattalion = createTestBattalion('guardian-test', 0, NodeOwner.USER, BotType.GUARDIAN);
      const breacherBattalion = createTestBattalion('breacher-test', 0, NodeOwner.USER, BotType.BREACHER);
      const phreakBattalion = createTestBattalion('phreak-test', 0, NodeOwner.USER, BotType.PHREAK);

      // Calculate movement durations
      const guardianDuration = MovementCalculationService.calculateMovementDuration(guardianBattalion);
      const breacherDuration = MovementCalculationService.calculateMovementDuration(breacherBattalion);
      const phreakDuration = MovementCalculationService.calculateMovementDuration(phreakBattalion);

      // Verify durations match expected calculations
      // Base movement time: 20000ms, guardian speed: 9, breacher speed: 5, phreak speed: 7
      const expectedGuardianDuration = Math.round(20000 / TEST_BOT_STATS.guardian.speed); // 2222ms
      const expectedBreacherDuration = Math.round(20000 / TEST_BOT_STATS.breacher.speed); // 4000ms
      const expectedPhreakDuration = Math.round(20000 / TEST_BOT_STATS.phreak.speed); // 2857ms

      expect(guardianDuration).toBe(expectedGuardianDuration);
      expect(breacherDuration).toBe(expectedBreacherDuration);
      expect(phreakDuration).toBe(expectedPhreakDuration);

      // Verify speed hierarchy: guardian (fastest) > phreak > breacher (slowest)
      expect(guardianDuration).toBeLessThan(phreakDuration);
      expect(phreakDuration).toBeLessThan(breacherDuration);
    });

    it('should use correct bot speed values from stats', () => {
      // Verify bot speed stats are correct
      expect(TEST_BOT_STATS.guardian.speed).toBe(9);
      expect(TEST_BOT_STATS.breacher.speed).toBe(5);
      expect(TEST_BOT_STATS.phreak.speed).toBe(7);

      // Verify speed affects duration inversely (higher speed = shorter duration)
      const guardianBattalion = createTestBattalion('guardian-test', 0, NodeOwner.USER, BotType.GUARDIAN);
      const breacherBattalion = createTestBattalion('breacher-test', 0, NodeOwner.USER, BotType.BREACHER);

      const guardianDuration = MovementCalculationService.calculateMovementDuration(guardianBattalion);
      const breacherDuration = MovementCalculationService.calculateMovementDuration(breacherBattalion);

      // Guardian has higher speed (9) than breacher (5), so should have shorter duration
      expect(guardianDuration).toBeLessThan(breacherDuration);
    });

    it('should calculate movement duration using base movement time and battalion speed', () => {
      const battalion = createTestBattalion('test-battalion', 0, NodeOwner.USER, BotType.GUARDIAN);
      
      // Get movement config to verify base time
      const movementConfig = MovementCalculationService.getMovementConfig();
      expect(movementConfig.BASE_MOVEMENT_TIME_MS).toBe(20000);

      // Calculate duration manually to verify formula
      const expectedDuration = Math.round(movementConfig.BASE_MOVEMENT_TIME_MS / battalion.stats.speed);
      const actualDuration = MovementCalculationService.calculateMovementDuration(battalion);

      expect(actualDuration).toBe(expectedDuration);
    });
  });
}); 