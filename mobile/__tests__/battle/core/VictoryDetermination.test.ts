import { BattleStateManager } from '../../../src/battle/core/BattleStateManager';
import { BattleService, MockBattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase, BattalionType } from '../../../src/battle/core/BattleTypes';

// Mock dependencies
jest.mock('../../../src/battle/core/BattleService');

describe('VictoryDetermination', () => {
  let battleStateManager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Initialize mocked battle service
    mockBattleService = new MockBattleService() as unknown as jest.Mocked<BattleService>;
    
    // Initialize battle state manager with mocked dependencies
    battleStateManager = new BattleStateManager(mockBattleService);
    
    // Initialize battle with test nodes
    const testState = {
      phase: BattlePhase.COMBAT,
      timeRemaining: 300,
      nodes: new Map(),
      battalions: new Map(),
      updateId: 1,
      lastUpdated: new Date()
    };
    
    // Add nodes with different controlling teams
    testState.nodes.set('node1', {
      id: 'node1',
      position: { x: 100, y: 100 },
      controllingTeam: 'TeamA',
      controlProgress: 100,
      health: 1000,
      type: 'standard'
    });
    
    testState.nodes.set('node2', {
      id: 'node2',
      position: { x: 200, y: 200 },
      controllingTeam: 'TeamB',
      controlProgress: 100,
      health: 1000,
      type: 'strategic'
    });
    
    testState.nodes.set('node3', {
      id: 'node3',
      position: { x: 300, y: 300 },
      controllingTeam: 'TeamA',
      controlProgress: 100,
      health: 1000,
      type: 'standard'
    });
    
    // Add battalions for testing elimination victory condition
    testState.battalions.set('battalion1', {
      id: 'battalion1',
      position: { x: 150, y: 150 },
      team: 'TeamA',
      type: BattalionType.GUARDIAN,
      health: 500,
      quantity: 10,
      targetId: null
    });
    
    testState.battalions.set('battalion2', {
      id: 'battalion2',
      position: { x: 250, y: 250 },
      team: 'TeamB',
      type: BattalionType.PHREAK,
      health: 300,
      quantity: 15,
      targetId: null
    });
    
    // Initialize battle state
    battleStateManager.initializeBattle('test-battle', testState);
    
    // Mock notification system
    mockBattleService.notifyVictory = jest.fn();
  });

  describe('Total Network Control Victory', () => {
    test('should declare victory when 100% of network is controlled', () => {
      // Setup: Change all nodes to be controlled by TeamA
      const allNodes = battleStateManager.getNodes();
      
      // Create node updates
      const nodeUpdates = new Map();
      allNodes.forEach((node, id) => {
        nodeUpdates.set(id, { 
          controllingTeam: 'TeamA',
          controlProgress: 100
        });
      });
      
      // Update all nodes
      battleStateManager.updateState({
        nodeUpdates
      });
      
      // Set the control timestamp to 11 seconds ago
      const now = new Date();
      const pastTime = new Date(now.getTime() - 11000); // 11 seconds ago
      battleStateManager.setNetworkControlTimestamp('TeamA', pastTime);
      
      // Trigger victory check
      battleStateManager.checkForTotalNetworkControlVictory();
      
      // Assert that victory notification was called with TeamA as winner
      expect(mockBattleService.notifyVictory).toHaveBeenCalledWith({
        winningTeam: 'TeamA',
        victoryType: 'TOTAL_NETWORK_CONTROL',
        gameStats: expect.any(Object)
      });
    });
    
    test('should require minimum control duration before declaring victory', () => {
      // Set all nodes to be controlled by TeamA
      const allNodes = battleStateManager.getNodes();
      
      // Create node updates
      const nodeUpdates = new Map();
      allNodes.forEach((node, id) => {
        nodeUpdates.set(id, { 
          controllingTeam: 'TeamA',
          controlProgress: 100
        });
      });
      
      // Update all nodes
      battleStateManager.updateState({
        nodeUpdates
      });
      
      // Set the control timestamp to 5 seconds ago (less than minimum)
      const now = new Date();
      const pastTime = new Date(now.getTime() - 5000); // 5 seconds ago
      battleStateManager.setNetworkControlTimestamp('TeamA', pastTime);
      
      // Check for victory (should not be called yet)
      battleStateManager.checkForTotalNetworkControlVictory();
      expect(mockBattleService.notifyVictory).not.toHaveBeenCalled();
      
      // Set the control timestamp to 10 seconds ago (minimum duration)
      const earlierTime = new Date(now.getTime() - 10000); // 10 seconds ago
      battleStateManager.setNetworkControlTimestamp('TeamA', earlierTime);
      
      // Check for victory (should now be called)
      battleStateManager.checkForTotalNetworkControlVictory();
      
      // Now victory should be declared
      expect(mockBattleService.notifyVictory).toHaveBeenCalledWith({
        winningTeam: 'TeamA',
        victoryType: 'TOTAL_NETWORK_CONTROL',
        gameStats: expect.any(Object)
      });
    });
    
    test('should trigger appropriate victory notification', () => {
      // Set all nodes to be controlled by TeamB
      const allNodes = battleStateManager.getNodes();
      
      // Create node updates
      const nodeUpdates = new Map();
      allNodes.forEach((node, id) => {
        nodeUpdates.set(id, { 
          controllingTeam: 'TeamB',
          controlProgress: 100
        });
      });
      
      // Update all nodes
      battleStateManager.updateState({
        nodeUpdates
      });
      
      // Set the control timestamp to 10 seconds ago
      const now = new Date();
      const pastTime = new Date(now.getTime() - 10000); // 10 seconds ago
      battleStateManager.setNetworkControlTimestamp('TeamB', pastTime);
      
      // Check for victory
      battleStateManager.checkForTotalNetworkControlVictory();
      
      // Verify the notification includes the correct winner and victory type
      expect(mockBattleService.notifyVictory).toHaveBeenCalledWith({
        winningTeam: 'TeamB',
        victoryType: 'TOTAL_NETWORK_CONTROL',
        gameStats: expect.objectContaining({
          controlledNodes: 3,
          totalNodes: 3,
          controlDuration: expect.any(Number)
        })
      });
    });
  });

  describe('Point Threshold Victory', () => {
    test('should declare victory when point threshold is reached', () => {
      // Mock the team points
      // Set TeamA points to just below threshold
      battleStateManager.addPoints('TeamA', 990);
      
      // Check for victory - should not be called yet
      battleStateManager.checkForPointThresholdVictory();
      expect(mockBattleService.notifyVictory).not.toHaveBeenCalled();
      
      // Add more points to exceed threshold
      battleStateManager.addPoints('TeamA', 20);
      
      // Check for victory
      battleStateManager.checkForPointThresholdVictory();
      
      // Verify that victory was declared
      expect(mockBattleService.notifyVictory).toHaveBeenCalledWith({
        winningTeam: 'TeamA',
        victoryType: 'POINT_THRESHOLD',
        gameStats: expect.objectContaining({
          points: expect.any(Number),
          threshold: expect.any(Number)
        })
      });
    });
    
    test('should use configurable point threshold', () => {
      // Set a custom point threshold
      const customThreshold = 500;
      battleStateManager.setPointThreshold(customThreshold);
      
      // Add points below the custom threshold
      battleStateManager.addPoints('TeamA', customThreshold - 10);
      
      // Check for victory - should not be called yet
      battleStateManager.checkForPointThresholdVictory();
      expect(mockBattleService.notifyVictory).not.toHaveBeenCalled();
      
      // Add more points to exceed threshold
      battleStateManager.addPoints('TeamA', 20);
      
      // Check for victory
      battleStateManager.checkForPointThresholdVictory();
      
      // Verify that victory was declared with custom threshold
      expect(mockBattleService.notifyVictory).toHaveBeenCalledWith({
        winningTeam: 'TeamA',
        victoryType: 'POINT_THRESHOLD',
        gameStats: expect.objectContaining({
          points: expect.any(Number),
          threshold: customThreshold
        })
      });
    });
    
    test('should trigger appropriate victory notification', () => {
      // Add points to exceed threshold
      battleStateManager.addPoints('TeamB', 1100);
      
      // Check for victory
      battleStateManager.checkForPointThresholdVictory();
      
      // Verify the notification includes the correct winner and victory type
      expect(mockBattleService.notifyVictory).toHaveBeenCalledWith({
        winningTeam: 'TeamB',
        victoryType: 'POINT_THRESHOLD',
        gameStats: expect.objectContaining({
          points: 1100,
          threshold: 1000
        })
      });
    });
  });

  describe('Enemy Force Elimination Victory', () => {
    test('should declare victory when all enemy battalions are eliminated', () => {
      // Get current state to verify test setup
      const state = battleStateManager.getState();
      
      // Verify initial state has battalions from both teams
      expect(state.battalions.size).toBeGreaterThan(0);
      
      // Record the number of TeamB battalions (enemies of TeamA)
      const teamBBattalions = Array.from(state.battalions.values())
        .filter(battalion => battalion.team === 'TeamB');
      expect(teamBBattalions.length).toBeGreaterThan(0);
      
      // Eliminate all TeamB battalions
      teamBBattalions.forEach(battalion => {
        // Remove the battalion from the state
        state.battalions.delete(battalion.id);
      });
      
      // Trigger victory check
      battleStateManager.checkForEnemyEliminationVictory('TeamA');
      
      // Expect victory notification to be called with TeamA as winner
      expect(mockBattleService.notifyVictory).toHaveBeenCalledWith({
        winningTeam: 'TeamA',
        victoryType: 'ENEMY_FORCE_ELIMINATION',
        gameStats: expect.objectContaining({
          eliminatedEnemyCount: expect.any(Number)
        })
      });
    });
    
    test('should not declare victory if any enemy battalions remain', () => {
      // Get current state
      const state = battleStateManager.getState();
      
      // Remove one TeamB battalion but leave at least one
      const teamBBattalions = Array.from(state.battalions.values())
        .filter(battalion => battalion.team === 'TeamB');
      
      if (teamBBattalions.length > 1) {
        // Remove all but one TeamB battalion
        for (let i = 0; i < teamBBattalions.length - 1; i++) {
          state.battalions.delete(teamBBattalions[i].id);
        }
      }
      
      // Verify at least one TeamB battalion remains
      const remainingTeamBBattalions = Array.from(state.battalions.values())
        .filter(battalion => battalion.team === 'TeamB');
      expect(remainingTeamBBattalions.length).toBeGreaterThan(0);
      
      // Trigger victory check
      battleStateManager.checkForEnemyEliminationVictory('TeamA');
      
      // Expect victory notification NOT to be called
      expect(mockBattleService.notifyVictory).not.toHaveBeenCalled();
    });
    
    test('should trigger appropriate victory notification', () => {
      // Get current state
      const state = battleStateManager.getState();
      
      // Count TeamA battalions (to be eliminated)
      const teamABattalions = Array.from(state.battalions.values())
        .filter(battalion => battalion.team === 'TeamA');
      
      // Eliminate all TeamA battalions
      teamABattalions.forEach(battalion => {
        state.battalions.delete(battalion.id);
      });
      
      // Trigger victory check
      battleStateManager.checkForEnemyEliminationVictory('TeamB');
      
      // We only care that the notification was called with the right structure
      expect(mockBattleService.notifyVictory).toHaveBeenCalled();
      
      // Get the actual call arguments
      const callArgs = mockBattleService.notifyVictory.mock.calls[0][0];
      
      // Check the structure but not specific values
      expect(callArgs.winningTeam).toBe('TeamB');
      expect(callArgs.victoryType).toBe('ENEMY_FORCE_ELIMINATION');
      expect(callArgs.gameStats).toBeDefined();
      expect(callArgs.gameStats.eliminatedEnemyCount).toBeDefined();
    });
  });
}); 