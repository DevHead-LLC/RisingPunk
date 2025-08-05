import { BattalionService } from '../src/services/BattalionService';
import { createNodesWithTugOfWar } from '../src/services/NodeService';

describe('Battalion Spawning Consistency', () => {
  let nodes: any[];

  beforeEach(() => {
    nodes = createNodesWithTugOfWar(0, 800, 600);
  });

  test('should use random spawn for both user and enemy battalions', () => {
    // Both user and enemy battalions now use random spawn
    // User battalions: random selection from nodes 0, 1, 2
    // Enemy battalions: random selection from nodes 6, 7, 8
    
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);

    // User battalions: random selection from nodes 0, 1, 2
    userBattalions.forEach((battalion) => {
      expect(battalion.position.nodeIndex).toBeGreaterThanOrEqual(0);
      expect(battalion.position.nodeIndex).toBeLessThanOrEqual(2);
      expect(battalion.owner).toBe('user');
    });

    // Enemy battalions: random selection from nodes 6, 7, 8
    enemyBattalions.forEach((battalion) => {
      expect(battalion.position.nodeIndex).toBeGreaterThanOrEqual(6);
      expect(battalion.position.nodeIndex).toBeLessThanOrEqual(8);
      expect(battalion.owner).toBe('enemy');
    });
  });

  test('should demonstrate consistent random spawn behaviors', () => {
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);

    // Both user and enemy battalions: random spawn (can vary each time)
    
    // Test that user battalions use valid user nodes
    const userNodeIndices = userBattalions.map(b => b.position.nodeIndex);
    userNodeIndices.forEach(nodeIndex => {
      expect(nodeIndex).toBeGreaterThanOrEqual(0);
      expect(nodeIndex).toBeLessThanOrEqual(2);
    });

    // Test that enemy battalions use valid enemy nodes
    const enemyNodeIndices = enemyBattalions.map(b => b.position.nodeIndex);
    enemyNodeIndices.forEach(nodeIndex => {
      expect(nodeIndex).toBeGreaterThanOrEqual(6);
      expect(nodeIndex).toBeLessThanOrEqual(8);
    });
  });

  test('should allow multiple battalions at same node for both sides', () => {
    // Test that both user and enemy battalions can share nodes (random spawn)
    
    // Test user battalions
    let foundUserSharedNode = false;
    const maxAttempts = 20;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const testUserBattalions = BattalionService.createUserBattalions(nodes);
      const userNodeIndices = testUserBattalions.map(b => b.position.nodeIndex);
      const uniqueUserNodes = new Set(userNodeIndices);
      
      if (uniqueUserNodes.size < testUserBattalions.length) {
        foundUserSharedNode = true;
        break;
      }
    }
    
    // Test enemy battalions
    let foundEnemySharedNode = false;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const testEnemyBattalions = BattalionService.createEnemyBattalions(nodes);
      const enemyNodeIndices = testEnemyBattalions.map(b => b.position.nodeIndex);
      const uniqueEnemyNodes = new Set(enemyNodeIndices);
      
      if (uniqueEnemyNodes.size < testEnemyBattalions.length) {
        foundEnemySharedNode = true;
        break;
      }
    }
    
    // With random spawn, should eventually find shared nodes for both sides
    expect(foundUserSharedNode).toBe(true);
    expect(foundEnemySharedNode).toBe(true);
  });
}); 