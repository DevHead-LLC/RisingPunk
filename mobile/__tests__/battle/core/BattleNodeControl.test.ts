// Implementation of @battle-node-control.mdc#Node-States-and-Control
// Tests node ownership mechanics and capture system

import { NodeOwnership } from '../../../src/battle/core/types';
import { 
  getNodeOwnership, 
  calculateCaptureThreshold, 
  updateNodeControl,
  validateNetworkLine,
  getConnectedNodes,
  isNodeAccessible,
  calculateVictoryPoints,
  resolveBattle,
  resetBattleState,
  NODES
} from '../../../src/battle/core/BattleCalculations';

describe('Node Control System', () => {
  beforeEach(() => {
    // Reset battle state before each test
    resetBattleState();
  });

  // Test basic node ownership states
  describe('Node Ownership', () => {
    it('should correctly identify initial node ownership', () => {
      expect(getNodeOwnership(0)).toBe(NodeOwnership.User);
      expect(getNodeOwnership(3)).toBe(NodeOwnership.Neutral);
      expect(getNodeOwnership(6)).toBe(NodeOwnership.Enemy);
    });

    it('should throw error for invalid node index', () => {
      expect(() => getNodeOwnership(-1)).toThrow('Invalid node index');
      expect(() => getNodeOwnership(100)).toThrow('Invalid node index');
    });
  });

  // Test capture threshold calculation
  describe('Capture Threshold', () => {
    it('should calculate correct capture threshold based on total army health', () => {
      expect(calculateCaptureThreshold(1000)).toBe(750);
      expect(calculateCaptureThreshold(500)).toBe(375);
    });

    it('should throw error for invalid total health', () => {
      expect(() => calculateCaptureThreshold(0)).toThrow('Invalid total health');
      expect(() => calculateCaptureThreshold(-100)).toThrow('Invalid total health');
    });
  });

  // Test node control updates
  describe('Control Updates', () => {
    it('should update control progress when damage is dealt', () => {
      const state = updateNodeControl(3, 100, 0, 750);
      expect(state.userDamage).toBe(100);
      expect(state.enemyDamage).toBe(0);
    });

    it('should capture node when damage exceeds threshold', () => {
      const neutralNodeIndex = 3;
      const threshold = 750;

      // Initial damage below threshold
      let state = updateNodeControl(neutralNodeIndex, 100, 0, threshold);
      expect(state.ownership).toBe(NodeOwnership.Neutral);
      expect(state.userDamage).toBe(100);
      expect(state.enemyDamage).toBe(0);

      // Exceed threshold
      state = updateNodeControl(neutralNodeIndex, threshold + 100, 0, threshold);
      expect(state.ownership).toBe(NodeOwnership.User);
      expect(state.userDamage).toBeGreaterThan(threshold);
      expect(state.enemyDamage).toBe(0);
    });

    it('should reset opposing progress when node is captured', () => {
      const neutralNodeIndex = 3;
      const threshold = 750;

      // User deals some damage
      let state = updateNodeControl(neutralNodeIndex, 100, 0, threshold);
      expect(state.userDamage).toBe(100);
      expect(state.enemyDamage).toBe(0);

      // Enemy captures the node
      state = updateNodeControl(neutralNodeIndex, 0, threshold + 100, threshold);
      expect(state.ownership).toBe(NodeOwnership.Enemy);
      expect(state.userDamage).toBe(0);
      expect(state.enemyDamage).toBeGreaterThan(threshold);
    });

    it('should allow recapturing nodes', () => {
      const nodeIndex = 3;
      const threshold = 750;

      // User captures the node
      let state = updateNodeControl(nodeIndex, threshold + 100, 0, threshold);
      expect(state.ownership).toBe(NodeOwnership.User);
      
      // Enemy recaptures the node
      state = updateNodeControl(nodeIndex, 0, threshold + 200, threshold);
      expect(state.ownership).toBe(NodeOwnership.Enemy);
      expect(state.userDamage).toBe(0);
      expect(state.enemyDamage).toBeGreaterThan(threshold);
    });

    it('should update points when nodes are captured', () => {
      // Capture node 3 for user
      updateNodeControl(3, 1000, 0, 750);

      const points = calculateVictoryPoints();
      expect(points).toEqual({
        user: 4,    // 4 points (0,1,2,3)
        enemy: 3,   // 3 points (6,7,8)
        neutral: 2  // 2 points (4,5)
      });
    });
  });

  describe('Network Effects', () => {
    describe('Network Line Validation', () => {
      it('should validate direct network line between adjacent nodes', () => {
        expect(validateNetworkLine(0, 3)).toBe(true); // Adjacent nodes
        expect(validateNetworkLine(0, 1)).toBe(true); // Adjacent nodes
        expect(validateNetworkLine(0, 4)).toBe(false); // Not adjacent
      });

      it('should throw error for invalid node indices', () => {
        expect(() => validateNetworkLine(-1, 3)).toThrow('Invalid node index');
        expect(() => validateNetworkLine(0, 9)).toThrow('Invalid node index');
      });
    });

    describe('Strategic Connectivity', () => {
      it('should identify all connected nodes from a starting node', () => {
        const connectedNodes = getConnectedNodes(0);
        expect(connectedNodes).toEqual(expect.arrayContaining([1, 3]));
        expect(connectedNodes).not.toContain(4);
      });

      it('should consider node ownership in connectivity', () => {
        // Node 3 is neutral and accessible
        expect(isNodeAccessible(0, 3)).toBe(true);
        
        // Node 6 is enemy-owned and not accessible from user node
        expect(isNodeAccessible(0, 6)).toBe(false);
      });
    });
  });

  describe('Victory Conditions', () => {
    describe('Victory Point Calculation', () => {
      it('should calculate correct victory points for each side', () => {
        // Initial state: User has nodes 0,1,2, Enemy has 6,7,8, Neutral has 3,4,5
        const points = calculateVictoryPoints();
        expect(points).toEqual({
          user: 3,    // 3 points for nodes 0,1,2
          enemy: 3,   // 3 points for nodes 6,7,8
          neutral: 3  // 3 points for nodes 3,4,5
        });
      });

      it('should update points when nodes are captured', () => {
        // Capture node 3 for user
        updateNodeControl(3, 1000, 0, 750);

        const points = calculateVictoryPoints();
        expect(points).toEqual({
          user: 4,    // 4 points (0,1,2,3)
          enemy: 3,   // 3 points (6,7,8)
          neutral: 2  // 2 points (4,5)
        });
      });
    });

    describe('Battle Resolution', () => {
      it('should determine winner based on node majority', () => {
        // Setup: User captures two neutral nodes
        updateNodeControl(3, 1000, 0, 750);
        updateNodeControl(4, 1000, 0, 750);

        const result = resolveBattle();
        expect(result).toEqual({
          winner: NodeOwnership.User,
          points: {
            user: 5,    // 5 points (0,1,2,3,4)
            enemy: 3,   // 3 points (6,7,8)
            neutral: 1  // 1 point (5)
          }
        });
      });

      it('should handle tie scenarios', () => {
        // Reset to initial state
        resetBattleState();
        
        const result = resolveBattle();
        expect(result).toEqual({
          winner: NodeOwnership.Neutral, // Equal points for user and enemy
          points: {
            user: 3,
            enemy: 3,
            neutral: 3
          }
        });
      });
    });
  });
}); 