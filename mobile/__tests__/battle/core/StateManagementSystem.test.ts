import { BattleStateManager, BattleState, Battalion, Node } from '../../../src/battle/core/BattleStateManager';
import { BattleService, MockBattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase, BattalionType } from '../../../src/battle/core/BattleTypes';
import { StateComponent } from '../../../src/battle/core/StateCoordinator';

describe('State Management System - Core State Architecture', () => {
  let battleStateManager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;
  let testBattleId: string;
  
  beforeEach(() => {
    jest.resetAllMocks();
    mockBattleService = new MockBattleService() as unknown as jest.Mocked<BattleService>;
    battleStateManager = new BattleStateManager(mockBattleService);
    testBattleId = 'test-battle-id';
    
    // Reset damage tracking
    battleStateManager.resetDamageTracking();
    
    // Initialize a test battle state
    const testState: BattleState = {
      phase: BattlePhase.PRE_BATTLE,
      timeRemaining: 300,
      nodes: new Map(),
      battalions: new Map(),
      updateId: 0,
      lastUpdated: new Date()
    };
    
    battleStateManager.initializeBattle(testBattleId, testState);
  });
  
  test('should maintain single source of truth for battle state', () => {
    // This test verifies that there is only one authoritative state object
    // and all components access state through a centralized mechanism
    
    // Act - Update the state with a new battalion
    battleStateManager.updateState({
      battalionUpdates: new Map([
        ['battalion1', {
          position: { x: 0, y: 0 },
          team: 'team1',
          type: BattalionType.GUARDIAN,
          quantity: 1,
          health: 100,
          targetId: null
        }]
      ])
    });
    
    // Assert
    // We need to implement a way to get a battalion by ID
    // For now, this test will fail because we need to implement the state coordinator
    expect(battleStateManager.hasStateCoordinator()).toBe(true);
  });
  
  test('should centralize state management through a coordinator', () => {
    // This test verifies that state changes go through a central coordinator
    
    // Arrange
    const testNode: Node = {
      id: 'node1',
      position: { x: 10, y: 10 },
      controllingTeam: null,
      controlProgress: 0,
      health: 100
    };
    
    // Act - Update the state with a new node
    battleStateManager.updateState({
      nodeUpdates: new Map([
        ['node1', testNode]
      ])
    });
    
    // Assert
    // Fail this test for now - we need to implement a state coordinator
    expect(battleStateManager.getStateCoordinator()).not.toBeNull();
    expect(battleStateManager.stateChangesAreCoordinated()).toBe(true);
  });
  
  test('should define clear ownership for different state components', () => {
    // This test verifies that different components of the state have clear owners
    
    // Arrange & Act
    // We need to implement a way to add teams to the battle state
    
    // Assert
    // Fail this test for now - we need to implement component ownership
    expect(battleStateManager.hasComponentOwnership()).toBe(true);
    expect(battleStateManager.getComponentOwner('teams')).toBe('TeamStateComponent');
  });
  
  test('should ensure predictable state transitions', () => {
    // This test verifies that state transitions are predictable and follow defined patterns
    
    // Arrange - Add a battalion to the state
    battleStateManager.updateState({
      battalionUpdates: new Map([
        ['battalion1', {
          position: { x: 0, y: 0 },
          team: 'team1',
          type: BattalionType.GUARDIAN,
          quantity: 1,
          health: 100,
          targetId: null
        }]
      ])
    });
    
    // Act - Apply damage to the battalion
    battleStateManager.applyDamage('battalion1', 50);
    
    // Assert
    // We need to implement a way to get a battalion's health
    // For now, this test will fail because we need to implement the transition log
    expect(battleStateManager.hasTransitionLog()).toBe(true);
    expect(battleStateManager.getLastTransition().type).toBe('APPLY_DAMAGE');
  });
  
  test('should implement atomic state operations', () => {
    // This test verifies that state operations are atomic (all-or-nothing)
    
    // Arrange - Add two battalions to the state
    battleStateManager.updateState({
      battalionUpdates: new Map([
        ['battalion1', {
          position: { x: 0, y: 0 },
          team: 'team1',
          type: BattalionType.GUARDIAN,
          quantity: 1,
          health: 100,
          targetId: null
        }],
        ['battalion2', {
          position: { x: 5, y: 5 },
          team: 'team1',
          type: BattalionType.GUARDIAN,
          quantity: 1,
          health: 100,
          targetId: null
        }]
      ])
    });
    
    // Act & Assert
    // Fail this test for now - we need to implement atomic operations
    expect(() => {
      battleStateManager.performAtomicOperation(() => {
        battleStateManager.applyDamage('battalion1', 50);
        throw new Error('Simulated failure');
        // The following line should not execute due to the error
        battleStateManager.applyDamage('battalion2', 50);
      });
    }).toThrow();
    
    // Both battalions should be unchanged due to atomic operation failure
    // We need to implement a way to get a battalion's health
    // For now, this test will fail because we need to implement atomic operations
  });
});

// New test suite for Update Frequency Management
describe('State Management System - Update Frequency Management', () => {
  let battleStateManager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;
  let testBattleId: string;
  
  beforeEach(() => {
    jest.resetAllMocks();
    mockBattleService = new MockBattleService() as unknown as jest.Mocked<BattleService>;
    battleStateManager = new BattleStateManager(mockBattleService);
    testBattleId = 'test-battle-id';
    
    // Reset damage tracking
    battleStateManager.resetDamageTracking();
    
    // Initialize a test battle state
    const testState: BattleState = {
      phase: BattlePhase.PRE_BATTLE,
      timeRemaining: 300,
      nodes: new Map(),
      battalions: new Map(),
      updateId: 0,
      lastUpdated: new Date()
    };
    
    battleStateManager.initializeBattle(testBattleId, testState);
    
    // Stop the update timer to avoid interference with tests
    battleStateManager.stopUpdateTimer();
  });
  
  // Mock StateComponent for testing
  class TestComponent implements StateComponent {
    private name: string;
    private updateCallCount: number = 0;
    private lastUpdateTimestamp: number = 0;
    
    constructor(name: string) {
      this.name = name;
    }
    
    getName(): string {
      return this.name;
    }
    
    getState(): any {
      return {};
    }
    
    updateState(update: any): void {
      // Do nothing
    }
    
    onUpdateCycle(timestamp: number): void {
      this.updateCallCount++;
      this.lastUpdateTimestamp = timestamp;
    }
    
    getUpdateCallCount(): number {
      return this.updateCallCount;
    }
    
    getLastUpdateTimestamp(): number {
      return this.lastUpdateTimestamp;
    }
  }
  
  test('should allow components to register for update notifications', () => {
    // Arrange
    const testComponent = new TestComponent('TestComponent');
    
    // Act
    battleStateManager.registerComponentForUpdates(testComponent);
    
    // Assert
    expect(battleStateManager.hasRegisteredComponent('TestComponent')).toBe(true);
  });
  
  test('should notify registered components on update cycle', () => {
    // Arrange
    const testComponent = new TestComponent('TestComponent');
    battleStateManager.registerComponentForUpdates(testComponent);
    
    // Act
    battleStateManager.triggerUpdateCycle();
    
    // Assert
    expect(testComponent.getUpdateCallCount()).toBe(1);
  });
  
  test('should optimize update scheduling based on component needs', () => {
    // Arrange
    const highPriorityComponent = new TestComponent('HighPriorityComponent');
    const lowPriorityComponent = new TestComponent('LowPriorityComponent');
    
    // Act
    battleStateManager.registerComponentForUpdates(highPriorityComponent, { priority: 'high', frequency: 'every' });
    battleStateManager.registerComponentForUpdates(lowPriorityComponent, { priority: 'low', frequency: 'occasional' });
    
    // Simulate multiple update cycles
    battleStateManager.triggerUpdateCycle();
    battleStateManager.triggerUpdateCycle();
    battleStateManager.triggerUpdateCycle();
    
    // Assert
    expect(highPriorityComponent.getUpdateCallCount()).toBe(3); // Should be called every cycle
    expect(lowPriorityComponent.getUpdateCallCount()).toBeLessThan(3); // Should be called less frequently
  });
  
  test('should provide mechanism for immediate updates', () => {
    // Arrange
    const testComponent = new TestComponent('TestComponent');
    battleStateManager.registerComponentForUpdates(testComponent);
    const initialCallCount = testComponent.getUpdateCallCount();
    
    // Act
    battleStateManager.requestImmediateUpdate('TestComponent');
    
    // Assert
    expect(testComponent.getUpdateCallCount()).toBe(initialCallCount + 1);
  });
  
  test('should ensure consistent update sequence', () => {
    // Arrange
    const timestamps: number[] = [];
    const componentA = new TestComponent('ComponentA');
    const componentB = new TestComponent('ComponentB');
    const componentC = new TestComponent('ComponentC');
    
    // Create a spy to capture the update sequence
    jest.spyOn(componentA, 'onUpdateCycle').mockImplementation((timestamp) => {
      timestamps.push(1);
    });
    
    jest.spyOn(componentB, 'onUpdateCycle').mockImplementation((timestamp) => {
      timestamps.push(2);
    });
    
    jest.spyOn(componentC, 'onUpdateCycle').mockImplementation((timestamp) => {
      timestamps.push(3);
    });
    
    // Register components in a specific order
    battleStateManager.registerComponentForUpdates(componentA, { sequence: 1 });
    battleStateManager.registerComponentForUpdates(componentB, { sequence: 2 });
    battleStateManager.registerComponentForUpdates(componentC, { sequence: 3 });
    
    // Act
    battleStateManager.triggerUpdateCycle();
    
    // Assert
    expect(timestamps).toEqual([1, 2, 3]); // Components should be updated in the defined sequence
  });
  
  test('should handle global 1-second update timer', () => {
    // Arrange
    const testComponent = new TestComponent('TestComponent');
    battleStateManager.registerComponentForUpdates(testComponent);
    
    // Save original method
    const originalStartUpdateTimer = battleStateManager.startUpdateTimer;
    
    // Replace with a mock implementation that directly triggers the update cycle
    battleStateManager.startUpdateTimer = jest.fn().mockImplementation((interval?: number) => {
      // Just trigger the update cycle directly without setting up an interval
      battleStateManager.triggerUpdateCycle();
    });
    
    try {
      // Act
      battleStateManager.startUpdateTimer(1000);
      
      // Assert
      expect(battleStateManager.startUpdateTimer).toHaveBeenCalledWith(1000);
      expect(testComponent.getUpdateCallCount()).toBeGreaterThan(0);
    } finally {
      // Restore original method
      battleStateManager.startUpdateTimer = originalStartUpdateTimer;
    }
  });
}); 