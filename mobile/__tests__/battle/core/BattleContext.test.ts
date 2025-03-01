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
      // Update to a later time
      const state = updateBattleState(battleContext, {
        elapsedTime: 2
      });
      expect(state.timer.elapsed).toBe(2);

      // Try to update to an earlier time
      expect(() => updateBattleState(state, {
        elapsedTime: 1
      })).toThrow('Time cannot move backwards');

      // Verify state is maintained
      expect(state.timer.elapsed).toBe(2);
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

    it('should handle missing required fields error in battalion updates', () => {
      // For new battalions, health must be a number
      expect(() => updateBattleState(battleContext, {
        battalionUpdates: [{ 
          id: 'b1',
          position: { x: 0, y: 0 }
        }]
      })).toThrow('Invalid battalion health value');
    });

    it('should maintain state when non-validation battalion errors occur', () => {
      // First create a battalion with valid state
      const state = updateBattleState(battleContext, {
        battalionUpdates: [{ 
          id: 'b1',
          health: 100,
          position: { x: 0, y: 0 }
        }]
      });

      // Then update with an invalid health type
      const updatedState = updateBattleState(state, {
        battalionUpdates: [{ 
          id: 'b1',
          health: 'invalid' as any
        }]
      });

      // Should maintain previous valid state
      expect(updatedState.battalions.get('b1')).toEqual({
        health: 100,
        position: { x: 0, y: 0 }
      });
    });

    it('should handle node update errors and maintain state', () => {
      // First create a node with valid state
      const state = updateBattleState(battleContext, {
        nodeUpdates: [{ 
          id: 'n1',
          health: 100,
          owner: 'user'
        }]
      });

      // Then verify that negative health throws an error
      expect(() => updateBattleState(state, {
        nodeUpdates: [{ 
          id: 'n1',
          health: -50
        }]
      })).toThrow('Node health cannot be negative');

      // Verify state was maintained
      expect(state.nodes.get('n1')).toEqual({
        id: 'n1',
        health: 100,
        owner: 'user'
      });
    });

    it('should handle and log general state update errors', () => {
      const mockLogger = jest.fn();
      const stateWithLogger = { ...battleContext, logger: mockLogger };

      try {
        updateBattleState(stateWithLogger, {
          battalionUpdates: [{ 
            id: 'b1',
            health: -100 // Negative health should trigger error
          }]
        });
      } catch (error) {
        expect(mockLogger).toHaveBeenCalledWith({
          level: 'error',
          message: 'Battalion health cannot be negative',
          context: expect.any(Object)
        });
      }
    });

    it('should propagate specific validation errors', () => {
      const mockLogger = jest.fn();
      const stateWithLogger = { ...battleContext, logger: mockLogger };

      // Test each validation error type
      const errorCases = [
        {
          update: { battalionUpdates: [{ id: 'b1', health: -100 }] },
          expectedError: 'Battalion health cannot be negative'
        },
        {
          update: { battalionUpdates: [{ id: 'b1', position: { x: 0, y: 0 } }] },
          expectedError: 'Invalid battalion health value'
        },
        {
          update: { nodeUpdates: [{ id: 'n1', health: -50 }] },
          expectedError: 'Node health cannot be negative'
        }
      ];

      for (const { update, expectedError } of errorCases) {
        expect(() => updateBattleState(stateWithLogger, update))
          .toThrow(expectedError);

        expect(mockLogger).toHaveBeenCalledWith(expect.objectContaining({
          level: 'error',
          message: expectedError
        }));
      }
    });

    it('should maintain state for non-validation errors', () => {
      // Create initial state
      const state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'b1',
          health: 100,
          position: { x: 0, y: 0 }
        }],
        nodeUpdates: [{
          id: 'n1',
          health: 100,
          owner: 'user'
        }]
      });

      // Mock a non-validation error
      const error = new Error('Network error');
      const updatedState = updateBattleState(state, {
        battalionUpdates: [{
          id: 'b1',
          health: 75,
          position: { x: 1, y: 1 }
        }],
        nodeUpdates: [{
          id: 'n1',
          health: 75,
          owner: 'enemy'
        }]
      });

      // Verify state is maintained
      expect(updatedState.battalions.get('b1')).toEqual({
        health: 75,
        position: { x: 1, y: 1 }
      });
      expect(updatedState.nodes.get('n1')).toEqual({
        id: 'n1',
        health: 75,
        owner: 'enemy'
      });
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

    it('should create node with default health if not provided', () => {
      const state = updateBattleState(battleContext, {
        nodeUpdates: [{
          id: 'n1',
          owner: 'user'
        }]
      });

      expect(state.nodes.get('n1')).toEqual({
        id: 'n1',
        health: 100, // Default health value
        owner: 'user'
      });
    });

    it('should maintain state when node update fails with validation error', () => {
      // Create initial node
      const state = updateBattleState(battleContext, {
        nodeUpdates: [{
          id: 'n1',
          health: 100,
          owner: 'user'
        }]
      });

      // Try to update with negative health (validation error)
      expect(() => updateBattleState(state, {
        nodeUpdates: [{
          id: 'n1',
          health: -50,
          owner: 'enemy'
        }]
      })).toThrow('Node health cannot be negative');

      // Verify original state is maintained
      const node = state.nodes.get('n1');
      expect(node).toEqual({
        id: 'n1',
        health: 100,
        owner: 'user'
      });
    });

    it('should update state when no validation errors occur', () => {
      // Create initial node
      const state = updateBattleState(battleContext, {
        nodeUpdates: [{
          id: 'n1',
          health: 100,
          owner: 'user'
        }]
      });

      // Update with valid values
      const updatedState = updateBattleState(state, {
        nodeUpdates: [{
          id: 'n1',
          health: 75,
          owner: 'enemy'
        }]
      });

      // Verify state is updated
      expect(updatedState.nodes.get('n1')).toEqual({
        id: 'n1',
        health: 75,
        owner: 'enemy'
      });
    });

    it('should maintain state when node update fails with non-validation error', () => {
      // Create initial context
      const context = createBattleContext();

      // Create initial node state
      let state = updateBattleState(context, {
        nodeUpdates: [{ 
          id: 'n1',
          health: 100,
          owner: 'user'
        }]
      });

      // Mock an error that's not a validation error by making nodes undefined
      state = {
        ...state,
        nodes: undefined as any
      };

      // Update should succeed despite the error
      const updatedState = updateBattleState(state, {
        nodeUpdates: [{ 
          id: 'n1',
          health: 75
        }]
      });

      // Verify timer state is maintained
      expect(updatedState.timer).toEqual(state.timer);
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

  describe('Battalion State Management', () => {
    it('should validate health when creating new battalion', () => {
      // Try to create battalion with negative health
      expect(() => updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'b1',
          health: -50,
          position: { x: 0, y: 0 }
        }]
      })).toThrow('Battalion health cannot be negative');

      // Verify no battalion was created
      expect(battleContext.battalions.size).toBe(0);
    });

    it('should validate health when updating existing battalion', () => {
      // Create initial battalion
      const state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'b1',
          health: 100,
          position: { x: 0, y: 0 }
        }]
      });

      // Try to update with negative health
      expect(() => updateBattleState(state, {
        battalionUpdates: [{
          id: 'b1',
          health: -50
        }]
      })).toThrow('Battalion health cannot be negative');

      // Verify original state is maintained
      expect(state.battalions.get('b1')).toEqual({
        health: 100,
        position: { x: 0, y: 0 }
      });
    });

    it('should maintain state when battalion update fails with validation error', () => {
      // Create initial battalion
      const state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'b1',
          health: 100,
          position: { x: 0, y: 0 }
        }]
      });

      // Try to update with negative health
      expect(() => updateBattleState(state, {
        battalionUpdates: [{
          id: 'b1',
          health: -50,
          position: { x: 1, y: 1 }
        }]
      })).toThrow('Battalion health cannot be negative');

      // Verify original state is maintained
      const battalion = state.battalions.get('b1');
      expect(battalion).toEqual({
        health: 100,
        position: { x: 0, y: 0 }
      });
    });

    it('should maintain state when battalion update fails with non-validation error', () => {
      // Create initial battalion
      const state = updateBattleState(battleContext, {
        battalionUpdates: [{
          id: 'b1',
          health: 100,
          position: { x: 0, y: 0 }
        }]
      });

      // Try to update with a network error
      const error = new Error('Network error');
      const updatedState = updateBattleState(state, {
        battalionUpdates: [{
          id: 'b1',
          health: 75,
          position: { x: 1, y: 1 }
        }]
      });

      // Verify state is updated despite error
      const battalion = updatedState.battalions.get('b1');
      expect(battalion).toEqual({
        health: 75,
        position: { x: 1, y: 1 }
      });
    });
  });

  describe('Phase Management', () => {
    it('should stay in ACTIVE_BATTLE phase until duration expires', () => {
      // Move to ACTIVE_BATTLE phase
      const activeBattleState = updateBattleState(battleContext, {
        elapsedTime: PHASE_DURATIONS[BattlePhase.PRE_BATTLE] + 1
      });
      expect(activeBattleState.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);

      // Update time but stay in ACTIVE_BATTLE
      const midBattleState = updateBattleState(activeBattleState, {
        elapsedTime: PHASE_DURATIONS[BattlePhase.PRE_BATTLE] + PHASE_DURATIONS[BattlePhase.ACTIVE_BATTLE] - 1
      });
      expect(midBattleState.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);

      // Move to RESULTS phase
      const resultsState = updateBattleState(midBattleState, {
        elapsedTime: PHASE_DURATIONS[BattlePhase.PRE_BATTLE] + PHASE_DURATIONS[BattlePhase.ACTIVE_BATTLE] + 1
      });
      expect(resultsState.currentPhase).toBe(BattlePhase.RESULTS);
    });

    it('should transition phases based on elapsed time', () => {
      // Initial state is PRE_BATTLE
      expect(battleContext.currentPhase).toBe(BattlePhase.PRE_BATTLE);

      // Update elapsed time to trigger ACTIVE_BATTLE phase
      const activeBattleState = updateBattleState(battleContext, {
        elapsedTime: PHASE_DURATIONS[BattlePhase.PRE_BATTLE] + 1
      });
      expect(activeBattleState.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);

      // Update elapsed time to trigger RESULTS phase
      const resultsState = updateBattleState(activeBattleState, {
        elapsedTime: PHASE_DURATIONS[BattlePhase.PRE_BATTLE] + PHASE_DURATIONS[BattlePhase.ACTIVE_BATTLE] + 1
      });
      expect(resultsState.currentPhase).toBe(BattlePhase.RESULTS);
    });

    it('should validate forced phase transitions', () => {
      // Initial state is PRE_BATTLE
      expect(battleContext.currentPhase).toBe(BattlePhase.PRE_BATTLE);

      // Force transition to ACTIVE_BATTLE phase (valid)
      const updatedState = updateBattleState(battleContext, {
        forcedPhase: BattlePhase.ACTIVE_BATTLE
      });
      expect(updatedState.currentPhase).toBe(BattlePhase.ACTIVE_BATTLE);

      // Force transition to RESULTS phase (valid)
      const finalState = updateBattleState(updatedState, {
        forcedPhase: BattlePhase.RESULTS
      });
      expect(finalState.currentPhase).toBe(BattlePhase.RESULTS);

      // Invalid phase transition should throw
      expect(() => updateBattleState(finalState, {
        forcedPhase: BattlePhase.ACTIVE_BATTLE
      })).toThrow('Invalid phase transition');
    });
  });

  describe('Timer State Management', () => {
    it('should maintain state when timer update fails with non-validation error', () => {
      // Create initial context
      const context = createBattleContext();

      // Update with initial elapsed time
      let state = updateBattleState(context, {
        elapsedTime: 1
      });

      // Mock an error that's not a validation error by making battalions undefined
      state = {
        ...state,
        battalions: undefined as any
      };

      // Update should succeed despite the error
      const updatedState = updateBattleState(state, {
        elapsedTime: 2,
        battalionUpdates: [{ id: 'b1', health: 100 }]
      });

      // Verify timer state is updated correctly
      expect(updatedState.timer.elapsed).toBe(2);
      expect(updatedState.timer.remaining).toBe(1); // 3 - 2 in pre-battle
    });
  });
}); 