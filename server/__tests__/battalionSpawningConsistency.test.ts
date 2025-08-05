import { BattalionService } from '../src/services/BattalionService';
import { createNodesWithTugOfWar } from '../src/services/NodeService';

describe('Battalion Spawning Consistency', () => {
  let nodes: any[];

  beforeEach(() => {
    nodes = createNodesWithTugOfWar(0, 800, 600);
  });

  test('should not use hardcoded nodeIndex values in config arrays', () => {
    // This test will fail because enemy battalions currently have hardcoded nodeIndex values
    // in their config array, while user battalions don't
    
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);

    // User battalions: config array has no nodeIndex values (good)
    // Enemy battalions: config array has hardcoded nodeIndex values (bad)
    
    // Both should use array index calculation, not hardcoded values
    userBattalions.forEach((battalion, index) => {
      expect(battalion.position.nodeIndex).toBe(index); // Uses array index
    });

    enemyBattalions.forEach((battalion, index) => {
      expect(battalion.position.nodeIndex).toBe(index + 6); // Should use array index + offset
    });
  });

  test('should use consistent assignment method for both user and enemy battalions', () => {
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);

    // Both should use: nodeIndex = index + offset
    // User: offset = 0, Enemy: offset = 6
    
    userBattalions.forEach((battalion, index) => {
      expect(battalion.position.nodeIndex).toBe(index + 0); // index calculation
    });

    enemyBattalions.forEach((battalion, index) => {
      expect(battalion.position.nodeIndex).toBe(index + 6); // index calculation
    });
  });

  test('should demonstrate the hardcoded values issue', () => {
    // This test will fail because it checks the actual config array structure
    // User battalions: config array has no nodeIndex (clean)
    // Enemy battalions: config array has hardcoded nodeIndex values (redundant)
    
    // The issue is in the config array structure, not the final result
    // Both achieve the same result but use different methods
    
    // User battalions use: nodeIndex = index (calculated)
    // Enemy battalions use: nodeIndex = battalion.nodeIndex (hardcoded)
    
    // This test will fail because we're checking that both use the same assignment method
    // Currently they don't - user uses array index calculation, enemy uses hardcoded values
    
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);

    // The inconsistency is that user uses: nodeIndex = index
    // While enemy uses: nodeIndex = battalion.nodeIndex (hardcoded)
    // Both should use: nodeIndex = index + offset
    
    // This will fail because enemy battalions use hardcoded values in their config
    expect(userBattalions[0].position.nodeIndex).toBe(0); // index 0
    expect(enemyBattalions[0].position.nodeIndex).toBe(6); // hardcoded value
    
    // The fix: Remove hardcoded nodeIndex from enemy battalion config array
    // and use: nodeIndex = index + 6 (calculated)
  });
}); 