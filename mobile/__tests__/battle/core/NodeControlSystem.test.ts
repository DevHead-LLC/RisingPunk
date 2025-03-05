import { BattleStateManager, Node, Battalion } from '../../../src/battle/core/BattleStateManager';
import { BattleService } from '../../../src/battle/core/BattleService';
import { BattlePhase, BattalionType } from '../../../src/battle/core/BattleTypes';

// Mock BattleService
jest.mock('../../../src/battle/core/BattleService', () => {
  const MockBattleServiceImpl = jest.fn().mockImplementation(() => {
    return {
      startSync: jest.fn().mockImplementation((battleId, callback, errorCallback) => {
        // Mock successful sync startup
        return Promise.resolve();
      }),
      stopSync: jest.fn(),
      syncState: jest.fn().mockResolvedValue({}),
      notifyVictory: jest.fn()
    };
  });
  
  return {
    BattleService: jest.fn(),
    MockBattleService: MockBattleServiceImpl
  };
});

// Get the mocked constructor
const { MockBattleService } = jest.requireMock('../../../src/battle/core/BattleService');

describe('Node Control System', () => {
  let battleStateManager: BattleStateManager;
  let mockBattleService: jest.Mocked<BattleService>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh instance
    mockBattleService = new MockBattleService() as unknown as jest.Mocked<BattleService>;
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
  
  describe('Capture Threshold Calculation', () => {
    it('should calculate total army health for each team', () => {
      // Get the initial state with both blue and red battalions
      const state = battleStateManager.getState();
      
      // Calculate expected total health values
      // Blue battalion: health 100 * quantity 5 = 500
      // Red battalion: health 80 * quantity 4 = 320
      const expectedBlueTotal = 500;
      const expectedRedTotal = 320;
      
      // The method should calculate total health per team
      expect(battleStateManager.getTotalArmyHealth('blue')).toBe(expectedBlueTotal);
      expect(battleStateManager.getTotalArmyHealth('red')).toBe(expectedRedTotal);
    });
    
    it('should calculate capture threshold at 75% of total army health', () => {
      // Blue team total health is 500, so threshold is 375
      // Red team total health is 320, so threshold is 240
      expect(battleStateManager.getCaptureThreshold('blue')).toBe(375);
      expect(battleStateManager.getCaptureThreshold('red')).toBe(240);
    });
    
    it('should update threshold when army size changes', async () => {
      // Initial blue battalion has health 100 and quantity 5 = 500 total (threshold 375)
      expect(battleStateManager.getCaptureThreshold('blue')).toBe(375);
      
      // Update the blue battalion to reduce its quantity
      const state = battleStateManager.getState();
      const blueUpdate = {
        battalionUpdates: new Map([
          ['blue-battalion', {
            id: 'blue-battalion',
            quantity: 3 // Reduce from 5 to 3
          }]
        ])
      };
      
      // Apply the update
      await battleStateManager.updateState(blueUpdate);
      
      // New total health: 100 * 3 = 300, threshold should be 225
      expect(battleStateManager.getCaptureThreshold('blue')).toBe(225);
    });
    
    it('should determine node capture status based on damage and threshold', async () => {
      // Setup a node and damage it
      const state = battleStateManager.getState();
      const node = state.nodes.get('node1');
      
      // Blue threshold is 375
      // Damage just below threshold
      const damageBelow = 370;
      const attackBelowThreshold = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - damageBelow
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply damage below threshold
      await battleStateManager.updateState(attackBelowThreshold);
      
      // Node should not be captured yet
      expect(battleStateManager.isNodeCaptured('node1', 'blue')).toBe(false);
      
      // Additional damage to exceed threshold
      const additionalDamage = 10;
      const attackExceedThreshold = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - damageBelow - additionalDamage
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply additional damage
      await battleStateManager.updateState(attackExceedThreshold);
      
      // Now node should be captured
      expect(battleStateManager.isNodeCaptured('node1', 'blue')).toBe(true);
    });
  });
  
  describe('Control Status Updates', () => {
    it('should update control progress based on damage percentage vs threshold', async () => {
      // Reset damage tracking to ensure clean state
      battleStateManager.resetDamageTracking();
      
      // Get the initial state - node starts with null controlling team and 0 progress
      const initialState = battleStateManager.getState();
      const node = initialState.nodes.get('node1');
      expect(node?.controllingTeam).toBeNull();
      expect(node?.controlProgress).toBe(0);
      
      // Blue team threshold is 375
      // Deal damage that is 40% of threshold (150 damage)
      const partialDamage = 150;
      const attackPartial = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - partialDamage
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply the damage
      await battleStateManager.updateState(attackPartial);
      
      // Control progress should be updated to 40%
      const updatedState = battleStateManager.getState();
      const updatedNode = updatedState.nodes.get('node1');
      expect(updatedNode?.controlProgress).toBeCloseTo(0.4, 1);
      expect(updatedNode?.controllingTeam).toBe('blue'); // Team should be set even before capture
    });
    
    it('should change controlling team when their damage exceeds threshold', async () => {
      // Reset damage tracking to ensure clean state
      battleStateManager.resetDamageTracking();
      
      // Get the initial state - ensure node starts neutral
      const initialState = battleStateManager.getState();
      const node = initialState.nodes.get('node1');
      
      // First, let blue team do damage and get control
      const blueDamage = 400; // Beyond blue threshold of 375
      const blueAttack = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - blueDamage
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply blue team damage
      await battleStateManager.updateState(blueAttack);
      
      // Check that blue now controls the node
      let updatedState = battleStateManager.getState();
      let updatedNode = updatedState.nodes.get('node1');
      expect(updatedNode?.controllingTeam).toBe('blue');
      expect(updatedNode?.controlProgress).toBeGreaterThanOrEqual(1.0);
      
      // Now red team attacks with even more damage
      const redDamage = 250; // Beyond red threshold of 240
      const redAttack = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: updatedNode!.health - redDamage
          }]
        ]),
        damagingTeam: 'red'
      };
      
      // Apply red team damage
      await battleStateManager.updateState(redAttack);
      
      // Control should now switch to red
      updatedState = battleStateManager.getState();
      updatedNode = updatedState.nodes.get('node1');
      expect(updatedNode?.controllingTeam).toBe('red');
      expect(updatedNode?.controlProgress).toBeGreaterThanOrEqual(1.0);
    });
    
    it('should reflect partial progress when multiple teams attack same node', async () => {
      // Reset damage tracking to ensure clean state
      battleStateManager.resetDamageTracking();
      
      // Get the initial state
      const initialState = battleStateManager.getState();
      const node = initialState.nodes.get('node1');
      
      // Blue team does partial damage (50% of threshold)
      const blueDamage = 375 * 0.5; // 50% of blue threshold
      const blueAttack = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - blueDamage
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Apply blue team damage
      await battleStateManager.updateState(blueAttack);
      
      // Check partial blue control
      let updatedState = battleStateManager.getState();
      let updatedNode = updatedState.nodes.get('node1');
      expect(updatedNode?.controllingTeam).toBe('blue');
      expect(updatedNode?.controlProgress).toBeCloseTo(0.5, 1);
      
      // Red team also does partial damage (30% of threshold)
      const redDamage = 240 * 0.3; // 30% of red threshold
      const redAttack = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: updatedNode!.health - redDamage
          }]
        ]),
        damagingTeam: 'red'
      };
      
      // Apply red team damage
      await battleStateManager.updateState(redAttack);
      
      // Blue should still be controlling team (higher progress), but progress reflects competition
      updatedState = battleStateManager.getState();
      updatedNode = updatedState.nodes.get('node1');
      
      // Blue has 50% progress, Red has 30% progress
      // This should be reflected in the node's control status
      expect(updatedNode?.controllingTeam).toBe('blue'); // Blue still dominant
      expect(updatedNode?.controlProgress).toBeCloseTo(0.5, 1); // Blue's progress
    });
    
    it('should update control status immediately after damage updates', async () => {
      // Reset damage tracking to ensure clean state
      battleStateManager.resetDamageTracking();
      
      // Get the initial state
      const initialState = battleStateManager.getState();
      const node = initialState.nodes.get('node1');
      const initialNodeData = { ...node }; // Clone for comparison
      
      // Apply damage exceeding threshold
      const damage = 400; // Above blue threshold of 375
      const attack = {
        nodeUpdates: new Map([
          ['node1', {
            id: 'node1',
            health: node!.health - damage
          }]
        ]),
        damagingTeam: 'blue'
      };
      
      // Create a spy on notifySubscribers to verify it's called once per update
      const notifySpy = jest.spyOn(battleStateManager, 'notifySubscribers');
      
      // Apply the attack
      await battleStateManager.updateState(attack);
      
      // Get updated state
      const updatedState = battleStateManager.getState();
      const updatedNode = updatedState.nodes.get('node1');
      
      // Verify node is captured
      expect(updatedNode?.controllingTeam).toBe('blue');
      expect(updatedNode?.controlProgress).toBeGreaterThanOrEqual(1.0);
      
      // Verify notifySubscribers was called exactly once (control status updated in same cycle)
      expect(notifySpy).toHaveBeenCalledTimes(1);
      
      // Restore the spy
      notifySpy.mockRestore();
    });
  });
}); 