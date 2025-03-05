import { BattleStateManager } from '../../../src/battle/core/BattleStateManager';
import { BattleService, MockBattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase, BattalionType } from '../../../src/battle/core/BattleTypes';

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
      phase: BattlePhase.COMBAT,
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
    
    // Add battalions for testing elimination points
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
    
    testState.battalions.set('battalion3', {
      id: 'battalion3',
      position: { x: 350, y: 350 },
      team: 'TeamB',
      type: BattalionType.BREACHER,
      health: 200,
      quantity: 5,
      targetId: null
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
  
  describe('Battalion Elimination Points', () => {
    test('should award points when enemy battalion is eliminated', () => {
      // Arrange: Get initial points for TeamA
      const initialTeamAPoints = battleStateManager.getTeamPoints('TeamA');
      
      // Act: Simulate battalion elimination from TeamB
      battleStateManager.processBattalionElimination('battalion2', 'TeamA');
      
      // Assert: TeamA should receive points for eliminating TeamB's battalion
      const updatedTeamAPoints = battleStateManager.getTeamPoints('TeamA');
      expect(updatedTeamAPoints).toBeGreaterThan(initialTeamAPoints);
    });
    
    test('should not award points when own battalion is eliminated', () => {
      // Arrange: Get initial points for TeamA
      const initialTeamAPoints = battleStateManager.getTeamPoints('TeamA');
      
      // Act: Simulate battalion elimination from the same team
      battleStateManager.processBattalionElimination('battalion1', 'TeamB');
      
      // Assert: TeamA should not receive points for losing their own battalion
      const updatedTeamAPoints = battleStateManager.getTeamPoints('TeamA');
      expect(updatedTeamAPoints).toBe(initialTeamAPoints);
    });
    
    test('should award different points based on battalion type', () => {
      // Act: Simulate elimination of different battalion types
      const initialTeamAPoints = battleStateManager.getTeamPoints('TeamA');
      
      // Eliminate a PHREAK battalion (battalion2)
      battleStateManager.processBattalionElimination('battalion2', 'TeamA');
      const pointsAfterPhreakElimination = battleStateManager.getTeamPoints('TeamA') - initialTeamAPoints;
      
      // Reset points
      battleStateManager.resetTeamPoints('TeamA');
      
      // Eliminate a BREACHER battalion (battalion3)
      battleStateManager.processBattalionElimination('battalion3', 'TeamA');
      const pointsAfterBreacherElimination = battleStateManager.getTeamPoints('TeamA');
      
      // Assert: Different battalion types should award different point values
      expect(pointsAfterPhreakElimination).not.toBe(pointsAfterBreacherElimination);
    });
    
    test('should award points based on battalion quantity', () => {
      // Arrange: Create two battalions with different quantities
      const currentState = battleStateManager.getState();
      
      currentState.battalions.set('largeBattalion', {
        id: 'largeBattalion',
        position: { x: 400, y: 400 },
        team: 'TeamB',
        type: BattalionType.GUARDIAN,
        health: 500,
        quantity: 20,
        targetId: null
      });
      
      currentState.battalions.set('smallBattalion', {
        id: 'smallBattalion',
        position: { x: 450, y: 450 },
        team: 'TeamB',
        type: BattalionType.GUARDIAN,
        health: 500,
        quantity: 5,
        targetId: null
      });
      
      // Reset TeamA points
      battleStateManager.resetTeamPoints('TeamA');
      
      // Act: Eliminate the large battalion
      battleStateManager.processBattalionElimination('largeBattalion', 'TeamA');
      const pointsForLargeBattalion = battleStateManager.getTeamPoints('TeamA');
      
      // Reset TeamA points
      battleStateManager.resetTeamPoints('TeamA');
      
      // Eliminate the small battalion
      battleStateManager.processBattalionElimination('smallBattalion', 'TeamA');
      const pointsForSmallBattalion = battleStateManager.getTeamPoints('TeamA');
      
      // Assert: Larger battalions should award more points when eliminated
      expect(pointsForLargeBattalion).toBeGreaterThan(pointsForSmallBattalion);
    });
    
    test('should track elimination points separately from control points', () => {
      // Arrange: Record control points and initial total
      battleStateManager.processControlPoints(60);
      const pointsFromControl = battleStateManager.getTeamPoints('TeamA');
      
      // Act: Eliminate a battalion
      battleStateManager.processBattalionElimination('battalion2', 'TeamA');
      const totalPointsAfterElimination = battleStateManager.getTeamPoints('TeamA');
      
      // Get breakdown of points
      const eliminationPoints = battleStateManager.getEliminationPoints('TeamA');
      const controlPoints = battleStateManager.getControlPoints('TeamA');
      
      // Assert: Points should be tracked separately
      expect(eliminationPoints).toBeGreaterThan(0);
      expect(controlPoints).toBe(pointsFromControl);
      expect(totalPointsAfterElimination).toBe(eliminationPoints + controlPoints);
    });
    
    test('should get battalion point value based on type and quantity', () => {
      // Act: Get point values for different battalion types
      const guardianValue = battleStateManager.getBattalionPointValue(BattalionType.GUARDIAN, 1);
      const phreakValue = battleStateManager.getBattalionPointValue(BattalionType.PHREAK, 1);
      const breacherValue = battleStateManager.getBattalionPointValue(BattalionType.BREACHER, 1);
      
      // Assert: Different types should have different base values
      expect(guardianValue).toBeGreaterThan(0);
      expect(phreakValue).toBeGreaterThan(0);
      expect(breacherValue).toBeGreaterThan(0);
      expect(guardianValue).not.toBe(phreakValue);
      
      // Get value for multiple units
      const singleGuardianValue = battleStateManager.getBattalionPointValue(BattalionType.GUARDIAN, 1);
      const multipleGuardianValue = battleStateManager.getBattalionPointValue(BattalionType.GUARDIAN, 5);
      
      // Assert: Value should scale with quantity
      expect(multipleGuardianValue).toBeGreaterThan(singleGuardianValue);
    });
  });
});
