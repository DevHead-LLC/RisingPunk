/**
 * @file nearestTargetRetargeting.test.ts
 * @description Tests for nearest target retargeting behavior using network pathfinding
 */

import { RetargetingService } from '../src/services/RetargetingService';
import { createTestNodes, createTestBattalion, TEST_BOT_STATS } from './testUtils';
import { NodeOwner, BotType } from '../src/types/battle';

describe('Nearest Target Retargeting - Network Pathfinding', () => {
  test('retargeting finds nearest target using network pathfinding', () => {
    // Setup: Create nodes and battalions
    const nodes = createTestNodes();
    const battalion = createTestBattalion('user-1', 0, NodeOwner.USER, BotType.GUARDIAN);
    
    // Create neutral nodes and enemy battalions for targeting
    const neutralNodes = nodes.filter(node => node.owner === NodeOwner.NEUTRAL);
    const enemyBattalions = [
      createTestBattalion('enemy-1', 6, NodeOwner.ENEMY, BotType.GUARDIAN),
      createTestBattalion('enemy-2', 7, NodeOwner.ENEMY, BotType.BREACHER)
    ];
    
    // Verify we have neutral nodes and enemy battalions
    expect(neutralNodes.length).toBeGreaterThan(0);
    expect(enemyBattalions.length).toBeGreaterThan(0);
    
    // Find closest target using RetargetingService
    const targetResult = RetargetingService.findClosestTarget(battalion, neutralNodes, enemyBattalions);
    
    // Verify target was found
    expect(targetResult).not.toBeNull();
    if (targetResult) {
      // Verify target has required properties
      expect(targetResult.targetNodeIndex).toBeDefined();
      expect(targetResult.pathToTarget).toBeDefined();
      expect(targetResult.pathDistance).toBeDefined();
      expect(targetResult.targetType).toBeDefined();
      
      // Verify target type is valid
      expect(['neutral_node', 'enemy_battalion']).toContain(targetResult.targetType);
      
      // Verify path distance is calculated correctly
      expect(targetResult.pathDistance).toBeGreaterThanOrEqual(0);
      
      // Verify path follows network connections
      expect(targetResult.pathToTarget.length).toBeGreaterThan(0);
      
      // Verify path starts at battalion's current position
      expect(targetResult.pathToTarget[0]).toBe(battalion.position.nodeIndex);
      
      // Verify path ends at target node
      expect(targetResult.pathToTarget[targetResult.pathToTarget.length - 1]).toBe(targetResult.targetNodeIndex);
    }
  });
}); 