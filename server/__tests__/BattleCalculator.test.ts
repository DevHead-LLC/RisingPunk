import { BattleCalculator } from '../src/services/BattleCalculator';
import { BotType, NodeOwner, IBattalion, INode } from '../src/types/battle';

describe('BattleCalculator', () => {
  let calculator: BattleCalculator;

  beforeEach(() => {
    calculator = new BattleCalculator();
  });

  describe('calculateDamage', () => {
    it('should calculate damage correctly for Guardian vs Breacher', () => {
      const attacker: IBattalion = {
        id: 'attacker-1',
        type: BotType.GUARDIAN,
        quantity: 10,
        currentHealth: 140,
        maxHealth: 140,
        position: { x: 0, y: 0, nodeIndex: 0 },
        owner: NodeOwner.USER,
        mark: 1,
        stats: {
          health: 14,
          speed: 2,
          range: 1,
          offense: 8,
          defense: 0.8
        }
      };

      const defender: IBattalion = {
        id: 'defender-1',
        type: BotType.BREACHER,
        quantity: 5,
        currentHealth: 90,
        maxHealth: 90,
        position: { x: 1, y: 1, nodeIndex: 1 },
        owner: NodeOwner.ENEMY,
        mark: 1,
        stats: {
          health: 18,
          speed: 3,
          range: 2,
          offense: 20,
          defense: 0.6
        }
      };

      const damage = calculator.calculateDamage(attacker, defender);
      
      // Expected: Attack Power (8 * 10) / (Defense % 0.6 * 100) = 80 / 60 = 1.33, then Math.floor = 1
      expect(damage).toBe(1);
    });

    it('should handle high defense values correctly', () => {
      const attacker: IBattalion = {
        id: 'attacker-1',
        type: BotType.PHREAK,
        quantity: 8,
        currentHealth: 96,
        maxHealth: 96,
        position: { x: 0, y: 0, nodeIndex: 0 },
        owner: NodeOwner.USER,
        mark: 1,
        stats: {
          health: 12,
          speed: 4,
          range: 3,
          offense: 15,
          defense: 0.5
        }
      };

      const defender: IBattalion = {
        id: 'defender-1',
        type: BotType.GUARDIAN,
        quantity: 10,
        currentHealth: 140,
        maxHealth: 140,
        position: { x: 1, y: 1, nodeIndex: 1 },
        owner: NodeOwner.ENEMY,
        mark: 1,
        stats: {
          health: 14,
          speed: 2,
          range: 1,
          offense: 8,
          defense: 0.9 // High defense
        }
      };

      const damage = calculator.calculateDamage(attacker, defender);
      
      // Expected: Attack Power (15 * 8) / (Defense % 0.9 * 100) = 120 / 90 = 1.33, then Math.floor = 1
      expect(damage).toBe(1);
    });
  });

  describe('checkVictoryConditions', () => {
    it('should return null when no victory conditions are met', () => {
      const battalions: IBattalion[] = [
        {
          id: 'user-1',
          type: BotType.GUARDIAN,
          quantity: 10,
          currentHealth: 140,
          maxHealth: 140,
          position: { x: 0, y: 0, nodeIndex: 0 },
          owner: NodeOwner.USER,
          mark: 1,
          stats: { health: 14, speed: 2, range: 1, offense: 8, defense: 0.8 }
        },
        {
          id: 'enemy-1',
          type: BotType.BREACHER,
          quantity: 5,
          currentHealth: 90,
          maxHealth: 90,
          position: { x: 1, y: 1, nodeIndex: 1 },
          owner: NodeOwner.ENEMY,
          mark: 1,
          stats: { health: 18, speed: 3, range: 2, offense: 20, defense: 0.6 }
        }
      ];

      const nodes: INode[] = [];
      const battleTime = 10; // 10 seconds elapsed

      const winner = calculator.checkVictoryConditions(battalions, nodes, battleTime);
      expect(winner).toBeNull();
    });

    it('should return defender when battle time reaches 20 seconds', () => {
      const battalions: IBattalion[] = [
        {
          id: 'user-1',
          type: BotType.GUARDIAN,
          quantity: 10,
          currentHealth: 140,
          maxHealth: 140,
          position: { x: 0, y: 0, nodeIndex: 0 },
          owner: NodeOwner.USER,
          mark: 1,
          stats: { health: 14, speed: 2, range: 1, offense: 8, defense: 0.8 }
        },
        {
          id: 'enemy-1',
          type: BotType.BREACHER,
          quantity: 5,
          currentHealth: 90,
          maxHealth: 90,
          position: { x: 1, y: 1, nodeIndex: 1 },
          owner: NodeOwner.ENEMY,
          mark: 1,
          stats: { health: 18, speed: 3, range: 2, offense: 20, defense: 0.6 }
        }
      ];

      const nodes: INode[] = [];
      const battleTime = 20; // 20 seconds elapsed

      const winner = calculator.checkVictoryConditions(battalions, nodes, battleTime);
      expect(winner).toBe('defender'); // Defender wins on timeout
    });
  });
}); 