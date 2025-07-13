import { BattleMovement } from '../src/services/BattleMovement';
import { IBattalion, INode, BotType, NodeOwner } from '../src/types/battle';

describe('BattleMovement Execution Methods', () => {
  let battleMovement: BattleMovement;
  let sampleBattalions: IBattalion[];
  let sampleNodes: INode[];

  beforeEach(() => {
    battleMovement = new BattleMovement();
    
    // Create sample nodes
    sampleNodes = [
      { index: 0, owner: NodeOwner.USER, captureProgress: 0, health: 0, position: { x: 0, y: 0 } },
      { index: 1, owner: NodeOwner.USER, captureProgress: 0, health: 0, position: { x: 100, y: 0 } },
      { index: 2, owner: NodeOwner.USER, captureProgress: 0, health: 0, position: { x: 200, y: 0 } },
      { index: 3, owner: NodeOwner.NEUTRAL, captureProgress: 0, health: 100, position: { x: 0, y: 100 } },
      { index: 4, owner: NodeOwner.NEUTRAL, captureProgress: 0, health: 100, position: { x: 100, y: 100 } },
      { index: 5, owner: NodeOwner.NEUTRAL, captureProgress: 0, health: 100, position: { x: 200, y: 100 } },
      { index: 6, owner: NodeOwner.ENEMY, captureProgress: 0, health: 0, position: { x: 0, y: 200 } },
      { index: 7, owner: NodeOwner.ENEMY, captureProgress: 0, health: 0, position: { x: 100, y: 200 } },
      { index: 8, owner: NodeOwner.ENEMY, captureProgress: 0, health: 0, position: { x: 200, y: 200 } },
    ];

    // Create sample battalions
    sampleBattalions = [
      {
        id: 'battalion-1',
        type: BotType.GUARDIAN,
        quantity: 10,
        currentHealth: 140,
        maxHealth: 140,
        position: { x: 0, y: 0, nodeIndex: 0 },
        owner: NodeOwner.USER,
        mark: 1,
        stats: { health: 14, speed: 9, range: 4, offense: 8, defense: 6 }
      },
      {
        id: 'battalion-2',
        type: BotType.BREACHER,
        quantity: 8,
        currentHealth: 144,
        maxHealth: 144,
        position: { x: 100, y: 0, nodeIndex: 1 },
        owner: NodeOwner.USER,
        mark: 2,
        stats: { health: 18, speed: 5, range: 5, offense: 7, defense: 8 }
      }
    ];
  });

  describe('executeBattalionMovement', () => {
    it('should execute movement for all battalions with paths', () => {
      // Add movement paths to battalions
      sampleBattalions[0].remainingPath = [0, 3, 4];
      sampleBattalions[1].remainingPath = [1, 4];

      const result = battleMovement.executeBattalionMovement(sampleBattalions, sampleNodes);

      expect(result).toHaveLength(2);
      expect(result[0].position.nodeIndex).toBe(3); // Moved to node 3
      expect(result[1].position.nodeIndex).toBe(4); // Moved to node 4
    });

    it('should handle battalions without movement paths', () => {
      const result = battleMovement.executeBattalionMovement(sampleBattalions, sampleNodes);

      expect(result).toHaveLength(2);
      expect(result[0].position.nodeIndex).toBe(0); // No movement
      expect(result[1].position.nodeIndex).toBe(1); // No movement
    });

    it('should handle destroyed battalions', () => {
      sampleBattalions[0].currentHealth = 0; // Destroyed battalion
      sampleBattalions[1].remainingPath = [1, 4];

      const result = battleMovement.executeBattalionMovement(sampleBattalions, sampleNodes);

      expect(result).toHaveLength(2);
      expect(result[0].position.nodeIndex).toBe(0); // Destroyed battalion doesn't move
      expect(result[1].position.nodeIndex).toBe(4); // Healthy battalion moves
    });
  });

  describe('assignInitialTargets', () => {
    it('should assign targets to battalions', () => {
      const result = battleMovement.assignInitialTargets(sampleBattalions, sampleNodes);

      expect(result).toHaveLength(2);
      expect(result[0].finalTarget).toBeDefined();
      expect(result[1].finalTarget).toBeDefined();
      expect(result[0].remainingPath).toBeDefined();
      expect(result[1].remainingPath).toBeDefined();
    });

    it('should handle destroyed battalions', () => {
      sampleBattalions[0].currentHealth = 0; // Destroyed battalion

      const result = battleMovement.assignInitialTargets(sampleBattalions, sampleNodes);

      expect(result).toHaveLength(2);
      expect(result[0].finalTarget).toBeUndefined(); // Destroyed battalion gets no target
      expect(result[1].finalTarget).toBeDefined(); // Healthy battalion gets target
    });
  });

  describe('checkRetargetingNeeded', () => {
    it('should return true when battalion has no target', () => {
      const battalion = { ...sampleBattalions[0], finalTarget: undefined };

      const result = battleMovement.checkRetargetingNeeded(battalion, sampleNodes, sampleBattalions);

      expect(result).toBe(true);
    });

    it('should return true when target node is captured', () => {
      const battalion = { ...sampleBattalions[0], targetNode: 3, finalTarget: 3 };
      const capturedNodes = [...sampleNodes];
      capturedNodes[3].owner = NodeOwner.USER; // Node 3 captured

      const result = battleMovement.checkRetargetingNeeded(battalion, capturedNodes, sampleBattalions);

      expect(result).toBe(true);
    });

    it('should return false when target is still valid', () => {
      const battalion = { ...sampleBattalions[0], targetNode: 3, finalTarget: 3 };

      const result = battleMovement.checkRetargetingNeeded(battalion, sampleNodes, sampleBattalions);

      expect(result).toBe(false);
    });
  });
}); 