import { BattleStateManager, Node, Battalion } from '../../../src/battle/core/BattleStateManager';
import { BattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase, BattalionType } from '../../../src/battle/core/BattleTypes';

// Mock BattleService
jest.mock('../../../src/battle/core/BattleService', () => {
  return {
    BattleService: jest.fn().mockImplementation(() => {
      return {
        updateBattleState: jest.fn().mockResolvedValue({}),
        startSync: jest.fn().mockImplementation((battleId, callback, errorCallback) => {
          // Mock successful sync startup
          return Promise.resolve();
        }),
      };
    }),
  };
});

describe('Node Control System', () => {
  let battleStateManager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh instance
    mockBattleService = new BattleService() as jest.Mocked<BattleService>;
    battleStateManager = BattleStateManager.getInstance(mockBattleService);
    
    // Reset the damage tracking
    battleStateManager.resetDamageTracking();
    
    // Initialize with test battle
    const testBattleId = 'test-battle-123';
    const initialState = {
      phase: BattlePhase.COMBAT,
      timeRemaining: 300,
      nodes: new Map<string, Node>([
        ['node1', {
          id: 'node1',
          position: { x: 100, y: 100 },
          controllingTeam: null,
          controlProgress: 0,
          health: 1000
        }]
      ]),
      battalions: new Map<string, Battalion>([
        ['blue-battalion', {
          id: 'blue-battalion',
          position: { x: 50, y: 50 },
          team: 'blue',
          type: BattalionType.GUARDIAN,
          health: 100,
          quantity: 5,
          targetId: 'node1'
        }],
        ['red-battalion', {
          id: 'red-battalion',
          position: { x: 150, y: 150 },
          team: 'red',
          type: BattalionType.BREACHER,
          health: 80,
          quantity: 4,
          targetId: 'node1'
        }]
      ]),
      updateId: 0,
      lastUpdated: new Date()
    };
    
    battleStateManager.initializeBattle(testBattleId, initialState);
  });
  
  describe('Node Damage Tracking', () => {
    it('should track damage dealt to nodes by each team', async () => {
      // Reset damage tracking to ensure clean state
      battleStateManager.resetDamageTracking();
      
      // Get the initial state
      const initialState = battleStateManager.getState();
      const node = initialState.nodes.get('node1');
      
      // Simulate an attack from blue team to the node
      const damageByBlue = 50;
      const attackUpdate = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - damageByBlue
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply the update
      await battleStateManager.updateState(attackUpdate);
      
      // Check the node's accumulated damage
      const updatedState = battleStateManager.getState();
      const updatedNode = updatedState.nodes.get('node1');
      
      expect(battleStateManager.getNodeDamageByTeam('node1', 'blue')).toBe(damageByBlue);
      expect(battleStateManager.getNodeDamageByTeam('node1', 'red')).toBe(0);
    });
    
    it('should maintain separate damage counters for each team', async () => {
      // Reset damage tracking to ensure clean state
      battleStateManager.resetDamageTracking();
      
      // Get the initial state
      const initialState = battleStateManager.getState();
      const node = initialState.nodes.get('node1');
      
      // Simulate attacks from both teams
      const damageByBlue = 50;
      const damageByRed = 30;
      
      // Blue team attack
      const blueAttackUpdate = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - damageByBlue
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply blue attack
      await battleStateManager.updateState(blueAttackUpdate);
      
      // Current health after blue attack
      const stateAfterBlue = battleStateManager.getState();
      const nodeAfterBlue = stateAfterBlue.nodes.get('node1');
      
      // Red team attack
      const redAttackUpdate = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: nodeAfterBlue!.health - damageByRed
          }]
        ]),
        damagingTeam: 'red'
      };
      
      // Apply red attack
      await battleStateManager.updateState(redAttackUpdate);
      
      expect(battleStateManager.getNodeDamageByTeam('node1', 'blue')).toBe(damageByBlue);
      expect(battleStateManager.getNodeDamageByTeam('node1', 'red')).toBe(damageByRed);
    });
    
    it('should persist damage counters across state updates', async () => {
      // Reset damage tracking to ensure clean state
      battleStateManager.resetDamageTracking();
      
      // Get the initial state
      const initialState = battleStateManager.getState();
      const node = initialState.nodes.get('node1');
      
      // First attack from blue team
      const damageByBlue1 = 25;
      const blueAttack1 = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - damageByBlue1
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply first attack
      await battleStateManager.updateState(blueAttack1);
      
      // State after first attack
      const stateAfter1 = battleStateManager.getState();
      const nodeAfter1 = stateAfter1.nodes.get('node1');
      
      // Second attack from blue team
      const damageByBlue2 = 35;
      const blueAttack2 = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: nodeAfter1!.health - damageByBlue2
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply second attack
      await battleStateManager.updateState(blueAttack2);
      
      expect(battleStateManager.getNodeDamageByTeam('node1', 'blue')).toBe(damageByBlue1 + damageByBlue2);
    });
  });
}); 