/**
 * @file selectiveRetargeting.test.ts
 * @description Tests for selective retargeting behavior - only battalions targeting captured node are affected
 */

import { AttackService } from '../src/services/AttackService';
import { CombatService } from '../src/services/CombatService';
import { createTestNodes, createTestBattalion, TEST_BOT_STATS } from './testUtils';
import { NodeOwner, BotType } from '../src/types/battle';

describe('Selective Retargeting - Only Affected Battalions', () => {
  beforeEach(() => {
    // Clear attack states before each test
    AttackService.clearAllAttacks();
  });

  test('only battalions targeting captured node are affected by capture', () => {
    // Setup: Create multiple battalions and nodes
    const nodes = createTestNodes();
    const node3 = nodes[3]; // Node 3 (neutral) - will be captured
    const node4 = nodes[4]; // Node 4 (neutral) - will remain neutral
    
    const battalion1 = createTestBattalion('user-1', 0, NodeOwner.USER, BotType.GUARDIAN);
    const battalion2 = createTestBattalion('user-2', 1, NodeOwner.USER, BotType.BREACHER);
    const battalion3 = createTestBattalion('enemy-1', 6, NodeOwner.ENEMY, BotType.PHREAK);
    
    // Start attacks on different nodes
    AttackService.startAttack(battalion1, 'node', 3); // Battalion 1 attacking node 3
    AttackService.startAttack(battalion2, 'node', 4); // Battalion 2 attacking node 4 (different node)
    AttackService.startAttack(battalion3, 'node', 3); // Battalion 3 attacking node 3 (same node as battalion 1)
    
    // Verify initial attack states
    expect(AttackService.isAttacking('user-1')).toBe(true);
    expect(AttackService.isAttacking('user-2')).toBe(true);
    expect(AttackService.isAttacking('enemy-1')).toBe(true);
    
    // Get battalions attacking node 3 specifically
    const battalionsAttackingNode3 = AttackService.getBattalionsAttackingSpecificNode(3);
    expect(battalionsAttackingNode3).toContain('user-1');
    expect(battalionsAttackingNode3).toContain('enemy-1');
    expect(battalionsAttackingNode3).not.toContain('user-2'); // Battalion 2 attacks different node
    
    // Simulate attack processing that captures node 3
    // Apply enough damage to capture the node (100% of maxCaptureThreshold)
    const captureDamage = node3.maxCaptureThreshold; // 1000 damage to capture
    const wasCaptured = CombatService.applyTugOfWarDamage(node3, captureDamage, NodeOwner.USER);
    
    if (wasCaptured) {
      // Stop all attacks on captured node (simulating processActiveAttacks behavior)
      const affectedAttackers = AttackService.getBattalionsAttackingSpecificNode(3);
      affectedAttackers.forEach(id => AttackService.stopAttacking(id));
    }
    
    // Verify node 3 is captured
    expect(node3.owner).toBe(NodeOwner.USER);
    expect(CombatService.canTargetNode(node3)).toBe(false);
    
    // Verify only battalions attacking node 3 are affected
    expect(AttackService.isAttacking('user-1')).toBe(false); // Should stop attacking captured node
    expect(AttackService.isAttacking('enemy-1')).toBe(false); // Should stop attacking captured node
    expect(AttackService.isAttacking('user-2')).toBe(true); // Should continue attacking node 4 (unchanged)
    
    // Verify node 4 is still attackable
    expect(CombatService.canTargetNode(node4)).toBe(true);
  });
}); 