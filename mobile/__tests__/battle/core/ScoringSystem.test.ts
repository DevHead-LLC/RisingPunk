import { BattleStateManager } from '../../../src/battle/core/BattleStateManager';
import { BattleService, MockBattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase } from '../../../src/battle/core/BattleTypes';

// Mock dependencies
jest.mock('../../../src/battle/core/BattleService');

describe('ScoringSystem', () => {
  let battleStateManager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Initialize mocked battle service
    mockBattleService = new MockBattleService() as jest.Mocked<BattleService>;
    
    // Initialize battle state manager with mocked dependencies
    battleStateManager = new BattleStateManager(mockBattleService);
    
    // Initialize battle with test nodes
    const testState = {
      phase: BattlePhase.BATTLE,
      timeRemaining: 300,
      nodes: new Map(),
      battalions: new Map(),
      updateId: 1,
      lastUpdated: new Date()
    };
    
    // Add a regular node controlled by Team A
    testState.nodes.set('node1', {
      id: 'node1',
      position: { x: 100, y: 100 },
      controllingTeam: 'TeamA',
      controlProgress: 100,
      health: 1000,
      type: 'standard'
    });
    
    // Add a strategic node controlled by Team B
    testState.nodes.set('node2', {
      id: 'node2',
      position: { x: 200, y: 200 },
      controllingTeam: 'TeamB',
      controlProgress: 100,
      health: 1000,
      type: 'strategic'
    });
    
    // Add an uncontrolled node
    testState.nodes.set('node3', {
      id: 'node3',
      position: { x: 300, y: 300 },
      controllingTeam: null,
      controlProgress: 0,
      health: 1000,
      type: 'standard'
    });
    
    // Initialize battle state
    battleStateManager.initializeBattle('test-battle', testState);
  });

  describe('Node Control Points', () => {
    test('should award points for node control', () => {
      // Arrange: Process control points to generate initial points
      battleStateManager.processControlPoints(60);
      
      // Act: Get current points for each team
      const teamAPoints = battleStateManager.getTeamPoints('TeamA');
      const teamBPoints = battleStateManager.getTeamPoints('TeamB');
      
      // Assert: TeamA should have points for controlling node1
      expect(teamAPoints).toBeGreaterThan(0);
      // TeamB should have points for controlling node2
      expect(teamBPoints).toBeGreaterThan(0);
      // Team without control should have 0 points
      expect(battleStateManager.getTeamPoints('TeamC')).toBe(0);
    });

    test('should accumulate points over time based on control duration', () => {
      // Arrange: Record initial points
      const initialTeamAPoints = battleStateManager.getTeamPoints('TeamA');
      
      // Act: Simulate time passing (1 minute of control)
      battleStateManager.processControlPoints(60);
      const updatedTeamAPoints = battleStateManager.getTeamPoints('TeamA');
      
      // Assert: Points should increase after time passes
      expect(updatedTeamAPoints).toBeGreaterThan(initialTeamAPoints);
      
      // Act: Simulate more time passing
      battleStateManager.processControlPoints(60);
      const finalTeamAPoints = battleStateManager.getTeamPoints('TeamA');
      
      // Assert: Points should continue to accumulate
      expect(finalTeamAPoints).toBeGreaterThan(updatedTeamAPoints);
    });

    test('should apply different point rates for different node types', () => {
      // Act: Process one minute of control points
      battleStateManager.processControlPoints(60);
      
      // Get points per minute for each team
      const teamAPointsPerMinute = battleStateManager.getPointsPerMinute('TeamA');
      const teamBPointsPerMinute = battleStateManager.getPointsPerMinute('TeamB');
      
      // Assert: Strategic nodes (TeamB has node2) should award more points than standard nodes
      expect(teamBPointsPerMinute).toBeGreaterThan(teamAPointsPerMinute);
      
      // Get point value for each node type
      const standardNodeValue = battleStateManager.getNodePointValue('standard');
      const strategicNodeValue = battleStateManager.getNodePointValue('strategic');
      
      // Assert: Strategic nodes should be worth more than standard nodes
      expect(strategicNodeValue).toBeGreaterThan(standardNodeValue);
    });
  });
});
