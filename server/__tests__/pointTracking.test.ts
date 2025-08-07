import { PointTrackingService } from '../src/services/PointTrackingService';
import { IBattalion, NodeOwner, BotType } from '../src/types/battle';

describe('PointTrackingService', () => {
  const createMockBattalion = (
    id: string,
    owner: NodeOwner,
    mark: number,
    quantity: number,
    currentHealth?: number,
    isDestroyed = false
  ): IBattalion => ({
    id,
    type: BotType.GUARDIAN,
    quantity,
    currentHealth: currentHealth || (quantity * 10),
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

  describe('calculateBattalionPoints', () => {
    it('should calculate points correctly for Mark 1 battalion', () => {
      const battalion = createMockBattalion('b1', NodeOwner.USER, 1, 10);
      const points = PointTrackingService.calculateBattalionPoints(battalion);
      expect(points).toBe(10); // Mark 1 × 10 bots = 10 points
    });

    it('should calculate points correctly for Mark 2 battalion', () => {
      const battalion = createMockBattalion('b2', NodeOwner.USER, 2, 10);
      const points = PointTrackingService.calculateBattalionPoints(battalion);
      expect(points).toBe(20); // Mark 2 × 10 bots = 20 points
    });

    it('should calculate points correctly for Mark 3 battalion', () => {
      const battalion = createMockBattalion('b3', NodeOwner.USER, 3, 10);
      const points = PointTrackingService.calculateBattalionPoints(battalion);
      expect(points).toBe(40); // Mark 3 × 10 bots = 40 points
    });

    it('should calculate points correctly for Mark 4 battalion', () => {
      const battalion = createMockBattalion('b4', NodeOwner.USER, 4, 10);
      const points = PointTrackingService.calculateBattalionPoints(battalion);
      expect(points).toBe(80); // Mark 4 × 10 bots = 80 points
    });

    it('should handle destroyed battalion with zero quantity', () => {
      const battalion = createMockBattalion('b5', NodeOwner.USER, 2, 0, 0, true);
      const points = PointTrackingService.calculateBattalionPoints(battalion);
      expect(points).toBe(0); // Mark 2 × 0 bots = 0 points
    });
  });

  describe('calculateTotalPoints', () => {
    it('should calculate total points for multiple battalions', () => {
      const battalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10),
        createMockBattalion('b2', NodeOwner.USER, 2, 5),
        createMockBattalion('b3', NodeOwner.USER, 3, 2)
      ];
      const totalPoints = PointTrackingService.calculateTotalPoints(battalions);
      expect(totalPoints).toBe(10 + 10 + 8); // 10 + 10 + 8 = 28 points
    });

    it('should handle empty battalion array', () => {
      const totalPoints = PointTrackingService.calculateTotalPoints([]);
      expect(totalPoints).toBe(0);
    });

    it('should filter out destroyed battalions', () => {
      const battalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10),
        createMockBattalion('b2', NodeOwner.USER, 2, 5, 0, true), // destroyed
        createMockBattalion('b3', NodeOwner.USER, 3, 2)
      ];
      const totalPoints = PointTrackingService.calculateTotalPoints(battalions);
      expect(totalPoints).toBe(10 + 8); // Only non-destroyed battalions
    });
  });

  describe('calculateLosses', () => {
    it('should calculate losses correctly', () => {
      const startingPoints = 100;
      const endingPoints = 60;
      const losses = PointTrackingService.calculateLosses(startingPoints, endingPoints);
      expect(losses).toBe(40); // 100 - 60 = 40 losses
    });

    it('should handle complete destruction', () => {
      const startingPoints = 100;
      const endingPoints = 0;
      const losses = PointTrackingService.calculateLosses(startingPoints, endingPoints);
      expect(losses).toBe(100); // 100 - 0 = 100 losses
    });

    it('should handle no losses', () => {
      const startingPoints = 100;
      const endingPoints = 100;
      const losses = PointTrackingService.calculateLosses(startingPoints, endingPoints);
      expect(losses).toBe(0); // 100 - 100 = 0 losses
    });
  });

  describe('determineWinner', () => {
    it('should determine user winner when user has fewer losses', () => {
      const userLosses = 30;
      const enemyLosses = 50;
      const winner = PointTrackingService.determineWinner(userLosses, enemyLosses);
      expect(winner).toBe(NodeOwner.USER);
    });

    it('should determine enemy winner when enemy has fewer losses', () => {
      const userLosses = 50;
      const enemyLosses = 30;
      const winner = PointTrackingService.determineWinner(userLosses, enemyLosses);
      expect(winner).toBe(NodeOwner.ENEMY);
    });

    it('should determine user winner when losses are equal (user is defender)', () => {
      const userLosses = 40;
      const enemyLosses = 40;
      const winner = PointTrackingService.determineWinner(userLosses, enemyLosses);
      expect(winner).toBe(NodeOwner.USER); // Defender wins ties
    });

    it('should handle zero losses for both sides', () => {
      const userLosses = 0;
      const enemyLosses = 0;
      const winner = PointTrackingService.determineWinner(userLosses, enemyLosses);
      expect(winner).toBe(NodeOwner.USER); // Defender wins ties
    });
  });

  describe('calculateBattleLosses', () => {
    it('should calculate complete battle losses for both sides', () => {
      const startingBattalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10),
        createMockBattalion('b2', NodeOwner.USER, 2, 5),
        createMockBattalion('b3', NodeOwner.ENEMY, 1, 8),
        createMockBattalion('b4', NodeOwner.ENEMY, 3, 3)
      ];

      const endingBattalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 5), // 5 remaining
        createMockBattalion('b2', NodeOwner.USER, 2, 0, 0, true), // destroyed
        createMockBattalion('b3', NodeOwner.ENEMY, 1, 2), // 2 remaining
        createMockBattalion('b4', NodeOwner.ENEMY, 3, 0, 0, true) // destroyed
      ];

      const battleLosses = PointTrackingService.calculateBattleLosses(startingBattalions, endingBattalions);

      expect(battleLosses.userLosses).toBe(15); // (10 + 10) - (5 + 0) = 15 losses
      expect(battleLosses.enemyLosses).toBe(18); // (8 + 12) - (2 + 0) = 18 losses
      expect(battleLosses.winner).toBe(NodeOwner.USER); // User has fewer losses
    });

    it('should handle complete victory scenario', () => {
      const startingBattalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10),
        createMockBattalion('b2', NodeOwner.ENEMY, 2, 5)
      ];

      const endingBattalions = [
        createMockBattalion('b1', NodeOwner.USER, 1, 10), // All user battalions survive
        createMockBattalion('b2', NodeOwner.ENEMY, 2, 0, 0, true) // All enemy battalions destroyed
      ];

      const battleLosses = PointTrackingService.calculateBattleLosses(startingBattalions, endingBattalions);

      expect(battleLosses.userLosses).toBe(0); // No user losses
      expect(battleLosses.enemyLosses).toBe(10); // All enemy losses
      expect(battleLosses.winner).toBe(NodeOwner.USER); // User wins
    });
  });
}); 