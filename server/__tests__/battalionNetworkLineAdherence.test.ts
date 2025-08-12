/**
 * @file battalionNetworkLineAdherence.test.ts
 * @description Test that battalions stay on network lines during movement calculations
 */

import { MovementCalculationService } from '../src/services/MovementCalculationService';
import { createTestBattalion, TEST_NODE_POSITIONS, isPointOnLineSegment } from './testUtils';
import { NodePosition } from '../src/types/battleTypes';

describe('Battalion Network Line Adherence', () => {
  describe('Movement calculations stay on network lines', () => {
    it('should calculate positions that lie on network connections', () => {
      // Create test battalion at node 0
      const testBattalion = createTestBattalion('test-battalion-1', 0);

      // Use shared node positions
      const nodePositions = TEST_NODE_POSITIONS;

      // Test 1: Verify attack range position calculation stays on network line
      const targetNode = 3; // Neutral node connected to battalion's node 0
      const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
        testBattalion, 
        targetNode, 
        nodePositions
      );

      // The calculated position should lie on the line between node 0 and node 3
      const node0Pos = nodePositions[0];
      const node3Pos = nodePositions[3];
      
      // Calculate if the position lies on the line segment between nodes
      const isOnLine = isPointOnLineSegment(
        attackRangePosition,
        node0Pos,
        node3Pos
      );

      expect(isOnLine).toBe(true);
      expect(attackRangePosition.x).toBeGreaterThanOrEqual(Math.min(node0Pos.x, node3Pos.x));
      expect(attackRangePosition.x).toBeLessThanOrEqual(Math.max(node0Pos.x, node3Pos.x));
      expect(attackRangePosition.y).toBeGreaterThanOrEqual(Math.min(node0Pos.y, node3Pos.y));
      expect(attackRangePosition.y).toBeLessThanOrEqual(Math.max(node0Pos.y, node3Pos.y));
    });

    it('should interpolate positions along network lines', () => {
      const startPos: NodePosition = { x: 100, y: 100 }; // Node 0
      const targetPos: NodePosition = { x: 400, y: 100 }; // Node 3
      
      // Test interpolation at 50% progress
      const midPosition = MovementCalculationService.interpolateAlongNetworkLine(
        startPos, 
        targetPos, 
        0.5
      );

      // Should be exactly halfway between start and target
      expect(midPosition.x).toBe(250); // (100 + 400) / 2
      expect(midPosition.y).toBe(100); // Same y coordinate
      
      // Verify it lies on the line segment
      const isOnLine = isPointOnLineSegment(midPosition, startPos, targetPos);
      expect(isOnLine).toBe(true);
    });
  });
}); 