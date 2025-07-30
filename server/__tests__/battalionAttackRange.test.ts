/**
 * @file battalionAttackRange.test.ts
 * @description Test that battalions stop at their attack range when targeting nodes
 */

import { MovementCalculationService } from '../src/services/MovementCalculationService';
import { createTestBattalion, TEST_NODE_POSITIONS, TEST_BOT_STATS } from './testUtils';
import { NodePosition } from '../../mobile/src/types/battleTypes';
import { NodeOwner, BotType } from '../src/types/battle';

describe('Battalion Attack Range', () => {
  describe('Battalions stop at attack range distance', () => {
    it('should calculate attack range positions correctly for different bot types', () => {
      // Test guardian (range: 4)
      const guardianBattalion = createTestBattalion('guardian-test', 0, NodeOwner.USER, BotType.GUARDIAN);
      const guardianRangeInPixels = guardianBattalion.stats.range * 8; // 4 * 8 = 32 pixels
      
      // Test phreak (range: 9) 
      const phreakBattalion = createTestBattalion('phreak-test', 0, NodeOwner.USER, BotType.PHREAK);
      const phreakRangeInPixels = phreakBattalion.stats.range * 8; // 9 * 8 = 72 pixels
      
      // Test breacher (range: 5)
      const breacherBattalion = createTestBattalion('breacher-test', 0, NodeOwner.USER, BotType.BREACHER);
      const breacherRangeInPixels = breacherBattalion.stats.range * 8; // 5 * 8 = 40 pixels
      
      // Verify range calculations match bot stats
      expect(guardianRangeInPixels).toBe(32);
      expect(phreakRangeInPixels).toBe(72);
      expect(breacherRangeInPixels).toBe(40);
    });

    it('should stop at attack range distance from target node', () => {
      // Create battalion at node 0 targeting node 3
      const battalion = createTestBattalion('test-battalion', 0, NodeOwner.USER, BotType.GUARDIAN);
      const targetNode = 3;
      
      // Calculate attack range position
      const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
        battalion, 
        targetNode, 
        TEST_NODE_POSITIONS
      );
      
      // Calculate distance from attack position to target
      const distanceToTarget = MovementCalculationService.calculateNetworkDistance(
        attackRangePosition,
        TEST_NODE_POSITIONS[targetNode]
      );
      
      // Battalion should stop at exactly its attack range distance
      const expectedRange = battalion.stats.range * 8; // 32 pixels for guardian
      expect(distanceToTarget).toBeCloseTo(expectedRange, 1);
      
      // Verify position is on the network line between nodes 0 and 3
      const startPos = TEST_NODE_POSITIONS[0];
      const targetPos = TEST_NODE_POSITIONS[targetNode];
      const isOnLine = isPointOnLineSegment(attackRangePosition, startPos, targetPos);
      expect(isOnLine).toBe(true);
    });

    it('should move to attack range position when target is out of range', () => {
      // Create battalion at node 0 targeting node 3 (connected via network, guardian range is 32 pixels)
      const battalion = createTestBattalion('test-battalion', 0, NodeOwner.USER, BotType.GUARDIAN);
      const targetNode = 3;
      
      // Calculate attack range position
      const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
        battalion, 
        targetNode, 
        TEST_NODE_POSITIONS
      );
      
      // Battalion should move to attack range position (not stay at node 0)
      // Since target is 352 pixels away and guardian range is 32 pixels, battalion should move
      expect(attackRangePosition.x).not.toBe(TEST_NODE_POSITIONS[0].x);
      // Y coordinate may be the same if both nodes are at same Y level (which they are: 155)
      // The important thing is that X coordinate changes
      
      // Verify it's at attack range distance from target
      const distanceToTarget = MovementCalculationService.calculateNetworkDistance(
        attackRangePosition,
        TEST_NODE_POSITIONS[targetNode]
      );
      const attackRange = battalion.stats.range * 8;
      expect(distanceToTarget).toBeCloseTo(attackRange, 1);
    });

    it('should verify attack range detection works correctly', () => {
      // Test guardian battalion
      const guardianBattalion = createTestBattalion('guardian-test', 0, NodeOwner.USER, BotType.GUARDIAN);
      
      // Node 3 should be out of range (352 pixels > 32 pixels)
      const isNode3InRange = MovementCalculationService.isWithinNetworkAttackRange(
        guardianBattalion,
        3,
        TEST_NODE_POSITIONS
      );
      expect(isNode3InRange).toBe(false);
      
      // Node 4 should be out of range (352 pixels > 32 pixels) - but connected via network
      const isNode4InRange = MovementCalculationService.isWithinNetworkAttackRange(
        guardianBattalion,
        4,
        TEST_NODE_POSITIONS
      );
      expect(isNode4InRange).toBe(false);
      
      // Test phreak battalion (range: 72 pixels)
      const phreakBattalion = createTestBattalion('phreak-test', 0, NodeOwner.USER, BotType.PHREAK);
      
      // Node 3 should be out of range for phreak (352 pixels > 72 pixels)
      const isNode3InRangeForPhreak = MovementCalculationService.isWithinNetworkAttackRange(
        phreakBattalion,
        3,
        TEST_NODE_POSITIONS
      );
      expect(isNode3InRangeForPhreak).toBe(false);
    });
  });
});

/**
 * Helper function to check if a point lies on a line segment
 */
function isPointOnLineSegment(point: NodePosition, lineStart: NodePosition, lineEnd: NodePosition): boolean {
  const tolerance = 0.001; // Small tolerance for floating point precision
  
  // Calculate distances
  const d1 = Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  const d2 = Math.sqrt((point.x - lineEnd.x) ** 2 + (point.y - lineEnd.y) ** 2);
  const lineLength = Math.sqrt((lineEnd.x - lineStart.x) ** 2 + (lineEnd.y - lineStart.y) ** 2);
  
  // Point is on line if sum of distances equals line length (within tolerance)
  return Math.abs(d1 + d2 - lineLength) < tolerance;
} 