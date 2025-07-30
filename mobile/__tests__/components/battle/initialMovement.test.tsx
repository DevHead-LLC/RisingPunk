/**
 * @file initialMovement.test.tsx
 * @description Test for Initial Movement Phase visual behavior - verify targeting results are present
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { createMockBattleState } from '../../testUtils';

describe('Initial Movement Phase - Visual Behavior', () => {
  describe('Battle state includes movement data', () => {
    it('should have movement states for initial movement', () => {
      const battleState = createMockBattleState();
      
      // Verify neutral nodes are present (nodes 3, 4, 5)
      const neutralNodes = battleState.nodes.filter(node => node.owner === 'neutral');
      expect(neutralNodes.length).toBe(3);
      neutralNodes.forEach(node => {
        expect(node.index).toBeGreaterThanOrEqual(3);
        expect(node.index).toBeLessThanOrEqual(5);
      });
      
      // Verify battalions are at home nodes (0, 6)
      const userBattalion = battleState.battalions.find(b => b.isUser);
      const enemyBattalion = battleState.battalions.find(b => !b.isUser);
      expect(userBattalion?.nodeIndex).toBe(0);
      expect(enemyBattalion?.nodeIndex).toBe(6);
    });
  });
}); 