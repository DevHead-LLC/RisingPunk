// Implementation of @battle-core-mechanics.mdc#Battle-Flow
// Tests battle context management including phases, state transitions, and timer handling

import { 
  BattlePhase,
  BattleContext,
  createBattleContext,
  updateBattleState,
  BattleTimer,
  BattleStateError
} from '../../../src/battle/core/BattleContext';

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
  });

  describe('Timer Management', () => {
    it('should track elapsed time correctly', () => {
      const state = updateBattleState(battleContext, { elapsedTime: 1.5 });
      expect(state.timer.elapsed).toBe(1.5);
      expect(state.timer.remaining).toBe(1.5); // 3 - 1.5 in pre-battle
    });

    it('should handle phase-specific timers', () => {
      // Pre-battle phase (3 seconds)
      let state = updateBattleState(battleContext, { elapsedTime: 1 });
      expect(state.timer.remaining).toBe(2); // 3 - 1

      // Transition to active battle (20 seconds)
      state = updateBattleState(state, { elapsedTime: 3 });
      expect(state.timer.remaining).toBe(20); // Fresh 20 seconds
      expect(state.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);
    });

    it('should prevent time moving backwards', () => {
      let state = updateBattleState(battleContext, { elapsedTime: 2 });
      expect(() => 
        updateBattleState(state, { elapsedTime: 1 })
      ).toThrow(BattleStateError);
    });
  });

  describe('State Management', () => {
    it('should maintain immutable state updates', () => {
      const initialState = battleContext;
      const updatedState = updateBattleState(initialState, { elapsedTime: 1 });
      
      expect(updatedState).not.toBe(initialState);
      expect(updatedState.timer).not.toBe(initialState.timer);
    });

    it('should track state dependencies correctly', () => {
      const state = updateBattleState(battleContext, {
        elapsedTime: 1,
        battalionUpdates: [
          { id: 'b1', health: 100, position: { x: 0, y: 0 } }
        ]
      });

      expect(state.battalions.get('b1')).toEqual({
        health: 100,
        position: { x: 0, y: 0 }
      });
    });

    it('should batch related state changes', () => {
      const state = updateBattleState(battleContext, {
        elapsedTime: 1,
        battalionUpdates: [
          { id: 'b1', health: 100, position: { x: 0, y: 0 } },
          { id: 'b2', health: 200, position: { x: 10, y: 10 } }
        ],
        nodeUpdates: [
          { id: 'n1', owner: 'user', health: 50 }
        ]
      });

      expect(state.battalions.size).toBe(2);
      expect(state.nodes.size).toBe(1);
      expect(state.updateId).toBe(1); // Single atomic update
    });

    it('should validate state transitions', () => {
      expect(() => 
        updateBattleState(battleContext, {
          elapsedTime: 1,
          battalionUpdates: [
            { id: 'b1', health: -100 } // Invalid health
          ]
        })
      ).toThrow(BattleStateError);
    });
  });

  describe('Error Handling', () => {
    it('should handle and recover from update failures', () => {
      const state = updateBattleState(battleContext, {
        elapsedTime: 1,
        battalionUpdates: [
          { id: 'b1', health: 100 }
        ]
      });

      // Simulate partial update failure
      const partialState = updateBattleState(state, {
        elapsedTime: 2,
        battalionUpdates: [
          { id: 'b1', health: 'invalid' as any } // Type error
        ]
      });

      // Should maintain previous valid state
      expect(partialState.battalions.get('b1')?.health).toBe(100);
      expect(partialState.timer.elapsed).toBe(2); // Time still advances
    });

    it('should log state errors with context', () => {
      const mockLogger = jest.fn();
      const stateWithLogger = { ...battleContext, logger: mockLogger };

      try {
        updateBattleState(stateWithLogger, {
          elapsedTime: 1,
          forcedPhase: 'invalid' as any
        });
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

  describe('Node State Management', () => {
    it('should validate node health updates', () => {
      expect(() => 
        updateBattleState(battleContext, {
          nodeUpdates: [{ id: 'n1', health: -50 }]
        })
      ).toThrow(BattleStateError);
    });

    it('should handle node ownership transitions', () => {
      let state = updateBattleState(battleContext, {
        nodeUpdates: [{ id: 'n1', owner: 'user', health: 100 }]
      });

      state = updateBattleState(state, {
        nodeUpdates: [{ id: 'n1', owner: 'enemy' }]
      });

      expect(state.nodes.get('n1')?.owner).toBe('enemy');
      expect(state.nodes.get('n1')?.health).toBe(100); // Health unchanged
    });

    it('should handle partial node updates', () => {
      const state = updateBattleState(battleContext, {
        nodeUpdates: [
          { id: 'n1', health: 100 },
          { id: 'n1', owner: 'user' }
        ]
      });

      const node = state.nodes.get('n1');
      expect(node?.health).toBe(100);
      expect(node?.owner).toBe('user');
    });
  });

  describe('Battalion Position Management', () => {
    it('should validate battalion position updates', () => {
      const state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'b1',
          health: 100,
          position: { x: 10, y: 10 }
        }]
      });

      expect(state.battalions.get('b1')?.position).toEqual({ x: 10, y: 10 });
    });

    it('should handle multiple position updates in one batch', () => {
      const state = updateBattleState(battleContext, {
        battalionUpdates: [
          { id: 'b1', health: 100, position: { x: 0, y: 0 } }
        ]
      });

      const updatedState = updateBattleState(state, {
        battalionUpdates: [{ id: 'b1', position: { x: 5, y: 5 } }]
      });

      expect(updatedState.battalions.get('b1')?.position).toEqual({ x: 5, y: 5 });
      expect(updatedState.battalions.get('b1')?.health).toBe(100);
    });

    it('should maintain position on health-only updates', () => {
      let state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'b1',
          health: 100,
          position: { x: 10, y: 10 }
        }]
      });

      state = updateBattleState(state, {
        battalionUpdates: [{ id: 'b1', health: 80 }]
      });

      expect(state.battalions.get('b1')?.position).toEqual({ x: 10, y: 10 });
      expect(state.battalions.get('b1')?.health).toBe(80);
    });
  });

  describe('Phase Transition Edge Cases', () => {
    it('should handle forced phase transitions during active battle', () => {
      let state = updateBattleState(battleContext, { elapsedTime: 3 }); // Enter active battle
      state = updateBattleState(state, {
        elapsedTime: 13, // Mid-battle
        forcedPhase: BattlePhase.RESULTS
      });

      expect(state.currentPhase).toBe(BattlePhase.RESULTS);
    });

    it('should process updates before phase transition', () => {
      let state = updateBattleState(battleContext, {
        elapsedTime: 2.9,
        battalionUpdates: [{ id: 'b1', health: 100 }]
      });

      state = updateBattleState(state, { elapsedTime: 3 }); // Phase transition
      expect(state.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);
      expect(state.battalions.get('b1')?.health).toBe(100);
    });

    it('should maintain state consistency during phase transitions', () => {
      let state = updateBattleState(battleContext, {
        elapsedTime: 2.9,
        battalionUpdates: [{ id: 'b1', health: 100 }],
        nodeUpdates: [{ id: 'n1', owner: 'user' }]
      });

      state = updateBattleState(state, { 
        elapsedTime: 3.1,
        battalionUpdates: [{ id: 'b1', health: 90 }]
      });

      expect(state.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);
      expect(state.battalions.get('b1')?.health).toBe(90);
      expect(state.nodes.get('n1')?.owner).toBe('user');
    });
  });
}); 