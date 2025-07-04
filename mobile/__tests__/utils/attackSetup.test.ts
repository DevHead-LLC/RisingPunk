import { setupAttackIfInRange } from '../../src/utils/attackSetup';

describe('attackSetup', () => {
  const mockSetupAttacks = jest.fn();
  const mockMoveBattalionAlongPath = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupAttackIfInRange', () => {
    const baseParams = {
      battalion: { type: 'test', quantity: 10 },
      target: { type: 'node', index: 1, position: { x: 100, y: 100 } },
      currentPos: { x: 50, y: 50 },
      range: 100,
      isUser: true,
      userBattalions: [],
      enemyBattalions: [],
      setupAttacks: mockSetupAttacks,
      moveBattalionAlongPath: mockMoveBattalionAlongPath,
      battalionId: 'test-battalion',
      attackIntervals: {},
      cleanupBattalion: jest.fn(),
      nodeRefs: {},
      nodes: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      findAvailableTargets: jest.fn(),
      setUserBattalions: jest.fn(),
      setEnemyBattalions: jest.fn()
    };

    it('should set up attacks when battalion is in range of node', () => {
      const result = setupAttackIfInRange(
        baseParams.battalion,
        baseParams.target,
        baseParams.currentPos,
        baseParams.range,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.setupAttacks,
        baseParams.moveBattalionAlongPath,
        baseParams.battalionId,
        baseParams.attackIntervals,
        baseParams.cleanupBattalion,
        baseParams.nodeRefs,
        baseParams.nodes,
        baseParams.findAvailableTargets,
        baseParams.setUserBattalions,
        baseParams.setEnemyBattalions
      );

      expect(result.attackSetUp).toBe(true);
      expect(result.shouldMove).toBe(false);
      expect(result.actionTaken).toBe('attack');
      expect(mockSetupAttacks).toHaveBeenCalled();
      expect(mockMoveBattalionAlongPath).not.toHaveBeenCalled();
    });

    it('should move battalion when out of range of node', () => {
      const farTarget = { type: 'node', index: 1, position: { x: 200, y: 200 } };
      
      const result = setupAttackIfInRange(
        baseParams.battalion,
        farTarget,
        baseParams.currentPos,
        baseParams.range,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.setupAttacks,
        baseParams.moveBattalionAlongPath,
        baseParams.battalionId,
        baseParams.attackIntervals,
        baseParams.cleanupBattalion,
        baseParams.nodeRefs,
        baseParams.nodes,
        baseParams.findAvailableTargets,
        baseParams.setUserBattalions,
        baseParams.setEnemyBattalions
      );

      expect(result.attackSetUp).toBe(false);
      expect(result.shouldMove).toBe(false);
      expect(result.actionTaken).toBe('none');
      expect(mockSetupAttacks).not.toHaveBeenCalled();
      expect(mockMoveBattalionAlongPath).not.toHaveBeenCalled();
    });

    it('should set up attacks when battalion is in range of enemy battalion', () => {
      const battalionTarget = { type: 'battalion', index: 0, position: { x: 80, y: 80 } };
      const enemyBattalions = [{ 
        type: 'enemy', 
        position: { x: { _value: 80 }, y: { _value: 80 } } 
      }];

      const result = setupAttackIfInRange(
        baseParams.battalion,
        battalionTarget,
        baseParams.currentPos,
        baseParams.range,
        baseParams.isUser,
        baseParams.userBattalions,
        enemyBattalions,
        baseParams.setupAttacks,
        baseParams.moveBattalionAlongPath,
        baseParams.battalionId,
        baseParams.attackIntervals,
        baseParams.cleanupBattalion,
        baseParams.nodeRefs,
        baseParams.nodes,
        baseParams.findAvailableTargets,
        baseParams.setUserBattalions,
        baseParams.setEnemyBattalions
      );

      expect(result.attackSetUp).toBe(true);
      expect(result.shouldMove).toBe(false);
      expect(result.actionTaken).toBe('attack');
      expect(mockSetupAttacks).toHaveBeenCalled();
      expect(mockMoveBattalionAlongPath).not.toHaveBeenCalled();
    });

    it('should move battalion when out of range of enemy battalion', () => {
      const battalionTarget = { type: 'battalion', index: 0, position: { x: 200, y: 200 } };
      const enemyBattalions = [{ 
        type: 'enemy', 
        position: { x: { _value: 200 }, y: { _value: 200 } } 
      }];

      const result = setupAttackIfInRange(
        baseParams.battalion,
        battalionTarget,
        baseParams.currentPos,
        baseParams.range,
        baseParams.isUser,
        baseParams.userBattalions,
        enemyBattalions,
        baseParams.setupAttacks,
        baseParams.moveBattalionAlongPath,
        baseParams.battalionId,
        baseParams.attackIntervals,
        baseParams.cleanupBattalion,
        baseParams.nodeRefs,
        baseParams.nodes,
        baseParams.findAvailableTargets,
        baseParams.setUserBattalions,
        baseParams.setEnemyBattalions
      );

      expect(result.attackSetUp).toBe(false);
      expect(result.shouldMove).toBe(true);
      expect(result.actionTaken).toBe('move');
      expect(result.updatedTarget).toBeDefined();
      expect(mockSetupAttacks).not.toHaveBeenCalled();
      expect(mockMoveBattalionAlongPath).toHaveBeenCalled();
    });
  });
}); 