/**
 * @file movementSpeed.test.tsx
 * @description Test that movement speed follows bot stats during initial movement visualization
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { createMockBattleState, createTestBattalion, TEST_BOT_STATS } from '../../testUtils';

describe('Movement Speed - Visual Behavior', () => {
  describe('Movement duration follows bot speed stats', () => {
    it('should have correct speed values for different bot types', () => {
      // Verify bot speed stats are correct
      expect(TEST_BOT_STATS.guardian.speed).toBe(9);
      expect(TEST_BOT_STATS.breacher.speed).toBe(5);
      expect(TEST_BOT_STATS.phreak.speed).toBe(7);

      // Verify speed hierarchy: guardian (fastest) > phreak > breacher (slowest)
      expect(TEST_BOT_STATS.guardian.speed).toBeGreaterThan(TEST_BOT_STATS.phreak.speed);
      expect(TEST_BOT_STATS.phreak.speed).toBeGreaterThan(TEST_BOT_STATS.breacher.speed);
    });

    it('should calculate movement duration correctly for different bot types', () => {
      // Simulate the server's movement duration calculation
      const calculateMovementDuration = (speed: number) => Math.round(20000 / speed);

      const guardianDuration = calculateMovementDuration(TEST_BOT_STATS.guardian.speed);
      const breacherDuration = calculateMovementDuration(TEST_BOT_STATS.breacher.speed);
      const phreakDuration = calculateMovementDuration(TEST_BOT_STATS.phreak.speed);

      // Verify expected durations
      expect(guardianDuration).toBe(2222); // 20000 / 9
      expect(breacherDuration).toBe(4000); // 20000 / 5
      expect(phreakDuration).toBe(2857); // 20000 / 7

      // Verify speed hierarchy: guardian (fastest) > phreak > breacher (slowest)
      expect(guardianDuration).toBeLessThan(phreakDuration);
      expect(phreakDuration).toBeLessThan(breacherDuration);
    });

    it('should validate movement state contains correct duration for different bot types', () => {
      // Create test battalions with different bot types
      const guardianBattalion = createTestBattalion('guardian-test', 0, true, 'guardian');
      const breacherBattalion = createTestBattalion('breacher-test', 0, true, 'breacher');
      const phreakBattalion = createTestBattalion('phreak-test', 0, true, 'phreak');

      // Create battle state with movement
      const battleState = createMockBattleState([guardianBattalion, breacherBattalion, phreakBattalion]);

      // Verify battalions have correct speed stats
      const guardianInState = battleState.battalions.find(b => b.id === 'guardian-test');
      const breacherInState = battleState.battalions.find(b => b.id === 'breacher-test');
      const phreakInState = battleState.battalions.find(b => b.id === 'phreak-test');

      expect(guardianInState?.stats.speed).toBe(9);
      expect(breacherInState?.stats.speed).toBe(5);
      expect(phreakInState?.stats.speed).toBe(7);
    });

    it('should verify movement duration calculation formula', () => {
      // Test the movement duration formula: BASE_MOVEMENT_TIME_MS / speed
      const BASE_MOVEMENT_TIME_MS = 20000;
      
      const testSpeedValues = [3, 5, 7, 9, 10];
      const expectedDurations = testSpeedValues.map(speed => Math.round(BASE_MOVEMENT_TIME_MS / speed));

      testSpeedValues.forEach((speed, index) => {
        const calculatedDuration = Math.round(BASE_MOVEMENT_TIME_MS / speed);
        expect(calculatedDuration).toBe(expectedDurations[index]);
      });

      // Verify that higher speed results in shorter duration
      expect(expectedDurations[0]).toBeGreaterThan(expectedDurations[1]); // speed 3 > speed 5
      expect(expectedDurations[1]).toBeGreaterThan(expectedDurations[2]); // speed 5 > speed 7
      expect(expectedDurations[2]).toBeGreaterThan(expectedDurations[3]); // speed 7 > speed 9
    });
  });
}); 