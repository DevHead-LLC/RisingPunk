/**
 * @file initialMovement.test.ts
 * @description Test for Initial Movement Phase - battalions randomly pick neutral nodes
 */

import { TargetingService } from '../src/services/TargetingService';
import { createTestBattalion, createTestNodes } from './testUtils';
import { NodeOwner } from '../src/types/battle';

describe('Initial Movement Phase', () => {
  describe('Battalions randomly pick neutral nodes', () => {
    it('should assign random neutral nodes to battalions', () => {
      // Create test battalions at home nodes (0,1,2 for user, 6,7,8 for enemy)
      const testBattalions = [
        createTestBattalion('user-battalion-1', 0),
        createTestBattalion('enemy-battalion-1', 6, NodeOwner.ENEMY)
      ];

      // Create test nodes with neutral nodes 3,4,5
      const testNodes = createTestNodes();

      // Test 1: Verify neutral nodes are selected
      const targetingResults = TargetingService.assignInitialTargets(testBattalions, testNodes);
      
      // All battalions should have valid targets
      expect(targetingResults.length).toBe(2);
      targetingResults.forEach(result => {
        expect(result.isValidTarget).toBe(true);
        expect(result.targetNode).toBeGreaterThanOrEqual(3);
        expect(result.targetNode).toBeLessThanOrEqual(5);
      });

      // Test 2: Verify randomness (run multiple times to check different selections)
      const targetSelections: number[] = [];
      for (let i = 0; i < 10; i++) {
        const results = TargetingService.assignInitialTargets(testBattalions, testNodes);
        const userTarget = results.find(r => r.battalionOwner === NodeOwner.USER)?.targetNode;
        if (userTarget) targetSelections.push(userTarget);
      }

      // Should have some variation in target selection (not always the same node)
      const uniqueTargets = new Set(targetSelections);
      expect(uniqueTargets.size).toBeGreaterThan(1);
    });
  });
}); 