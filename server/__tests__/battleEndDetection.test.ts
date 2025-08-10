import { BattleService } from '../src/services/BattleService';
import { Battle, IBattleDocument } from '../src/models/Battle';
import { BattlePhase, NodeOwner, BotType } from '../src/types/battle';
import { CombatService } from '../src/services/CombatService';
import { PointTrackingService } from '../src/services/PointTrackingService';
import { User } from '../src/models/User';

// Mock dependencies
jest.mock('../src/services/BattleTimer');
jest.mock('../src/services/BattalionService');
jest.mock('../src/services/BattleSetupService');
jest.mock('../src/services/AttackService');
jest.mock('../src/services/ScreenDimensionService');
jest.mock('../src/services/CombatService');
jest.mock('../src/services/PointTrackingService');
jest.mock('../src/models/User');

describe('Battle End Detection', () => {
  let battleService: BattleService;

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('Complete Elimination Detection', () => {
    it('should detect when all user battalions are defeated', () => {
      const battalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10, true),
        createMockBattalion('b2', NodeOwner.USER, 2, 5, true),
        createMockBattalion('b3', NodeOwner.ENEMY, 3, 8, false)
      ];

      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: true,
        enemyEliminated: false
      });

      const result = CombatService.checkCompleteElimination(battalions);
      expect(result.userEliminated).toBe(true);
      expect(result.enemyEliminated).toBe(false);
    });

    it('should detect when all enemy battalions are defeated', () => {
      const battalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10, false),
        createMockBattalion('b2', NodeOwner.ENEMY, 2, 5, true),
        createMockBattalion('b3', NodeOwner.ENEMY, 3, 8, true)
      ];

      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: false,
        enemyEliminated: true
      });

      const result = CombatService.checkCompleteElimination(battalions);
      expect(result.userEliminated).toBe(false);
      expect(result.enemyEliminated).toBe(true);
    });

    it('should detect when both sides are eliminated', () => {
      const battalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10, true),
        createMockBattalion('b2', NodeOwner.ENEMY, 2, 5, true)
      ];

      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: true,
        enemyEliminated: true
      });

      const result = CombatService.checkCompleteElimination(battalions);
      expect(result.userEliminated).toBe(true);
      expect(result.enemyEliminated).toBe(true);
    });

    it('should detect when no side is eliminated', () => {
      const battalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10, false),
        createMockBattalion('b2', NodeOwner.ENEMY, 2, 5, false)
      ];

      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: false,
        enemyEliminated: false
      });

      const result = CombatService.checkCompleteElimination(battalions);
      expect(result.userEliminated).toBe(false);
      expect(result.enemyEliminated).toBe(false);
    });

    it('should handle mixed destroyed and active battalions', () => {
      const battalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10, true),
        createMockBattalion('b2', NodeOwner.USER, 2, 5, false),
        createMockBattalion('b3', NodeOwner.ENEMY, 3, 8, true),
        createMockBattalion('b4', NodeOwner.ENEMY, 4, 6, false)
      ];

      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: false,
        enemyEliminated: false
      });

      const result = CombatService.checkCompleteElimination(battalions);
      expect(result.userEliminated).toBe(false);
      expect(result.enemyEliminated).toBe(false);
    });
  });

  describe('Hack Rig Unlock on Victory', () => {
    it('should unlock hack rig when user wins by elimination', async () => {
      const validObjectId = '507f1f77bcf86cd799439011';
      
      const mockBattle = {
        battleId: 'test-battle',
        attackerId: validObjectId,
         unlockHackRigOnWin: true,
        battalions: [
          createMockBattalion('b1', NodeOwner.USER, 1, 10, false),
          createMockBattalion('b2', NodeOwner.ENEMY, 2, 5, true)
        ],
        startingBattalions: [
          createMockBattalion('b1', NodeOwner.USER, 1, 10),
          createMockBattalion('b2', NodeOwner.ENEMY, 2, 5)
        ],
        save: jest.fn().mockResolvedValue(true)
      } as any;

      const mockUser = {
        _id: validObjectId,
        unlockedFeatures: { hackRig: false },
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(battleService, 'getBattle').mockResolvedValue(mockBattle);
      jest.spyOn(battleService, 'endBattle').mockResolvedValue(mockBattle);
      
      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: false,
        enemyEliminated: true
      });

      const { PointTrackingService } = require('../src/services/PointTrackingService');
      PointTrackingService.calculateBattleLosses.mockReturnValue({
        userLosses: 0,
        enemyLosses: 10,
        winner: NodeOwner.USER,
        userStartingPoints: 10,
        userEndingPoints: 10,
        enemyStartingPoints: 10,
        enemyEndingPoints: 0
      });

      const { User } = require('../src/models/User');
      User.findById.mockResolvedValue(mockUser);

      const unlockSpy = jest.spyOn(battleService as any, 'unlockHackRigForUser');

      await (battleService as any).handleBattleEnd('test-battle');

      expect(unlockSpy).toHaveBeenCalledWith(validObjectId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.unlockedFeatures.hackRig).toBe(true);
    });

    it('should not unlock hack rig when user wins by timer', async () => {
      const validObjectId = '507f1f77bcf86cd799439012';
      
      const mockBattle = {
        battleId: 'test-battle',
        attackerId: validObjectId,
        battalions: [
          createMockBattalion('b1', NodeOwner.USER, 1, 10, false),
          createMockBattalion('b2', NodeOwner.ENEMY, 2, 5, false)
        ],
        startingBattalions: [
          createMockBattalion('b1', NodeOwner.USER, 1, 10),
          createMockBattalion('b2', NodeOwner.ENEMY, 2, 5)
        ],
        save: jest.fn().mockResolvedValue(true)
      } as any;

      jest.spyOn(battleService, 'getBattle').mockResolvedValue(mockBattle);
      jest.spyOn(battleService, 'endBattle').mockResolvedValue(mockBattle);
      
      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: false,
        enemyEliminated: false
      });

      const { PointTrackingService } = require('../src/services/PointTrackingService');
      PointTrackingService.calculateBattleLosses.mockReturnValue({
        userLosses: 2,
        enemyLosses: 5,
        winner: NodeOwner.USER,
        userStartingPoints: 10,
        userEndingPoints: 8,
        enemyStartingPoints: 10,
        enemyEndingPoints: 5
      });

      const unlockSpy = jest.spyOn(battleService as any, 'unlockHackRigForUser');

      await (battleService as any).handleBattleEnd('test-battle');

      expect(unlockSpy).not.toHaveBeenCalled();
    });

    it('should not unlock hack rig when enemy wins', async () => {
      const validObjectId = '507f1f77bcf86cd799439013';
      
      const mockBattle = {
        battleId: 'test-battle',
        attackerId: validObjectId,
        battalions: [
          createMockBattalion('b1', NodeOwner.USER, 1, 10, true),
          createMockBattalion('b2', NodeOwner.ENEMY, 2, 5, false)
        ],
        startingBattalions: [
          createMockBattalion('b1', NodeOwner.USER, 1, 10),
          createMockBattalion('b2', NodeOwner.ENEMY, 2, 5)
        ],
        save: jest.fn().mockResolvedValue(true)
      } as any;

      jest.spyOn(battleService, 'getBattle').mockResolvedValue(mockBattle);
      jest.spyOn(battleService, 'endBattle').mockResolvedValue(mockBattle);
      
      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: true,
        enemyEliminated: false
      });

      const unlockSpy = jest.spyOn(battleService as any, 'unlockHackRigForUser');

      await (battleService as any).handleBattleEnd('test-battle');

      expect(unlockSpy).not.toHaveBeenCalled();
    });
  });

  describe('Battle End Detection', () => {
    it('should detect battle end when all battalions are destroyed', async () => {
      const mockBattle = {
        battleId: 'test-battle',
        phase: BattlePhase.ACTIVE,
        battalions: [
          createMockBattalion('b1', NodeOwner.USER, 1, 10, true),
          createMockBattalion('b2', NodeOwner.ENEMY, 2, 5, true)
        ]
      } as any;

      jest.spyOn(battleService, 'getBattle').mockResolvedValue(mockBattle);
      
      const { CombatService } = require('../src/services/CombatService');
      CombatService.checkCompleteElimination.mockReturnValue({
        userEliminated: true,
        enemyEliminated: true
      });

      const result = await battleService.checkBattleEndConditions('test-battle');
      
      expect(result.shouldEnd).toBe(true);
      expect(result.endCondition).toBe('elimination');
    });

    it('should return battle state with winner when battle is complete', async () => {
      const mockBattle = {
        battleId: 'test-battle',
        phase: BattlePhase.COMPLETE,
        winner: NodeOwner.USER,
        battalions: []
      } as any;

      jest.spyOn(battleService, 'getBattle').mockResolvedValue(mockBattle);

      const result = await battleService.checkBattleEndConditions('test-battle');
      
      expect(result.shouldEnd).toBe(false);
    });
  });
}); 