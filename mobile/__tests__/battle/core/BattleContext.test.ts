// Implementation of @battle-core-mechanics.mdc#Battle-Flow
// Tests battle context management including phases, state transitions, and timer handling

import { 
  BattlePhase,
  BattleContext,
  createBattleContext,
  updateBattleState,
  BattleTimer,
  BattleStateError,
  BattalionState,
  NodeState
} from '../../../src/battle/core/BattleContext';

// Import PHASE_DURATIONS from BattleContext
const PHASE_DURATIONS: Record<BattlePhase, number> = {
  [BattlePhase.PRE_BATTLE]: 3,
  [BattlePhase.ACTIVE_BATTLE]: 20,
  [BattlePhase.RESULTS]: 0
};

describe('Battle Context', () => {
  let battleContext: BattleContext;

  beforeEach(() => {
    battleContext = createBattleContext();
  });

  describe('Battle Phases', () => {
    it('should initialize in PRE_BATTLE phase', () => {
      expect(battleContext.currentPhase).toBe(BattlePhase.PRE_BATTLE);
      expect(battleContext.timer.duration).toBe(3); // 3 seconds pre-battle
    });

    it('should transition from PRE_BATTLE to ACTIVE_BATTLE', () => {
      const state = updateBattleState(battleContext, { elapsedTime: 3 });
      expect(state.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);
      expect(state.timer.duration).toBe(20); // 20 seconds active battle
    });

    it('should transition to RESULTS phase after battle duration', () => {
      let state = updateBattleState(battleContext, { elapsedTime: 3 }); // Pre-battle -> Active
      state = updateBattleState(state, { elapsedTime: 23 }); // Active + 20 seconds
      expect(state.currentPhase).toBe(BattlePhase.RESULTS);
    });

    it('should prevent invalid phase transitions', () => {
      expect(() => 
        updateBattleState(battleContext, { 
          elapsedTime: 0,
          forcedPhase: BattlePhase.RESULTS 
        })
      ).toThrow(BattleStateError);
    });

    it('should handle forced phase transitions when valid', () => {
      const state = updateBattleState(battleContext, {
        elapsedTime: 0,
        forcedPhase: BattlePhase.ACTIVE_BATTLE
      });
      expect(state.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);
    });

    it('should maintain phase if elapsed time is insufficient', () => {
      const state = updateBattleState(battleContext, { elapsedTime: 1 });
      expect(state.currentPhase).toBe(BattlePhase.PRE_BATTLE);
    });
  });

  describe('Timer Management', () => {
    it('should properly update timer values', () => {
      const state = updateBattleState(battleContext, { elapsedTime: 2 });
      expect(state.timer.elapsed).toBe(2);
      expect(state.timer.remaining).toBe(1); // 3 - 2 = 1 second remaining
    });

    it('should handle timer updates across phase transitions', () => {
      let state = updateBattleState(battleContext, { elapsedTime: 3 }); // End of PRE_BATTLE
      expect(state.timer.elapsed).toBe(3);
      expect(state.timer.duration).toBe(20); // ACTIVE_BATTLE duration
      expect(state.timer.remaining).toBe(20); // Full ACTIVE_BATTLE duration

      state = updateBattleState(state, { elapsedTime: 13 }); // 10 seconds into ACTIVE_BATTLE
      expect(state.timer.remaining).toBe(10); // 20 - 10 = 10 seconds remaining
    });

    it('should handle timer at phase boundaries', () => {
      let state = updateBattleState(battleContext, { elapsedTime: 2.9 });
      expect(state.currentPhase).toBe(BattlePhase.PRE_BATTLE);
      
      state = updateBattleState(battleContext, { elapsedTime: 3.1 });
      expect(state.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);
    });
  });

  describe('Battalion State Management', () => {
    const testBattalion: BattalionState = {
      id: 'test-battalion',
      health: 100,
      position: { x: 0, y: 0 }
    };

    it('should add and update battalion state', () => {
      let state = updateBattleState(battleContext, {
        battalionUpdates: [testBattalion]
      });
      expect(state.battalions.get(testBattalion.id)).toBeDefined();
      expect(state.battalions.get(testBattalion.id)?.health).toBe(100);

      state = updateBattleState(state, {
        battalionUpdates: [{
          id: testBattalion.id,
          health: 80
        }]
      });
      expect(state.battalions.get(testBattalion.id)?.health).toBe(80);
    });

    it('should handle partial battalion updates', () => {
      let state = updateBattleState(battleContext, {
        battalionUpdates: [testBattalion]
      });

      state = updateBattleState(state, {
        battalionUpdates: [{
          id: testBattalion.id,
          position: { x: 100, y: 100 }
        }]
      });

      const updated = state.battalions.get(testBattalion.id);
      expect(updated?.health).toBe(100); // Unchanged
      expect(updated?.position).toEqual({ x: 100, y: 100 }); // Updated
    });

    it('should prevent negative health values', () => {
      let state = updateBattleState(battleContext, {
        battalionUpdates: [testBattalion]
      });

      expect(() => 
        updateBattleState(state, {
          battalionUpdates: [{
            id: testBattalion.id,
            health: -10
          }]
        })
      ).toThrow(BattleStateError);
    });

    it('should maintain existing state on invalid updates', () => {
      let state = updateBattleState(battleContext, {
        battalionUpdates: [testBattalion]
      });

      try {
        state = updateBattleState(state, {
          battalionUpdates: [{
            id: testBattalion.id,
            health: -10
          }]
        });
      } catch (error) {
        // State should remain unchanged
        expect(state.battalions.get(testBattalion.id)?.health).toBe(100);
      }
    });
  });

  describe('Node State Management', () => {
    const testNode: NodeState = {
      id: 'test-node',
      health: 100,
      owner: 'team1'
    };

    it('should add and update node state', () => {
      let state = updateBattleState(battleContext, {
        nodeUpdates: [testNode]
      });
      expect(state.nodes.get(testNode.id)).toBeDefined();
      expect(state.nodes.get(testNode.id)?.health).toBe(100);
      expect(state.nodes.get(testNode.id)?.owner).toBe('team1');

      state = updateBattleState(state, {
        nodeUpdates: [{
          id: testNode.id,
          health: 80,
          owner: 'team2'
        }]
      });
      
      const updated = state.nodes.get(testNode.id);
      expect(updated?.health).toBe(80);
      expect(updated?.owner).toBe('team2');
    });

    it('should handle partial node updates', () => {
      let state = updateBattleState(battleContext, {
        nodeUpdates: [testNode]
      });

      state = updateBattleState(state, {
        nodeUpdates: [{
          id: testNode.id,
          owner: 'team2'
        }]
      });

      const updated = state.nodes.get(testNode.id);
      expect(updated?.health).toBe(100); // Unchanged
      expect(updated?.owner).toBe('team2'); // Updated
    });
  });

  describe('Error Handling', () => {
    it('should handle missing battalion updates gracefully', () => {
      const state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'non-existent',
          health: 100
        }]
      });
      expect(state.battalions.size).toBe(0);
    });

    it('should handle missing node updates gracefully', () => {
      const state = updateBattleState(battleContext, {
        nodeUpdates: [{
          id: 'non-existent',
          health: 100
        }]
      });
      expect(state.nodes.size).toBe(0);
    });

    it('should include context in BattleStateError', () => {
      try {
        updateBattleState(battleContext, {
          forcedPhase: BattlePhase.RESULTS
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error instanceof BattleStateError).toBe(true);
        if (error instanceof BattleStateError) {
          expect(error.context).toHaveProperty('currentPhase');
          expect(error.context).toHaveProperty('nextPhase');
        }
      }
    });

    it('should handle multiple error conditions', () => {
      const testBattalion: BattalionState = {
        id: 'test-battalion',
        health: 100,
        position: { x: 0, y: 0 }
      };

      let state = updateBattleState(battleContext, {
        battalionUpdates: [testBattalion]
      });

      try {
        state = updateBattleState(state, {
          forcedPhase: BattlePhase.RESULTS,
          battalionUpdates: [{
            id: testBattalion.id,
            health: -10
          }]
        });
        fail('Should have thrown error');
      } catch (error) {
        // State should remain unchanged
        expect(state.currentPhase).toBe(BattlePhase.PRE_BATTLE);
        expect(state.battalions.get(testBattalion.id)?.health).toBe(100);
      }
    });
  });

  describe('Time Validation', () => {
    it('should throw error when time moves backwards', () => {
      let state = updateBattleState(battleContext, { elapsedTime: 2 });
      expect(() => 
        updateBattleState(state, { elapsedTime: 1 })
      ).toThrow(BattleStateError);
    });

    it('should handle exact phase transition times', () => {
      // Test PRE_BATTLE -> ACTIVE_BATTLE at exactly 3 seconds
      let state = updateBattleState(battleContext, { elapsedTime: 3 });
      expect(state.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);
      expect(state.timer.remaining).toBe(20);

      // Test ACTIVE_BATTLE -> RESULTS at exactly 23 seconds
      state = updateBattleState(state, { elapsedTime: 23 });
      expect(state.currentPhase).toBe(BattlePhase.RESULTS);
      expect(state.timer.remaining).toBe(0);
    });
  });

  describe('State Update Validation', () => {
    it('should handle undefined values in battalion updates', () => {
      const state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'test-battalion',
          health: undefined,
          position: undefined
        }]
      });
      expect(state.battalions.size).toBe(0);
    });

    it('should handle undefined values in node updates', () => {
      const state = updateBattleState(battleContext, {
        nodeUpdates: [{
          id: 'test-node',
          health: undefined,
          owner: undefined
        }]
      });
      expect(state.nodes.size).toBe(0);
    });

    it('should maintain existing state after failed updates', () => {
      // Set up initial state
      let state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'test-battalion',
          health: 100,
          position: { x: 0, y: 0 }
        }]
      });

      // Attempt invalid update
      try {
        state = updateBattleState(state, {
          battalionUpdates: [{
            id: 'test-battalion',
            health: -10,
            position: { x: 100, y: 100 }
          }]
        });
      } catch (error) {
        // Verify state remains unchanged
        const battalion = state.battalions.get('test-battalion');
        expect(battalion?.health).toBe(100);
        expect(battalion?.position).toEqual({ x: 0, y: 0 });
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from invalid phase transitions', () => {
      try {
        updateBattleState(battleContext, { forcedPhase: BattlePhase.RESULTS });
      } catch (error) {
        // Verify original state maintained
        expect(battleContext.currentPhase).toBe(BattlePhase.PRE_BATTLE);
        expect(battleContext.timer.elapsed).toBe(0);
      }
    });

    it('should log errors when logger is provided', () => {
      const mockLogger = jest.fn();
      const contextWithLogger = {
        ...battleContext,
        logger: mockLogger
      };

      try {
        updateBattleState(contextWithLogger, { forcedPhase: BattlePhase.RESULTS });
      } catch (error) {
        expect(mockLogger).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'error',
            message: expect.stringContaining('Invalid phase transition'),
            context: expect.any(Object)
          })
        );
      }
    });
  });
}); 