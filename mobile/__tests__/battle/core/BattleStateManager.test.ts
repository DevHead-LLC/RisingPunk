import { BattleStateManager, BattleState, BattalionState, NodeState } from '../../../src/battle/core/BattleStateManager';
import { BattleService } from '../../../src/services/BattleService';
import { BattlePhase } from '../../../src/battle/core/BattleContext';
import { Position } from '../../../src/battle/core/types';

// Mock BattleService
jest.mock('../../../src/services/BattleService', () => {
  const mockStartSync = jest.fn();
  const mockStopSync = jest.fn();
  const mockUpdateState = jest.fn().mockResolvedValue({ success: true });
  
  return {
    BattleService: {
      getInstance: jest.fn(() => ({
        startSync: mockStartSync,
        stopSync: mockStopSync,
        updateState: mockUpdateState,
      })),
    },
  };
});

describe('BattleStateManager', () => {
  let manager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new BattleStateManager();
    mockBattleService = BattleService.getInstance() as jest.Mocked<BattleService>;
  });

  afterEach(() => {
    manager.stopUpdateTimer();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const state = manager.getState();
      expect(state.phase).toBe(BattlePhase.PRE_BATTLE);
      expect(state.timeRemaining).toBe(20);
      expect(state.battalions.size).toBe(0);
      expect(state.nodes.size).toBe(0);
      expect(state.updateId).toBe(0);
      expect(state.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('State Updates', () => {
    it('should handle phase transitions correctly', () => {
      manager.updateState({ phaseUpdate: BattlePhase.ACTIVE_BATTLE });
      expect(manager.getState().phase).toBe(BattlePhase.ACTIVE_BATTLE);

      manager.updateState({ phaseUpdate: BattlePhase.RESULTS });
      expect(manager.getState().phase).toBe(BattlePhase.RESULTS);
    });

    it('should reject invalid phase transitions', () => {
      manager.updateState({ phaseUpdate: BattlePhase.RESULTS });
      expect(manager.getState().phase).toBe(BattlePhase.PRE_BATTLE);
    });

    it('should update time remaining', () => {
      manager.updateState({ timeUpdate: 10 });
      expect(manager.getState().timeRemaining).toBe(10);
    });

    it('should not allow negative time', () => {
      manager.updateState({ timeUpdate: -5 });
      expect(manager.getState().timeRemaining).toBe(0);
    });
  });

  describe('Battalion Management', () => {
    const testBattalion: BattalionState = {
      id: 'test-1',
      type: 'breacher',
      quantity: 5,
      health: 100,
      position: { x: 0, y: 0 } as Position,
      targetId: null,
      team: 'user'
    };

    beforeEach(() => {
      manager.updateState({
        battalionUpdates: [testBattalion]
      });
    });

    it('should update battalion properties', () => {
      const update = {
        id: 'test-1',
        health: 80,
        targetId: 'enemy-1'
      };

      manager.updateState({
        battalionUpdates: [update]
      });

      const state = manager.getState();
      const updatedBattalion = state.battalions.get('test-1');
      expect(updatedBattalion).toBeDefined();
      expect(updatedBattalion?.health).toBe(80);
      expect(updatedBattalion?.targetId).toBe('enemy-1');
      expect(updatedBattalion?.quantity).toBe(5);
    });
  });

  describe('Node Management', () => {
    const testNode: NodeState = {
      id: 1,
      position: { x: 10, y: 10 } as Position,
      controllingTeam: null,
      controlProgress: 0,
      health: 100
    };

    beforeEach(() => {
      manager.updateState({
        nodeUpdates: [testNode]
      });
    });

    it('should update node properties', () => {
      const update = {
        id: 1,
        controllingTeam: 'user' as 'user' | 'enemy' | null,
        controlProgress: 50
      };

      manager.updateState({
        nodeUpdates: [update]
      });

      const state = manager.getState();
      const updatedNode = state.nodes.get(1);
      expect(updatedNode).toBeDefined();
      expect(updatedNode?.controllingTeam).toBe('user');
      expect(updatedNode?.controlProgress).toBe(50);
      expect(updatedNode?.health).toBe(100);
    });
  });

  describe('Subscription System', () => {
    it('should notify subscribers of state changes', () => {
      const mockCallback = jest.fn();
      const unsubscribe = manager.subscribe(mockCallback);

      manager.updateState({ timeUpdate: 15 });
      expect(mockCallback).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.updateState({ timeUpdate: 10 });
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timer Management', () => {
    it('should start and stop timer correctly', () => {
      jest.useFakeTimers();

      manager.startUpdateTimer();
      jest.advanceTimersByTime(2000);

      const state = manager.getState();
      expect(state.timeRemaining).toBe(18);

      manager.stopUpdateTimer();
      jest.advanceTimersByTime(2000);
      expect(manager.getState().timeRemaining).toBe(18);

      jest.useRealTimers();
    });

    it('should transition to RESULTS phase when time expires', () => {
      jest.useFakeTimers();

      manager.updateState({ phaseUpdate: BattlePhase.ACTIVE_BATTLE });
      manager.updateState({ timeUpdate: 2 });
      manager.startUpdateTimer();

      jest.advanceTimersByTime(2000);
      expect(manager.getState().phase).toBe(BattlePhase.RESULTS);

      jest.useRealTimers();
    });
  });

  describe('State Persistence', () => {
    const mockBattleId = 'test-battle-123';
    const mockBattalion: BattalionState = {
      id: 'battalion-1',
      type: 'breacher',
      quantity: 5,
      health: 100,
      position: { x: 0, y: 0 },
      targetId: null,
      team: 'user',
    };

    const mockNode: NodeState = {
      id: 1,
      position: { x: 10, y: 10 },
      controllingTeam: null,
      controlProgress: 0,
      health: 100,
    };

    beforeEach(() => {
      // Reset mock implementations for each test
      mockBattleService.startSync.mockImplementation((id, onUpdate, onError) => {
        // Store callbacks for later use in tests
        (mockBattleService.startSync as any).mockOnUpdate = onUpdate;
        (mockBattleService.startSync as any).mockOnError = onError;
      });
      
      mockBattleService.updateState.mockResolvedValue({ 
        success: true,
        state: {
          phase: BattlePhase.ACTIVE_BATTLE,
          timeRemaining: 15,
          battalions: new Map(),
          nodes: new Map(),
          updateId: 1,
          lastUpdated: new Date()
        }
      });
    });

    test('should initialize battle and start sync', () => {
      manager.initializeBattle(mockBattleId);
      expect(mockBattleService.startSync).toHaveBeenCalledWith(
        mockBattleId,
        expect.any(Function),
        expect.any(Function)
      );
    });

    test('should update state and sync with backend', async () => {
      manager.initializeBattle(mockBattleId);
      await manager.updateState({
        battalionUpdates: [mockBattalion],
        nodeUpdates: [mockNode],
      });

      expect(mockBattleService.updateState).toHaveBeenCalledWith(
        mockBattleId,
        expect.objectContaining({
          battalions: expect.any(Map),
          nodes: expect.any(Map),
        })
      );
    });

    test('should handle server state updates', () => {
      const subscriber = jest.fn();
      manager.subscribe(subscriber);
      manager.initializeBattle(mockBattleId);

      const mockServerState: BattleState = {
        phase: BattlePhase.ACTIVE_BATTLE,
        timeRemaining: 15,
        battalions: new Map([[mockBattalion.id, mockBattalion]]),
        nodes: new Map([[mockNode.id, mockNode]]),
        updateId: 2,
        lastUpdated: new Date(),
      };

      // Get the stored callback and call it
      const onUpdate = (mockBattleService.startSync as any).mockOnUpdate;
      onUpdate(mockServerState);

      expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
        phase: BattlePhase.ACTIVE_BATTLE,
        timeRemaining: 15,
      }));
    });

    test('should handle sync errors gracefully', () => {
      const subscriber = jest.fn();
      manager.subscribe(subscriber);
      manager.initializeBattle(mockBattleId);

      // Get the stored error callback and call it
      const onError = (mockBattleService.startSync as any).mockOnError;
      onError('Network error');

      // Should still be able to update state locally
      manager.updateState({
        battalionUpdates: [mockBattalion],
      });

      expect(subscriber).toHaveBeenCalled();
    });

    test('should cleanup resources properly', () => {
      manager.initializeBattle(mockBattleId);
      const subscriber = jest.fn();
      manager.subscribe(subscriber);

      manager.cleanup();

      expect(mockBattleService.stopSync).toHaveBeenCalled();
      // Try to update state after cleanup
      manager.updateState({
        battalionUpdates: [mockBattalion],
      });
      expect(subscriber).not.toHaveBeenCalled();
    });

    test('should handle phase transitions with sync', async () => {
      manager.initializeBattle(mockBattleId);
      
      await manager.updateState({
        phaseUpdate: BattlePhase.ACTIVE_BATTLE,
      });

      expect(mockBattleService.updateState).toHaveBeenCalledWith(
        mockBattleId,
        expect.objectContaining({
          phase: BattlePhase.ACTIVE_BATTLE,
        })
      );

      // Invalid transition should not sync
      await manager.updateState({
        phaseUpdate: BattlePhase.PRE_BATTLE,
      });

      // Should still have only one call from the valid transition
      expect(mockBattleService.updateState).toHaveBeenCalledTimes(1);
    });
  });
}); 