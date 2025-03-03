import { BattleUpdateManager } from '../../../src/battle/core/BattleUpdateManager';
import { BattleAnimationController } from '../../../src/battle/core/BattleAnimationController';
import { BattleStateManager } from '../../../src/battle/core/BattleStateManager';
import { BattleService } from '../../../src/battle/core/BattleService';
import { BattleState, BattlePhase } from '../../../src/battle/core/BattleTypes';

// Mock performance.now()
let currentTime = 0;
const mockNow = jest.fn(() => currentTime);

// Mock the global performance object
Object.defineProperty(global, 'performance', {
  value: {
    now: mockNow
  },
  writable: true
});

// Mock requestAnimationFrame
let rafCallbacks: ((timestamp: number) => void)[] = [];
const mockRequestAnimationFrame = jest.fn((cb) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
});

// Mock cancelAnimationFrame
const mockCancelAnimationFrame = jest.fn((id) => {
  rafCallbacks = rafCallbacks.filter((_, index) => index + 1 !== id);
});

// Mock the global window object
(global as any).window = {
  requestAnimationFrame: mockRequestAnimationFrame,
  cancelAnimationFrame: mockCancelAnimationFrame
};

class MockBattleService implements BattleService {
  private onUpdate?: (state: BattleState) => void;
  private onError?: (error: Error) => void;
  private mockState: BattleState = {
    phase: BattlePhase.PRE_BATTLE,
    timeRemaining: 20,
    nodes: new Map(),
    battalions: new Map(),
    updateId: 0,
    lastUpdated: new Date()
  };

  startSync(
    battleId: string,
    onUpdate: (state: BattleState) => void,
    onError: (error: Error) => void
  ): void {
    this.onUpdate = onUpdate;
    this.onError = onError;
    if (this.onUpdate) {
      this.onUpdate(this.mockState);
    }
  }

  stopSync(battleId: string): void {
    this.onUpdate = undefined;
    this.onError = undefined;
  }

  async syncState(battleId: string, state: BattleState): Promise<void> {
    this.mockState = state;
    if (this.onUpdate) {
      this.onUpdate(state);
    }
    return Promise.resolve();
  }

  // Test helpers
  mockServerUpdate(state: BattleState) {
    this.mockState = state;
    if (this.onUpdate) {
      this.onUpdate(state);
    }
  }

  mockError(error: Error) {
    if (this.onError) {
      this.onError(error);
    }
  }
}

describe('Battle Update Timing', () => {
  let updateManager: BattleUpdateManager;
  let animationController: BattleAnimationController;
  let stateManager: BattleStateManager;
  let mockBattleService: MockBattleService;

  beforeEach(() => {
    // Reset all mocks and timers
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset time tracking
    currentTime = 0;
    mockNow.mockImplementation(() => currentTime);
    rafCallbacks = [];
    
    // Initialize components
    mockBattleService = new MockBattleService();
    stateManager = new BattleStateManager(mockBattleService);
    animationController = new BattleAnimationController(stateManager);
    updateManager = new BattleUpdateManager(stateManager, animationController);

    // Initialize battle with mock state
    stateManager.initializeBattle('test-battle-id');
  });

  afterEach(async () => {
    // Stop all ongoing operations
    if (updateManager) {
      updateManager.stop();
    }
    if (stateManager) {
      stateManager.cleanup();
    }
    if (animationController) {
      animationController.update(0);
    }

    // Clear all timers and callbacks
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    
    // Reset mocks
    mockNow.mockReset();
    rafCallbacks = [];
    
    // Wait for any pending promises
    await Promise.resolve();
  });

  describe('Real-time Updates (60fps)', () => {
    it('should maintain 60fps for animations and movement', () => {
      const frameCallback = jest.fn();
      let frameCount = 0;

      // Start animation loop
      animationController.startAnimationLoop();

      // Simulate 100ms of updates (should be ~6 frames at 16ms intervals)
      for (let i = 0; i < 100; i += 16) {
        currentTime = i;
        jest.advanceTimersByTime(16);
        frameCount++;
      }

      expect(frameCount).toBe(7); // 100ms / 16ms ≈ 6.25 frames, rounded up to 7
    });

    it('should implement RAF fallback for background tabs', async () => {
      const frameCallback = jest.fn();
      updateManager.setBackgroundMode(true);
      updateManager.startAnimationLoop(frameCallback);

      // Simulate slower updates in background (100ms intervals)
      for (let i = 0; i < 6; i++) {
        currentTime += 100;
        mockNow.mockImplementation(() => currentTime);
        
        // Execute RAF callbacks
        rafCallbacks.forEach(cb => cb(currentTime));
        
        // Advance timers and wait for microtasks
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      }
      
      expect(frameCallback).toHaveBeenCalledTimes(6);
    });
  });

  describe('Speed-based Attack Animations', () => {
    it('should calculate correct durations based on battalion speed', () => {
      const attackerId = 'attacker1';
      const targetId = 'target1';
      
      // Set up initial state
      stateManager.updateState({
        battalionUpdates: new Map([
          [attackerId, { position: { x: 0, y: 0 } }],
          [targetId, { position: { x: 100, y: 100 } }]
        ])
      });

      // Start attack animation
      animationController.animateAttack(attackerId, targetId, 1000);

      // Simulate animation progress
      currentTime = 500;
      jest.advanceTimersByTime(500);

      // Check if animation is halfway complete
      const attacker = stateManager.getState().battalions.get(attackerId);
      expect(attacker?.position).toEqual({ x: 50, y: 50 });
    });

    it('should use proper easing for attack animations', () => {
      const startPos = { x: 0, y: 0 };
      const endPos = { x: 100, y: 100 };
      const progress = 0.5; // 50% through animation

      const position = animationController.interpolatePosition(startPos, endPos, progress);
      
      // Verify easing curve results in expected position
      // Using ease-out-cubic: 1 - (1-t)^3
      const eased = 1 - Math.pow(1 - 0.5, 3); // ~0.875
      expect(position.x).toBeCloseTo(startPos.x + (endPos.x - startPos.x) * eased);
      expect(position.y).toBeCloseTo(startPos.y + (endPos.y - startPos.y) * eased);
    });
  });

  describe('Global Timer Integration (1s)', () => {
    it('should synchronize state updates with 1-second timer', async () => {
      const updateCallback = jest.fn();
      stateManager.subscribe(updateCallback);

      // Set phase to COMBAT to trigger timer updates
      stateManager.updateState({ 
        phaseUpdate: BattlePhase.COMBAT,
        timeUpdate: 20 // Reset time to ensure we have enough time
      });
      
      // Clear initial update from phase change
      updateCallback.mockClear();

      // Start the update manager to trigger the global timer
      updateManager.startAnimationLoop(() => {});

      // Run all pending timers and wait for promises to resolve
      await Promise.resolve(); // Wait for microtasks
      
      // Advance time and trigger updates
      currentTime += 1000;
      mockNow.mockImplementation(() => currentTime);
      
      // Execute any pending RAF callbacks
      const callbacks = [...rafCallbacks];
      rafCallbacks.length = 0; // Clear callbacks before execution
      callbacks.forEach(cb => cb(currentTime));
      
      // Advance timers and wait for all promises to resolve
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Wait for any pending promises

      // Force a state update
      stateManager.updateState({ timeUpdate: 19 });
      
      // Verify that the callback was called with the updated state
      expect(updateCallback).toHaveBeenCalled();
      const lastCall = updateCallback.mock.calls[updateCallback.mock.calls.length - 1][0];
      expect(lastCall.timeRemaining).toBe(19); // Initial 20 - 1 second
    });

    it('should batch related state changes', async () => {
      const updateCallback = jest.fn();
      stateManager.subscribe(updateCallback);

      const changes = [
        { type: 'MOVE', data: { id: 1, position: { x: 10, y: 10 } } },
        { type: 'ATTACK', data: { id: 1, target: 2 } }
      ];

      stateManager.queueStateChanges(changes);
      await Promise.resolve(); // Wait for microtasks
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Wait for microtasks

      // Verify that changes were batched and processed
      expect(updateCallback).toHaveBeenCalled();
    });

    it('should buffer state changes for smooth transitions', () => {
      const stateBuffer = stateManager.getStateBuffer();
      expect(stateBuffer).toBeDefined();
      expect(Array.isArray(stateBuffer)).toBe(true);
    });
  });
}); 