/**
 * @file nodeCaptureRetargeting.test.ts
 * @description Tests for node capture and retargeting behavior
 */

import { CombatService } from '../src/services/CombatService';
import { createTestNodes, createTestBattalion, TEST_BOT_STATS } from './testUtils';
import { NodeOwner, BotType } from '../src/types/battle';

describe('Node Capture and Retargeting', () => {
  test('captured node becomes un-attackable and owned by capturing party', () => {
    // Setup: Create a neutral node and user battalion
    const nodes = createTestNodes();
    const neutralNode = nodes[3]; // Node 3 (neutral)
    const userBattalion = createTestBattalion('user-1', 0, NodeOwner.USER, BotType.GUARDIAN);
    
    // Verify initial state
    expect(neutralNode.owner).toBe(NodeOwner.NEUTRAL);
    expect(neutralNode.tugOfWarProgress).toBe(0);
    expect(CombatService.canTargetNode(neutralNode)).toBe(true);
    
    // Apply enough damage to capture the node (100% of maxCaptureThreshold)
    const captureDamage = neutralNode.maxCaptureThreshold; // 1000 damage
    const wasCaptured = CombatService.applyTugOfWarDamage(neutralNode, captureDamage, NodeOwner.USER);
    
    // Verify node capture behavior
    expect(wasCaptured).toBe(true);
    expect(neutralNode.owner).toBe(NodeOwner.USER);
    expect(neutralNode.tugOfWarProgress).toBe(100);
    expect(CombatService.canTargetNode(neutralNode)).toBe(false); // Node is now un-attackable
    expect(CombatService.isNodeCaptured(neutralNode)).toBe(true);
  });
}); 