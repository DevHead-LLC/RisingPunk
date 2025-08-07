import { BattleResponseService } from '../src/services/BattleResponseService';
import { PointTrackingService } from '../src/services/PointTrackingService';
import { Battle, IBattleDocument } from '../src/models/Battle';
import { BattlePhase, NodeOwner, BotType } from '../src/types/battle';

describe('Battle End Data Creation', () => {
  const createMockBattalion = (
    id: string,
    owner: NodeOwner,
    mark: number,
    quantity: number,
    isDestroyed = false
  ) => ({
    id,
    type: BotType.GUARDIAN,
    quantity,
    currentHealth: quantity * 10,
    maxHealth: quantity * 10,
    baseHealthPerUnit: 10,
    isDestroyed,
    destroyedAt: isDestroyed ? Date.now() : undefined,
    position: { x: 0, y: 0, nodeIndex: 0 },
    owner,
    mark,
    stats: {
      health: 10,
      speed: 5,
      range: 3,
      offense: 8,
      defense: 6
    }
  });

  describe('createBattleEndData', () => {
    it('should create battle end data with correct loss calculations', () => {
      const startingBattalions = [
        createMockBattalion('user-1', NodeOwner.USER, 1, 10),
        createMockBattalion('user-2', NodeOwner.USER, 2, 5),
        createMockBattalion('enemy-1', NodeOwner.ENEMY, 1, 8),
        createMockBattalion('enemy-2', NodeOwner.ENEMY, 3, 3)
      ];

      const endingBattalions = [
        createMockBattalion('user-1', NodeOwner.USER, 1, 5), // 5 remaining
        createMockBattalion('user-2', NodeOwner.USER, 2, 0, true), // destroyed
        createMockBattalion('enemy-1', NodeOwner.ENEMY, 1, 2), // 2 remaining
        createMockBattalion('enemy-2', NodeOwner.ENEMY, 3, 0, true) // destroyed
      ];

      const mockBattle = {
        battleId: 'test-battle',
        startingBattalions,
        battalions: endingBattalions,
        winner: NodeOwner.USER,
        phase: BattlePhase.COMPLETE,
        battleTime: 30,
        startTime: new Date(Date.now() - 30000), // 30 seconds ago
        endTime: new Date(),
        save: jest.fn().mockResolvedValue(true)
      } as any;

      // Use reflection to access private method
      const createBattleEndData = (BattleResponseService as any).createBattleEndData.bind(BattleResponseService);
      const battleEndData = createBattleEndData(mockBattle);

      // Verify basic structure
      expect(battleEndData.battleId).toBe('test-battle');
      expect(battleEndData.winner).toBe(NodeOwner.USER);
      expect(battleEndData.phase).toBe(BattlePhase.COMPLETE);
      expect(battleEndData.losses).toBeDefined();

      // Verify loss calculations
      expect(battleEndData.losses.userLosses).toBe(15); // (10 + 10) - (5 + 0) = 15
      expect(battleEndData.losses.enemyLosses).toBe(18); // (8 + 12) - (2 + 0) = 18
      expect(battleEndData.losses.winner).toBe(NodeOwner.USER);
      expect(battleEndData.losses.victoryMessage).toBe('Breach defended!');
      expect(battleEndData.losses.endCondition).toBe('elimination'); // battleTime < 45

      // Verify battalion losses
      expect(battleEndData.losses.battalionLosses).toHaveLength(4);
      
      const userBattalionLoss = battleEndData.losses.battalionLosses.find((b: any) => b.owner === 'user' && b.battalionId === 'user-1');
      expect(userBattalionLoss).toBeDefined();
      expect(userBattalionLoss?.startingQuantity).toBe(10);
      expect(userBattalionLoss?.endingQuantity).toBe(5);
      expect(userBattalionLoss?.losses).toBe(5); // 10 - 5 = 5

      const destroyedUserBattalion = battleEndData.losses.battalionLosses.find((b: any) => b.owner === 'user' && b.battalionId === 'user-2');
      expect(destroyedUserBattalion).toBeDefined();
      expect(destroyedUserBattalion?.endingQuantity).toBe(0);
      expect(destroyedUserBattalion?.losses).toBe(10); // 10 - 0 = 10
    });

    it('should handle timer expiration end condition', () => {
      const startingBattalions = [
        createMockBattalion('user-1', NodeOwner.USER, 1, 10),
        createMockBattalion('enemy-1', NodeOwner.ENEMY, 1, 10)
      ];

      const endingBattalions = [
        createMockBattalion('user-1', NodeOwner.USER, 1, 10), // No losses
        createMockBattalion('enemy-1', NodeOwner.ENEMY, 1, 10) // No losses
      ];

      const mockBattle = {
        battleId: 'test-battle',
        startingBattalions,
        battalions: endingBattalions,
        winner: NodeOwner.USER,
        phase: BattlePhase.COMPLETE,
        battleTime: 50, // > 45 seconds
        startTime: new Date(Date.now() - 50000),
        endTime: new Date(),
        save: jest.fn().mockResolvedValue(true)
      } as any;

      const createBattleEndData = (BattleResponseService as any).createBattleEndData.bind(BattleResponseService);
      const battleEndData = createBattleEndData(mockBattle);

      expect(battleEndData.losses.endCondition).toBe('timer');
      expect(battleEndData.losses.userLosses).toBe(0);
      expect(battleEndData.losses.enemyLosses).toBe(0);
      expect(battleEndData.losses.winner).toBe(NodeOwner.USER); // Defender wins ties
    });

    it('should determine correct victory message based on winner', () => {
      const startingBattalions = [
        createMockBattalion('user-1', NodeOwner.USER, 2, 10),
        createMockBattalion('enemy-1', NodeOwner.ENEMY, 1, 10)
      ];

      const endingBattalions = [
        createMockBattalion('user-1', NodeOwner.USER, 2, 0, true), // Destroyed
        createMockBattalion('enemy-1', NodeOwner.ENEMY, 1, 5) // Some losses
      ];

      const mockBattle = {
        battleId: 'test-battle',
        startingBattalions,
        battalions: endingBattalions,
        winner: NodeOwner.ENEMY,
        phase: BattlePhase.COMPLETE,
        battleTime: 30,
        startTime: new Date(Date.now() - 30000),
        endTime: new Date(),
        save: jest.fn().mockResolvedValue(true)
      } as any;

      const createBattleEndData = (BattleResponseService as any).createBattleEndData.bind(BattleResponseService);
      const battleEndData = createBattleEndData(mockBattle);

      expect(battleEndData.losses.victoryMessage).toBe('Attacker breach!');
      expect(battleEndData.losses.winner).toBe(NodeOwner.ENEMY);
    });
  });
}); 