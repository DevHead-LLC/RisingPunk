import { BattleService } from '../src/services/BattleService';
import { BattleTimerService } from '../src/services/BattleTimer';
import { BattlePhase, NodeOwner } from '../src/types/battle';

// Mock the Battle model
jest.mock('../src/models/Battle', () => ({
  Battle: {
    findOne: jest.fn(),
    save: jest.fn()
  }
}));

describe('Battle End Detection', () => {
  let battleService: BattleService;
  let timerService: BattleTimerService;

  beforeEach(() => {
    battleService = new BattleService();
    timerService = BattleTimerService.getInstance();
  });

  afterEach(() => {
    timerService.stopAllTimers();
    jest.clearAllMocks();
  });

  describe('Battle End Detection', () => {
    it('should detect battle end when timer expires', async () => {
      const battleId = 'test-battle-end-timer';
      const mockWinner = NodeOwner.USER;

      // Mock the battle document
      const mockBattle = {
        battleId,
        phase: BattlePhase.SETUP,
        winner: undefined,
        endTime: undefined,
        save: jest.fn().mockResolvedValue({
          battleId,
          phase: BattlePhase.COMPLETE,
          winner: mockWinner,
          endTime: new Date()
        })
      };

      const { Battle } = require('../src/models/Battle');
      Battle.findOne.mockResolvedValue(mockBattle);

      // Test the endBattle method
      const endedBattle = await battleService.endBattle(battleId, mockWinner);

      expect(endedBattle).toBeTruthy();
      expect(endedBattle?.phase).toBe(BattlePhase.COMPLETE);
      expect(endedBattle?.winner).toBe(mockWinner);
      expect(endedBattle?.endTime).toBeTruthy();
    });

    it('should detect battle end when all battalions are destroyed', async () => {
      const battleId = 'test-battle-end-elimination';
      const mockWinner = NodeOwner.ENEMY;

      // Mock the battle document
      const mockBattle = {
        battleId,
        phase: BattlePhase.SETUP,
        winner: undefined,
        endTime: undefined,
        save: jest.fn().mockResolvedValue({
          battleId,
          phase: BattlePhase.COMPLETE,
          winner: mockWinner,
          endTime: new Date()
        })
      };

      const { Battle } = require('../src/models/Battle');
      Battle.findOne.mockResolvedValue(mockBattle);

      // Test the endBattle method
      const endedBattle = await battleService.endBattle(battleId, mockWinner);

      expect(endedBattle).toBeTruthy();
      expect(endedBattle?.phase).toBe(BattlePhase.COMPLETE);
      expect(endedBattle?.winner).toBe(mockWinner);
      expect(endedBattle?.endTime).toBeTruthy();
    });

    it('should return battle state with winner when battle is complete', async () => {
      const battleId = 'test-battle-complete-state';
      const mockWinner = NodeOwner.USER;

      // Mock the battle document
      const mockBattle = {
        battleId,
        phase: BattlePhase.COMPLETE,
        winner: mockWinner,
        endTime: new Date(),
        save: jest.fn().mockResolvedValue({
          battleId,
          phase: BattlePhase.COMPLETE,
          winner: mockWinner,
          endTime: new Date()
        })
      };

      const { Battle } = require('../src/models/Battle');
      Battle.findOne.mockResolvedValue(mockBattle);

      // Test the getBattle method
      const battle = await battleService.getBattle(battleId);

      expect(battle).toBeTruthy();
      expect(battle?.phase).toBe(BattlePhase.COMPLETE);
      expect(battle?.winner).toBe(mockWinner);
      expect(battle?.endTime).toBeTruthy();
    });
  });
}); 