import { BattleService } from '../src/services/BattleService';
import { Battle, IBattleDocument } from '../src/models/Battle';
import { BattlePhase, NodeOwner, BotType } from '../src/types/battle';
import { PointTrackingService } from '../src/services/PointTrackingService';

// Mock dependencies
jest.mock('../src/services/BattleTimer');
jest.mock('../src/services/BattalionService');
jest.mock('../src/services/BattleSetupService');
jest.mock('../src/services/AttackService');
jest.mock('../src/services/ScreenDimensionService');

describe('BattleService Loss Tracking Integration', () => {
  let battleService: BattleService;

  beforeEach(() => {
    battleService = new BattleService();
  });

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

  describe('handleBattleEnd', () => {
    it('should determine winner based on losses instead of hardcoded ENEMY', async () => {
      // Create a mock battle with starting and ending states
      const startingBattalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10), // 10 points
        createMockBattalion('b2', NodeOwner.ENEMY, 2, 5)  // 10 points
      ];

      const endingBattalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 5),  // 5 points remaining
        createMockBattalion('b2', NodeOwner.ENEMY, 2, 0, true) // 0 points (destroyed)
      ];

      const mockBattle = {
        battleId: 'test-battle',
        startingBattalions,
        battalions: endingBattalions,
        save: jest.fn().mockResolvedValue(true)
      } as any;

      // Mock getBattle to return our test battle
      jest.spyOn(battleService, 'getBattle').mockResolvedValue(mockBattle);
      
      // Mock endBattle to capture the winner parameter
      const endBattleSpy = jest.spyOn(battleService, 'endBattle').mockResolvedValue(mockBattle);

      // Call handleBattleEnd
      await (battleService as any).handleBattleEnd('test-battle');

      // Verify that endBattle was called with the correct winner
      expect(endBattleSpy).toHaveBeenCalledWith('test-battle', NodeOwner.USER);
      
      // Verify the loss calculation logic
      const battleLosses = PointTrackingService.calculateBattleLosses(startingBattalions, endingBattalions);
      expect(battleLosses.userLosses).toBe(5); // 10 - 5 = 5 losses
      expect(battleLosses.enemyLosses).toBe(10); // 10 - 0 = 10 losses
      expect(battleLosses.winner).toBe(NodeOwner.USER); // User has fewer losses
    });

    it('should determine enemy winner when enemy has fewer losses', async () => {
      const startingBattalions = [
        createMockBattalion('b1', NodeOwner.USER, 2, 10), // 20 points
        createMockBattalion('b2', NodeOwner.ENEMY, 1, 10)  // 10 points
      ];

      const endingBattalions = [
        createMockBattalion('b1', NodeOwner.USER, 2, 0, true), // 0 points (destroyed)
        createMockBattalion('b2', NodeOwner.ENEMY, 1, 5)  // 5 points remaining
      ];

      const mockBattle = {
        battleId: 'test-battle',
        startingBattalions,
        battalions: endingBattalions,
        save: jest.fn().mockResolvedValue(true)
      } as any;

      jest.spyOn(battleService, 'getBattle').mockResolvedValue(mockBattle);
      const endBattleSpy = jest.spyOn(battleService, 'endBattle').mockResolvedValue(mockBattle);

      await (battleService as any).handleBattleEnd('test-battle');

      expect(endBattleSpy).toHaveBeenCalledWith('test-battle', NodeOwner.ENEMY);
      
      const battleLosses = PointTrackingService.calculateBattleLosses(startingBattalions, endingBattalions);
      expect(battleLosses.userLosses).toBe(20); // 20 - 0 = 20 losses
      expect(battleLosses.enemyLosses).toBe(5); // 10 - 5 = 5 losses
      expect(battleLosses.winner).toBe(NodeOwner.ENEMY); // Enemy has fewer losses
    });
  });
}); 