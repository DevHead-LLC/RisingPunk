/**
 * PvP battle experience: both attacker and defender earn XP from opponent bots destroyed
 * (Mark I = {@link PVP_XP_PER_MARK_I_BOT_DESTROYED} XP/unit, Mark II = {@link PVP_XP_PER_MARK_II_BOT_DESTROYED} XP/unit).
 *
 * Idempotent via `pvpExperienceBySide.{attacker|defender}.processedAt`; MongoDB transaction bundles
 * User XP updates + Battle document (same pattern as {@link processPvPBattleMoneyTransfer}).
 */

import mongoose from 'mongoose';
import { Battle } from '../models/Battle';
import type { IBattleDocument } from '../models/Battle';
import { NodeOwner, IBattalion } from '../types/battle';
import {
  PVP_XP_PER_MARK_I_BOT_DESTROYED,
  PVP_XP_PER_MARK_II_BOT_DESTROYED,
} from '../config/pvpBattleRewards';
import { LevelingService } from './LevelingService';

export interface PvPBattleExperienceResult {
  attackerXp: number;
  defenderXp: number;
}

function xpPerUnitForMark(mark: number): number {
  return mark >= 2 ? PVP_XP_PER_MARK_II_BOT_DESTROYED : PVP_XP_PER_MARK_I_BOT_DESTROYED;
}

/**
 * Sum XP for units **lost** by battalions owned by `opponentOwner` (enemy bots the other side destroyed).
 */
export function computePvpXpFromOpponentLosses(
  startingBattalions: IBattalion[],
  endingBattalions: IBattalion[],
  opponentOwner: NodeOwner
): number {
  const starting = startingBattalions.filter(b => b.owner === opponentOwner);
  let total = 0;
  for (const s of starting) {
    const e = endingBattalions.find(b => b.id === s.id);
    const endQty = e?.quantity ?? 0;
    const destroyed = Math.max(0, s.quantity - endQty);
    const mark = typeof s.mark === 'number' && Number.isFinite(s.mark) ? s.mark : 1;
    total += destroyed * xpPerUnitForMark(mark);
  }
  return Math.floor(total);
}

/**
 * Grant PvP XP to attacker and defender based on opponent bots destroyed; each side processed at most once.
 */
export async function processPvPBattleExperienceReward(
  battleId: string
): Promise<PvPBattleExperienceResult> {
  const existing = await Battle.findOne({ battleId })
    .select('pvpExperienceBySide isUserDefender')
    .lean();

  if (!existing) {
    return { attackerXp: 0, defenderXp: 0 };
  }
  if (!existing.isUserDefender) {
    return { attackerXp: 0, defenderXp: 0 };
  }

  const bySide = (existing as { pvpExperienceBySide?: { attacker?: { amount?: number; processedAt?: Date }; defender?: { amount?: number; processedAt?: Date } } }).pvpExperienceBySide;
  if (bySide?.attacker?.processedAt != null && bySide?.defender?.processedAt != null) {
    return {
      attackerXp: typeof bySide.attacker.amount === 'number' ? bySide.attacker.amount : 0,
      defenderXp: typeof bySide.defender.amount === 'number' ? bySide.defender.amount : 0,
    };
  }

  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async (): Promise<PvPBattleExperienceResult> => {
      const battleInTxn = await Battle.findOne({ battleId }).session(session);
      if (!battleInTxn) {
        throw new Error('Battle not found in transaction');
      }

      const starting = battleInTxn.startingBattalions ?? [];
      const ending = battleInTxn.battalions ?? [];

      const xpAttackerComputed = computePvpXpFromOpponentLosses(starting, ending, NodeOwner.ENEMY);
      const xpDefenderComputed = computePvpXpFromOpponentLosses(starting, ending, NodeOwner.USER);

      const attackerId = String(battleInTxn.attackerId ?? '').trim();
      const defenderId = String(battleInTxn.defenderId ?? '').trim();
      const validPair = Boolean(attackerId && defenderId && attackerId !== defenderId);
      const now = new Date();

      const sideState = {
        ...(battleInTxn.pvpExperienceBySide as
          | { attacker?: { amount?: number; processedAt?: Date }; defender?: { amount?: number; processedAt?: Date } }
          | undefined),
      };

      let levelUpAttacker: { levelsGained: number; newLevel: number } | undefined;
      let levelUpDefender: { levelsGained: number; newLevel: number } | undefined;
      let attackerXp = 0;
      let defenderXp = 0;

      if (sideState.attacker?.processedAt == null) {
        let grantedAtt = 0;
        if (validPair && xpAttackerComputed > 0) {
          const lr = await LevelingService.applyExperience(attackerId, xpAttackerComputed, { session });
          grantedAtt = xpAttackerComputed;
          attackerXp = grantedAtt;
          if (lr.levelsGained > 0) {
            levelUpAttacker = { levelsGained: lr.levelsGained, newLevel: lr.level };
          }
        }
        sideState.attacker = { amount: grantedAtt, processedAt: now };
      } else {
        attackerXp = typeof sideState.attacker?.amount === 'number' ? sideState.attacker.amount : 0;
      }

      if (sideState.defender?.processedAt == null) {
        let grantedDef = 0;
        if (validPair && xpDefenderComputed > 0) {
          const lr = await LevelingService.applyExperience(defenderId, xpDefenderComputed, { session });
          grantedDef = xpDefenderComputed;
          defenderXp = grantedDef;
          if (lr.levelsGained > 0) {
            levelUpDefender = { levelsGained: lr.levelsGained, newLevel: lr.level };
          }
        }
        sideState.defender = { amount: grantedDef, processedAt: now };
      } else {
        defenderXp = typeof sideState.defender?.amount === 'number' ? sideState.defender.amount : 0;
      }

      (battleInTxn as IBattleDocument & { pvpExperienceBySide?: unknown }).pvpExperienceBySide =
        sideState as NonNullable<IBattleDocument['pvpExperienceBySide']>;

      const prevPr = (battleInTxn as IBattleDocument & { processedRewards?: Record<string, unknown> })
        .processedRewards;
      const merged =
        prevPr && typeof prevPr === 'object' && prevPr !== null && !Array.isArray(prevPr)
          ? { ...prevPr }
          : {};

      (battleInTxn as IBattleDocument & { processedRewards?: Record<string, unknown> }).processedRewards = {
        ...merged,
        pvpExperienceAttacker: xpAttackerComputed,
        pvpExperienceDefender: xpDefenderComputed,
        ...(levelUpAttacker ? { levelUpAttacker } : {}),
        ...(levelUpDefender ? { levelUpDefender } : {}),
      };

      (battleInTxn as IBattleDocument & { pvpExperienceReward?: unknown }).pvpExperienceReward = undefined;

      await battleInTxn.save({ session });

      return { attackerXp, defenderXp };
    });

    return result ?? { attackerXp: 0, defenderXp: 0 };
  } catch (e) {
    console.error('PvPBattleExperienceService.processPvPBattleExperienceReward', battleId, e);
    return { attackerXp: 0, defenderXp: 0 };
  } finally {
    session.endSession();
  }
}
