import { IBattalion, NodeOwner } from '../types/battle';

export interface BattleLosses {
  userLosses: number;
  enemyLosses: number;
  winner: NodeOwner;
  userStartingPoints: number;
  userEndingPoints: number;
  enemyStartingPoints: number;
  enemyEndingPoints: number;
}

export class PointTrackingService {
  /**
   * Calculate points for a single battalion based on mark and quantity
   * Formula: markValue * quantity where markValue is exponential
   * Mark 1 = 1, Mark 2 = 2, Mark 3 = 4, Mark 4 = 8
   */
  static calculateBattalionPoints(battalion: IBattalion): number {
    if (battalion.isDestroyed || battalion.quantity <= 0) {
      return 0;
    }
    
    // Convert mark to exponential point value
    const markValue = Math.pow(2, battalion.mark - 1);
    return markValue * battalion.quantity;
  }

  /**
   * Calculate total points for a side (user or enemy) from multiple battalions
   * Only includes non-destroyed battalions
   */
  static calculateTotalPoints(battalions: IBattalion[]): number {
    return battalions
      .filter(battalion => !battalion.isDestroyed)
      .reduce((total, battalion) => total + this.calculateBattalionPoints(battalion), 0);
  }

  /**
   * Calculate losses: starting points minus ending points
   */
  static calculateLosses(startingPoints: number, endingPoints: number): number {
    return startingPoints - endingPoints;
  }

  /**
   * Determine winner based on losses
   * Party A (user) wins only when they have fewer losses than Party B (opponent)
   * Party B (opponent) wins when losses are equal or when they have fewer losses
   */
  static determineWinner(userLosses: number, enemyLosses: number): NodeOwner {
    if (userLosses < enemyLosses) {
      // Party A (user) has fewer losses - Party A wins
      return NodeOwner.USER;
    } else {
      // Party B (opponent) has fewer or equal losses - Party B wins
      return NodeOwner.ENEMY;
    }
  }

  /**
   * Calculate complete battle losses for both sides
   * Separates user and enemy battalions, calculates starting and ending points
   */
  static calculateBattleLosses(startingBattalions: IBattalion[], endingBattalions: IBattalion[]): BattleLosses {
    // Separate user and enemy battalions
    const userStartingBattalions = startingBattalions.filter(b => b.owner === NodeOwner.USER);
    const enemyStartingBattalions = startingBattalions.filter(b => b.owner === NodeOwner.ENEMY);
    const userEndingBattalions = endingBattalions.filter(b => b.owner === NodeOwner.USER);
    const enemyEndingBattalions = endingBattalions.filter(b => b.owner === NodeOwner.ENEMY);

    // Calculate starting points
    const userStartingPoints = this.calculateTotalPoints(userStartingBattalions);
    const enemyStartingPoints = this.calculateTotalPoints(enemyStartingBattalions);

    // Calculate ending points
    const userEndingPoints = this.calculateTotalPoints(userEndingBattalions);
    const enemyEndingPoints = this.calculateTotalPoints(enemyEndingBattalions);

    // Calculate losses
    const userLosses = this.calculateLosses(userStartingPoints, userEndingPoints);
    const enemyLosses = this.calculateLosses(enemyStartingPoints, enemyEndingPoints);

    // Determine winner
    const winner = this.determineWinner(userLosses, enemyLosses);

    return {
      userLosses,
      enemyLosses,
      winner,
      userStartingPoints,
      userEndingPoints,
      enemyStartingPoints,
      enemyEndingPoints
    };
  }
} 