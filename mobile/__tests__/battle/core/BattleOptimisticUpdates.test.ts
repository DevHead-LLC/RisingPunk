// Implementation of @battle-core-mechanics.mdc#Network-Integration
// Tests optimistic updates and rollback behavior for battle state

import { BattleService } from '../../../src/services/BattleService';
import { BattleState, BattalionState, NodeState } from '../../../src/battle/core/BattleStateManager';
import { Position } from '../../../src/battle/core/types';
import { BattlePhase } from '../../../src/battle/core/BattleContext';

// Mock functions that can be configured in tests
const mockSyncState = jest.fn();
const mockUpdateState = jest.fn();

// Create a mock instance that uses the real implementation but with mocked sync methods
const createMockInstance = () => {
  const originalModule = jest.requireActual('../../../src/services/BattleService');
  const instance = new originalModule.BattleService();
  instance.syncState = mockSyncState;
  instance.updateState = mockUpdateState;
  return instance;
};

jest.mock('../../../src/services/BattleService', () => {
  const originalModule = jest.requireActual('../../../src/services/BattleService');
  return {
    ...originalModule,
    BattleService: {
      getInstance: jest.fn(() => createMockInstance())
    }
  };
});

describe('Battle Optimistic Updates', () => {
  let battleService: BattleService;
  const mockBattleId = 'test-battle-123';

  const mockBattalion: BattalionState = {
    id: 'battalion-1',
    type: 'breacher',
    quantity: 5,
    health: 100,
    position: { x: 0, y: 0 } as Position,
    targetId: null,
    team: 'user'
  };

  const mockNode: NodeState = {
    id: 1,
    position: { x: 10, y: 10 } as Position,
    controllingTeam: null,
    controlProgress: 0,
    health: 100
  };

  const mockInitialState: BattleState = {
    phase: BattlePhase.ACTIVE_BATTLE,
    battalions: new Map([[mockBattalion.id, mockBattalion]]),
    nodes: new Map([[mockNode.id, mockNode]]),
    timeRemaining: 300,
    updateId: 1,
    lastUpdated: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    battleService = BattleService.getInstance();
    // Configure syncState to return initial state
    mockSyncState.mockResolvedValue({
      success: true,
      state: mockInitialState
    });
  });

  describe('Battalion Movement', () => {
    it('should apply movement updates optimistically', async () => {
      const onUpdate = jest.fn();
      const newPosition = { x: 5, y: 5 };
      
      // Mock successful server response
      mockUpdateState.mockResolvedValue({
        success: true,
        state: {
          ...mockInitialState,
          battalions: new Map([[
            mockBattalion.id,
            { ...mockBattalion, position: newPosition }
          ]])
        }
      });

      // Apply optimistic update
      const result = await battleService.moveBattalion(
        mockBattleId,
        mockBattalion.id,
        newPosition,
        onUpdate
      );

      // Verify immediate update
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          battalions: expect.any(Map)
        })
      );
      
      const updatedBattalion = onUpdate.mock.calls[0][0].battalions.get(mockBattalion.id);
      expect(updatedBattalion.position).toEqual(newPosition);

      // Verify server update
      expect(mockUpdateState).toHaveBeenCalled();
      expect(result.success).toBe(true);
    }, 10000); // Increase timeout to 10s

    it('should rollback failed movement updates', async () => {
      const onUpdate = jest.fn();
      const newPosition = { x: 5, y: 5 };
      const originalPosition = mockBattalion.position;

      // Mock server error
      mockUpdateState.mockRejectedValue(
        new Error('Movement invalid')
      );

      // Apply optimistic update and expect it to fail
      await expect(
        battleService.moveBattalion(
          mockBattleId,
          mockBattalion.id,
          newPosition,
          onUpdate
        )
      ).rejects.toThrow('Movement invalid');

      // Verify rollback
      expect(onUpdate).toHaveBeenCalledTimes(2);
      const finalBattalion = onUpdate.mock.calls[1][0].battalions.get(mockBattalion.id);
      expect(finalBattalion.position).toEqual(originalPosition);
    });
  });

  describe('Node Control', () => {
    it('should apply node capture updates optimistically', async () => {
      const onUpdate = jest.fn();
      
      // Mock successful server response
      mockUpdateState.mockResolvedValue({
        success: true,
        state: {
          ...mockInitialState,
          nodes: new Map([[
            mockNode.id,
            { ...mockNode, controllingTeam: mockBattalion.team, controlProgress: 100 }
          ]])
        }
      });

      // Apply optimistic update
      const result = await battleService.captureNode(
        mockBattleId,
        mockNode.id,
        mockBattalion.team,
        onUpdate
      );

      // Verify immediate update
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: expect.any(Map)
        })
      );
      
      const updatedNode = onUpdate.mock.calls[0][0].nodes.get(mockNode.id);
      expect(updatedNode.controllingTeam).toBe(mockBattalion.team);
      expect(updatedNode.controlProgress).toBe(100);

      // Verify server update
      expect(mockUpdateState).toHaveBeenCalled();
      expect(result.success).toBe(true);
    }, 10000); // Increase timeout to 10s

    it('should rollback failed node capture updates', async () => {
      const onUpdate = jest.fn();
      
      // Mock server error
      mockUpdateState.mockRejectedValue(
        new Error('Capture invalid')
      );

      // Apply optimistic update and expect it to fail
      await expect(
        battleService.captureNode(
          mockBattleId,
          mockNode.id,
          mockBattalion.team,
          onUpdate
        )
      ).rejects.toThrow('Capture invalid');

      // Verify rollback
      expect(onUpdate).toHaveBeenCalledTimes(2);
      const finalNode = onUpdate.mock.calls[1][0].nodes.get(mockNode.id);
      expect(finalNode.controllingTeam).toBe(null);
      expect(finalNode.controlProgress).toBe(0);
    });
  });
}); 