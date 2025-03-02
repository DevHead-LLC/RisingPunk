import { BattleStateManager } from '../../../src/battle/core/BattleStateManager';
import { BattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase } from '../../../src/battle/core/BattleTypes';
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

jest.useFakeTimers();

class MockBattleService implements BattleService {
  private onUpdate?: (state: any) => void;
  private onError?: (error: Error) => void;

  startSync(battleId: string, onUpdate: (state: any) => void, onError: (error: Error) => void): void {
    this.onUpdate = onUpdate;
    this.onError = onError;
  }

  stopSync(battleId: string): void {
    this.onUpdate = undefined;
    this.onError = undefined;
  }

  syncState(battleId: string, state: any): Promise<void> {
    return Promise.resolve();
  }

  // Test helpers
  mockServerUpdate(state: any) {
    if (this.onUpdate) this.onUpdate(state);
  }

  mockError(error: Error) {
    if (this.onError) this.onError(error);
  }
}

describe('BattleStateManager', () => {
  let manager: BattleStateManager;
  let mockBattleService: MockBattleService;

  beforeEach(() => {
    jest.useFakeTimers();
    mockBattleService = new MockBattleService();
    manager = new BattleStateManager(mockBattleService);
  });

  afterEach(() => {
    if (manager) {
      manager.stopUpdateTimer();
      manager.cleanup();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const state = manager.getState();
      expect(state.phase).toBe(BattlePhase.PRE_BATTLE);
      expect(state.timeRemaining).toBe(20);
      expect(state.battalions.size).toBe(0);
      expect(state.nodes.size).toBe(0);
    });
  });

  describe('State Updates', () => {
    it('should handle phase transitions correctly', async () => {
      await manager.updateState({ phaseUpdate: BattlePhase.DEPLOYMENT });
      expect(manager.getState().phase).toBe(BattlePhase.DEPLOYMENT);

      await manager.updateState({ phaseUpdate: BattlePhase.COMBAT });
      expect(manager.getState().phase).toBe(BattlePhase.COMBAT);

      await manager.updateState({ phaseUpdate: BattlePhase.RESULTS });
      expect(manager.getState().phase).toBe(BattlePhase.RESULTS);
    });

    it('should reject invalid phase transitions', async () => {
      await manager.updateState({ phaseUpdate: BattlePhase.RESULTS });
      expect(manager.getState().phase).toBe(BattlePhase.PRE_BATTLE);
    });
  });

  describe('Battalion Management', () => {
    it('should update battalion properties', async () => {
      const battalionUpdates = new Map();
      battalionUpdates.set('test-1', {
        id: 'test-1',
        position: { x: 0, y: 0 },
        team: 'user',
        health: 100,
        quantity: 10,
        targetId: null
      });

      await manager.updateState({ battalionUpdates });
      
      const updateMap = new Map();
      updateMap.set('test-1', {
        health: 80,
        targetId: 'enemy-1',
        quantity: 5
      });

      await manager.updateState({ battalionUpdates: updateMap });

      const state = manager.getState();
      const updatedBattalion = state.battalions.get('test-1');
      expect(updatedBattalion).toBeDefined();
      expect(updatedBattalion?.health).toBe(80);
      expect(updatedBattalion?.targetId).toBe('enemy-1');
      expect(updatedBattalion?.quantity).toBe(5);
    });
  });

  describe('Node Management', () => {
    it('should update node properties', async () => {
      const nodeUpdates = new Map();
      nodeUpdates.set('1', {
        id: '1',
        position: { x: 10, y: 10 },
        controllingTeam: null,
        controlProgress: 0,
        health: 100
      });

      await manager.updateState({ nodeUpdates });

      const updateMap = new Map();
      updateMap.set('1', {
        controllingTeam: 'user',
        controlProgress: 50
      });

      await manager.updateState({ nodeUpdates: updateMap });

      const state = manager.getState();
      const updatedNode = state.nodes.get('1');
      expect(updatedNode).toBeDefined();
      expect(updatedNode?.controllingTeam).toBe('user');
      expect(updatedNode?.controlProgress).toBe(50);
      expect(updatedNode?.health).toBe(100);
    });
  });

  describe('Timer Management', () => {
    it('should start and stop timer correctly', async () => {
      await manager.updateState({ phaseUpdate: BattlePhase.DEPLOYMENT });
      await manager.updateState({ phaseUpdate: BattlePhase.COMBAT });
      
      // Advance time by exactly 2 seconds
      for (let i = 0; i < 2; i++) {
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // Allow async updates to process
      }
      
      const state = manager.getState();
      expect(state.timeRemaining).toBe(18);

      manager.stopUpdateTimer();
      jest.advanceTimersByTime(2000);
      expect(manager.getState().timeRemaining).toBe(18);
    });

    it('should transition to RESULTS phase when time expires', async () => {
      await manager.updateState({ phaseUpdate: BattlePhase.DEPLOYMENT });
      await manager.updateState({ phaseUpdate: BattlePhase.COMBAT });
      
      // Advance time to 0, waiting for each update
      for (let i = 0; i < 20; i++) {
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // Allow async updates to process
      }

      const finalState = manager.getState();
      expect(finalState.phase).toBe(BattlePhase.RESULTS);
      expect(finalState.timeRemaining).toBe(0);
    });
  });

  describe('State Persistence', () => {
    const mockBattleId = 'test-battle-123';

    it('should initialize battle and start sync', () => {
      manager.initializeBattle(mockBattleId);
      const state = manager.getState();
      expect(state.phase).toBe(BattlePhase.PRE_BATTLE);
    });

    it('should handle server state updates', async () => {
      const subscriber = jest.fn();
      manager.subscribe(subscriber);
      manager.initializeBattle(mockBattleId);

      const mockServerState = {
        phase: BattlePhase.DEPLOYMENT,
        timeRemaining: 15,
        battalions: new Map(),
        nodes: new Map(),
        updateId: 1,
        lastUpdated: new Date()
      };

      await Promise.resolve(); // Allow subscription to be registered
      mockBattleService.mockServerUpdate(mockServerState);
      await Promise.resolve(); // Allow update to process

      expect(subscriber).toHaveBeenCalled();
      expect(manager.getState().phase).toBe(BattlePhase.DEPLOYMENT);
    });

    it('should handle sync errors gracefully', () => {
      manager.initializeBattle(mockBattleId);
      mockBattleService.mockError(new Error('Network error'));
      // Should still be operational
      expect(manager.getState().phase).toBe(BattlePhase.PRE_BATTLE);
    });

    it('should cleanup resources properly', () => {
      manager.initializeBattle(mockBattleId);
      manager.cleanup();
      expect(manager.getState().phase).toBe(BattlePhase.PRE_BATTLE);
    });
  });
}); 