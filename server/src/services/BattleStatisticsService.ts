import { IBattleDocument } from '../models/Battle';
import { NodeOwner, IBattalion } from '../types/battle';
import { User } from '../models/User';

export class BattleStatisticsService {
  static async recordBattleStats(battle: IBattleDocument): Promise<void> {
    try {
      if (!battle.isUserDefender) {
        return;
      }

      const startingBattalions = battle.startingBattalions || [];
      const endingBattalions = battle.battalions || [];
      const winner = battle.winner;
      const attackerId = battle.attackerId;
      const defenderId = battle.defenderId;

      const attackerBotsDestroyed = this.calculateBotsDestroyed(
        startingBattalions,
        endingBattalions,
        NodeOwner.ENEMY
      );

      const attackerBotsLost = this.calculateBotsDestroyed(
        startingBattalions,
        endingBattalions,
        NodeOwner.USER
      );

      const defenderBotsDestroyed = this.calculateBotsDestroyed(
        startingBattalions,
        endingBattalions,
        NodeOwner.USER
      );

      const defenderBotsLost = this.calculateBotsDestroyed(
        startingBattalions,
        endingBattalions,
        NodeOwner.ENEMY
      );

      const attackerWon = winner === NodeOwner.USER;
      const defenderWon = winner === NodeOwner.ENEMY;

      await Promise.all([
        this.updateAttackerStats(
          attackerId,
          attackerBotsDestroyed,
          attackerBotsLost,
          attackerWon
        ),
        this.updateDefenderStats(
          defenderId,
          defenderBotsDestroyed,
          defenderBotsLost,
          defenderWon
        )
      ]);
    } catch (error) {
      console.error('BattleStatisticsService recordBattleStats error:', error);
      throw error;
    }
  }

  private static calculateBotsDestroyed(
    startingBattalions: IBattalion[],
    endingBattalions: IBattalion[],
    targetOwner: NodeOwner
  ): number {
    const startingBattalionsForOwner = startingBattalions.filter(
      b => b.owner === targetOwner
    );
    const endingBattalionsForOwner = endingBattalions.filter(
      b => b.owner === targetOwner
    );

    let totalDestroyed = 0;

    for (const startingBattalion of startingBattalionsForOwner) {
      const endingBattalion = endingBattalionsForOwner.find(
        b => b.id === startingBattalion.id
      );
      const startingQuantity = startingBattalion.quantity;
      const endingQuantity = endingBattalion?.quantity || 0;
      const destroyed = startingQuantity - endingQuantity;
      totalDestroyed += destroyed;
    }

    return totalDestroyed;
  }

  private static async updateAttackerStats(
    attackerId: string,
    botsDestroyed: number,
    botsLost: number,
    won: boolean
  ): Promise<void> {
    const incUpdate: any = {
      'battleStats.botsDestroyed': botsDestroyed,
      'battleStats.botsLost': botsLost
    };

    if (won) {
      incUpdate['battleStats.successfulAttacks'] = 1;
    } else {
      incUpdate['battleStats.failedAttacks'] = 1;
    }

    await User.findByIdAndUpdate(
      attackerId,
      [
        {
          $set: {
            battleStats: {
              $ifNull: [
                '$battleStats',
                {
                  botsDestroyed: 0,
                  botsLost: 0,
                  successfulAttacks: 0,
                  failedAttacks: 0,
                  successfulDefenses: 0,
                  failedDefenses: 0
                }
              ]
            }
          }
        },
        {
          $inc: incUpdate
        }
      ],
      { upsert: false }
    );
  }

  private static async updateDefenderStats(
    defenderId: string,
    botsDestroyed: number,
    botsLost: number,
    won: boolean
  ): Promise<void> {
    const incUpdate: any = {
      'battleStats.botsDestroyed': botsDestroyed,
      'battleStats.botsLost': botsLost
    };

    if (won) {
      incUpdate['battleStats.successfulDefenses'] = 1;
    } else {
      incUpdate['battleStats.failedDefenses'] = 1;
    }

    await User.findByIdAndUpdate(
      defenderId,
      [
        {
          $set: {
            battleStats: {
              $ifNull: [
                '$battleStats',
                {
                  botsDestroyed: 0,
                  botsLost: 0,
                  successfulAttacks: 0,
                  failedAttacks: 0,
                  successfulDefenses: 0,
                  failedDefenses: 0
                }
              ]
            }
          }
        },
        {
          $inc: incUpdate
        }
      ],
      { upsert: false }
    );
  }
}

