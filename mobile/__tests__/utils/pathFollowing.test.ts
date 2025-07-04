import { continuePathIfNeeded } from '../../src/utils/pathFollowing';

describe('pathFollowing', () => {
  const mockMoveBattalionAlongPath = jest.fn();
  const mockDebugLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('continuePathIfNeeded', () => {
    const baseParams = {
      battalion: {
        remainingPath: [2, 3, 4],
        finalTarget: 4,
        nodeIndex: 1
      },
      target: { type: 'node', index: 1, position: { x: 100, y: 100 } },
      nodes: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 },
        { x: 400, y: 400 }
      ],
      moveBattalionAlongPath: mockMoveBattalionAlongPath,
      isUser: true,
      userBattalions: [],
      enemyBattalions: [],
      debugLog: mockDebugLog,
      battalionId: 'test-battalion'
    };

    it('should continue path when remaining path exists', () => {
      const result = continuePathIfNeeded(
        baseParams.battalion,
        baseParams.target,
        baseParams.nodes,
        baseParams.moveBattalionAlongPath,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.debugLog,
        baseParams.battalionId
      );

      expect(result.pathContinued).toBe(true);
      expect(result.pathCompleted).toBe(false);
      expect(result.actionTaken).toBe('continue');
      expect(result.nextTarget).toEqual({
        type: 'node',
        index: 2,
        distance: 0,
        position: { x: 200, y: 200 }
      });
      expect(mockMoveBattalionAlongPath).toHaveBeenCalled();
      expect(mockDebugLog).toHaveBeenCalledTimes(3);
    });

    it('should complete path when final target is reached', () => {
      const battalionAtFinalTarget = {
        remainingPath: [],
        finalTarget: 1,
        nodeIndex: 0
      };

      const result = continuePathIfNeeded(
        battalionAtFinalTarget,
        baseParams.target,
        baseParams.nodes,
        baseParams.moveBattalionAlongPath,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.debugLog,
        baseParams.battalionId
      );

      expect(result.pathContinued).toBe(false);
      expect(result.pathCompleted).toBe(true);
      expect(result.actionTaken).toBe('complete');
      expect(mockMoveBattalionAlongPath).not.toHaveBeenCalled();
      expect(mockDebugLog).not.toHaveBeenCalled();
    });

    it('should do nothing when no path exists', () => {
      const battalionNoPath = {
        remainingPath: undefined,
        finalTarget: undefined,
        nodeIndex: 1
      };

      const result = continuePathIfNeeded(
        battalionNoPath,
        baseParams.target,
        baseParams.nodes,
        baseParams.moveBattalionAlongPath,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.debugLog,
        baseParams.battalionId
      );

      expect(result.pathContinued).toBe(false);
      expect(result.pathCompleted).toBe(false);
      expect(result.actionTaken).toBe('none');
      expect(mockMoveBattalionAlongPath).not.toHaveBeenCalled();
      expect(mockDebugLog).not.toHaveBeenCalled();
    });

    it('should update battalion nodeIndex when continuing path', () => {
      const battalion = {
        remainingPath: [2],
        finalTarget: 2,
        nodeIndex: 0
      };

      continuePathIfNeeded(
        battalion,
        baseParams.target,
        baseParams.nodes,
        baseParams.moveBattalionAlongPath,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.debugLog,
        baseParams.battalionId
      );

      expect(battalion.nodeIndex).toBe(1);
      expect(battalion.remainingPath).toEqual([]);
    });

    it('should clear path state when final target is reached', () => {
      const battalion = {
        remainingPath: [],
        finalTarget: 1,
        nodeIndex: 0
      };

      continuePathIfNeeded(
        battalion,
        baseParams.target,
        baseParams.nodes,
        baseParams.moveBattalionAlongPath,
        baseParams.isUser,
        baseParams.userBattalions,
        baseParams.enemyBattalions,
        baseParams.debugLog,
        baseParams.battalionId
      );

      expect(battalion.remainingPath).toBeUndefined();
      expect(battalion.finalTarget).toBeUndefined();
    });
  });
}); 