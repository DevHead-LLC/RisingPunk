import { validateAndRetarget, isInRange } from '../../src/utils/targetValidation';
import { isNeutral } from '../../src/utils/nodeOwnership';

// Mock the nodeOwnership module
jest.mock('../../src/utils/nodeOwnership');
const mockIsNeutral = isNeutral as jest.MockedFunction<typeof isNeutral>;

describe('targetValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndRetarget', () => {
    const mockFindAvailableTargets = jest.fn();
    const mockMoveBattalionAlongPath = jest.fn();
    const mockCleanupBattalion = jest.fn();

    const baseParams = {
      battalion: { quantity: 10, currentHealth: 100, targetNode: 1 },
      target: { type: 'node', index: 1, position: { x: 100, y: 100 } },
      nodes: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      currentPos: { x: 50, y: 50 },
      range: 50,
      isUser: true,
      userBattalions: [],
      enemyBattalions: [],
      findAvailableTargets: mockFindAvailableTargets,
      moveBattalionAlongPath: mockMoveBattalionAlongPath,
      cleanupBattalion: mockCleanupBattalion,
      battalionId: 'test-battalion',
      attackIntervals: {}
    };

    it('should return valid when battalion and target are healthy', () => {
      mockIsNeutral.mockReturnValue(true);

      const result = validateAndRetarget(
        baseParams.battalion,
        baseParams.target,
        baseParams.nodes,
        baseParams.currentPos,
        baseParams.range,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.findAvailableTargets,
        baseParams.moveBattalionAlongPath,
        baseParams.cleanupBattalion,
        baseParams.battalionId,
        baseParams.attackIntervals
      );

      expect(result.isValid).toBe(true);
      expect(result.shouldRetarget).toBe(false);
      expect(result.actionTaken).toBe('none');
      expect(mockCleanupBattalion).not.toHaveBeenCalled();
      expect(mockMoveBattalionAlongPath).not.toHaveBeenCalled();
    });

    it('should cleanup when battalion is dead', () => {
      const deadBattalion = { ...baseParams.battalion, quantity: 0 };

      const result = validateAndRetarget(
        deadBattalion,
        baseParams.target,
        baseParams.nodes,
        baseParams.currentPos,
        baseParams.range,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.findAvailableTargets,
        baseParams.moveBattalionAlongPath,
        baseParams.cleanupBattalion,
        baseParams.battalionId,
        baseParams.attackIntervals
      );

      expect(result.isValid).toBe(false);
      expect(result.shouldRetarget).toBe(false);
      expect(result.actionTaken).toBe('cleaned_up');
      expect(mockCleanupBattalion).toHaveBeenCalledWith('test-battalion', {});
    });

    it('should retarget when node is no longer neutral', () => {
      // First call (original target) returns false, second call (new target) returns true
      mockIsNeutral.mockReturnValueOnce(false).mockReturnValueOnce(true);
      mockFindAvailableTargets.mockReturnValue([
        { type: 'node', index: 2, position: { x: 200, y: 200 } }
      ]);

      const result = validateAndRetarget(
        baseParams.battalion,
        baseParams.target,
        baseParams.nodes,
        baseParams.currentPos,
        baseParams.range,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.findAvailableTargets,
        baseParams.moveBattalionAlongPath,
        baseParams.cleanupBattalion,
        baseParams.battalionId,
        baseParams.attackIntervals
      );

      expect(result.isValid).toBe(false);
      expect(result.shouldRetarget).toBe(true);
      expect(result.actionTaken).toBe('retargeted');
      expect(mockFindAvailableTargets).toHaveBeenCalled();
      expect(mockMoveBattalionAlongPath).toHaveBeenCalled();
    });

    it('should retarget when enemy battalion is dead', () => {
      const battalionTarget = { type: 'battalion', index: 0, position: { x: 100, y: 100 } };
      const deadEnemyBattalions = [{ quantity: 0, currentHealth: 0, position: { x: 100, y: 100 } }];
      
      mockFindAvailableTargets.mockReturnValue([
        { type: 'node', index: 2, position: { x: 200, y: 200 } }
      ]);

      const result = validateAndRetarget(
        baseParams.battalion,
        battalionTarget,
        baseParams.nodes,
        baseParams.currentPos,
        baseParams.range,
        baseParams.isUser,
        baseParams.userBattalions,
        deadEnemyBattalions,
        baseParams.findAvailableTargets,
        baseParams.moveBattalionAlongPath,
        baseParams.cleanupBattalion,
        baseParams.battalionId,
        baseParams.attackIntervals
      );

      expect(result.isValid).toBe(false);
      expect(result.shouldRetarget).toBe(true);
      expect(result.actionTaken).toBe('retargeted');
      expect(mockFindAvailableTargets).toHaveBeenCalled();
      expect(mockMoveBattalionAlongPath).toHaveBeenCalled();
    });
  });

  describe('isInRange', () => {
    it('should return true when battalion is in range of node', () => {
      const target = { type: 'node', position: { x: 100, y: 100 } };
      const currentPos = { x: 50, y: 50 };
      const range = 100;

      const result = isInRange(currentPos, target, range, true, [], []);

      expect(result).toBe(true);
    });

    it('should return false when battalion is out of range of node', () => {
      const target = { type: 'node', position: { x: 200, y: 200 } };
      const currentPos = { x: 50, y: 50 };
      const range = 100;

      const result = isInRange(currentPos, target, range, true, [], []);

      expect(result).toBe(false);
    });

    it('should return true when battalion is in range of enemy battalion', () => {
      const target = { type: 'battalion', index: 0 };
      const currentPos = { x: 50, y: 50 };
      const range = 100;
      const enemyBattalions = [{
        position: { x: { _value: 100 }, y: { _value: 100 } }
      }];

      const result = isInRange(currentPos, target, range, true, [], enemyBattalions);

      expect(result).toBe(true);
    });

    it('should return false when enemy battalion does not exist', () => {
      const target = { type: 'battalion', index: 0 };
      const currentPos = { x: 50, y: 50 };
      const range = 100;

      const result = isInRange(currentPos, target, range, true, [], []);

      expect(result).toBe(false);
    });
  });
}); 