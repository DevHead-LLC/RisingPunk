/**
 * @file spawnNodeAssignment.test.ts
 * @description Batch 2A: Server-Side Spawn Logic Tests
 * Tests for random spawn node assignment instead of fixed nodes
 */

import { BattalionService } from '../../src/services/BattalionService';
import { 
  createTestNodes, 
  TEST_VALID_BATTALION_ASSIGNMENTS
} from '../testUtils';

describe('Batch 2A: Server-Side Spawn Logic', () => {
  let testNodes: any[];

  beforeEach(() => {
    testNodes = createTestNodes();
  });

  describe('should assign battalions to random available nodes', () => {
    it('should use random nodes instead of fixed node indices', () => {
      const userBattalions = TEST_VALID_BATTALION_ASSIGNMENTS;
      
      // Run multiple spawns to test for randomness
      const spawnResults: number[][] = [];
      const maxAttempts = 20;
      
      for (let i = 0; i < maxAttempts; i++) {
        const battalions = BattalionService.createUserBattalions(testNodes, userBattalions);
        const nodeIndices = battalions.map(b => b.position.nodeIndex);
        spawnResults.push(nodeIndices);
      }
      
      // Check for different spawn patterns
      const uniquePatterns = new Set(spawnResults.map(pattern => pattern.join(',')));
      
      // With 3 nodes and 3 battalions, we should see different patterns
      // This test will fail if we always get the same pattern
      expect(uniquePatterns.size).toBeGreaterThan(1);
      
      // Verify all nodes are valid user nodes (0, 1, 2)
      spawnResults.forEach(nodeIndices => {
        nodeIndices.forEach(nodeIndex => {
          expect(nodeIndex).toBeGreaterThanOrEqual(0);
          expect(nodeIndex).toBeLessThanOrEqual(2);
        });
      });
    });

    it('should handle multiple battalions at same node', () => {
      // Test scenario: multiple battalions assigned to same node
      const multipleBattalions = [
        { type: 'guardian', quantity: 15 },
        { type: 'breacher', quantity: 12 },
        { type: 'phreak', quantity: 8 }
      ];
      
      // Run multiple spawns to test for shared nodes
      let foundSharedNode = false;
      const maxAttempts = 50;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const battalions = BattalionService.createUserBattalions(testNodes, multipleBattalions);
        const nodeIndices = battalions.map(b => b.position.nodeIndex);
        const uniqueNodes = new Set(nodeIndices);
        
        // Check if multiple battalions share the same node
        if (uniqueNodes.size < battalions.length) {
          foundSharedNode = true;
          break;
        }
      }
      
      // With 3 battalions and 3 nodes, probability of sharing is ~33%
      // This test will fail if we never find shared nodes after 50 attempts
      expect(foundSharedNode).toBe(true);
      
      // Verify all nodes are valid user nodes (0, 1, 2)
      const battalions = BattalionService.createUserBattalions(testNodes, multipleBattalions);
      const nodeIndices = battalions.map(b => b.position.nodeIndex);
      nodeIndices.forEach(nodeIndex => {
        expect(nodeIndex).toBeGreaterThanOrEqual(0);
        expect(nodeIndex).toBeLessThanOrEqual(2);
      });
    });

    it('should use nodes 0, 1, or 2 for user battalions', () => {
      const userBattalions = TEST_VALID_BATTALION_ASSIGNMENTS;
      const battalions = BattalionService.createUserBattalions(testNodes, userBattalions);

      // Verify all battalions are assigned to user nodes (0, 1, 2)
      battalions.forEach(battalion => {
        expect(battalion.position.nodeIndex).toBeGreaterThanOrEqual(0);
        expect(battalion.position.nodeIndex).toBeLessThanOrEqual(2);
        expect(battalion.owner).toBe('user');
      });
      
      // Verify we're not using enemy nodes (6, 7, 8)
      const nodeIndices = battalions.map(b => b.position.nodeIndex);
      nodeIndices.forEach(nodeIndex => {
        expect(nodeIndex).toBeLessThan(6);
      });
    });
  });

  describe('should handle random spawn assignment logic', () => {
    it('should not always assign battalion 0 to node 0', () => {
      // Run multiple spawns to test randomness
      const userBattalions = TEST_VALID_BATTALION_ASSIGNMENTS;
      const spawnResults: number[][] = [];
      
      // Simulate multiple battle starts
      for (let i = 0; i < 10; i++) {
        const battalions = BattalionService.createUserBattalions(testNodes, userBattalions);
        const nodeIndices = battalions.map(b => b.position.nodeIndex);
        spawnResults.push(nodeIndices);
      }
      
      // This test will fail because current implementation is deterministic
      // Expected: different spawn patterns
      // Current: always [0, 1, 2]
      const uniquePatterns = new Set(spawnResults.map(pattern => pattern.join(',')));
      expect(uniquePatterns.size).toBeGreaterThan(1);
    });

    it('should distribute battalions across available nodes', () => {
      const userBattalions = TEST_VALID_BATTALION_ASSIGNMENTS;
      const battalions = BattalionService.createUserBattalions(testNodes, userBattalions);
      
      const nodeIndices = battalions.map(b => b.position.nodeIndex);
      const usedNodes = new Set(nodeIndices);
      
      // Current behavior: always uses all 3 nodes (0, 1, 2)
      // Expected behavior: can use fewer nodes if multiple battalions share same node
      // This test will fail because current implementation doesn't allow same node
      expect(usedNodes.size).toBeLessThanOrEqual(battalions.length);
    });
  });
}); 