/**
 * PvP (user defender) battle experience — plumbing for a future "bots destroyed" (or similar) reward.
 * While {@link ENABLE_PVP_BATTLE_EXPERIENCE_REWARD} is false, this does not call `LevelingService` or persist rewards.
 */

import { Battle } from '../models/Battle';
import type { IBattleDocument } from '../models/Battle';
import { NodeOwner } from '../types/battle';
import {
  ENABLE_PVP_BATTLE_EXPERIENCE_REWARD,
  PVP_BATTLE_EXPERIENCE_REWARD,
} from '../config/pvpBattleRewards';
import { LevelingService } from './LevelingService';

export interface PvPBattleExperienceResult {
  experienceGained: number;
}

/**
 * When the attacker wins a PvP battle, grant experience once per battle (when enabled).
 * Idempotent via `pvpExperienceReward.processedAt` (same pattern as `pvpMoneyTransfer`).
 */
export async function processPvPBattleExperienceReward(
  battleId: string
): Promise<PvPBattleExperienceResult> {
  if (!ENABLE_PVP_BATTLE_EXPERIENCE_REWARD) {
    return { experienceGained: 0 };
  }

  const battle = await Battle.findOne({ battleId });
  if (!battle) {
    return { experienceGained: 0 };
  }
  if (!battle.isUserDefender) {
    return { experienceGained: 0 };
  }
  if (battle.pvpExperienceReward?.processedAt) {
    return { experienceGained: battle.pvpExperienceReward.amount ?? 0 };
  }

  const now = new Date();
  if (battle.winner !== NodeOwner.USER) {
    battle.pvpExperienceReward = { amount: 0, processedAt: now };
    await battle.save();
    return { experienceGained: 0 };
  }

  const attackerId = battle.attackerId;
  const defenderId = battle.defenderId;
  if (!attackerId || !defenderId || String(attackerId) === String(defenderId)) {
    battle.pvpExperienceReward = { amount: 0, processedAt: now };
    await battle.save();
    return { experienceGained: 0 };
  }

  const amount = PVP_BATTLE_EXPERIENCE_REWARD;
  if (amount <= 0) {
    battle.pvpExperienceReward = { amount: 0, processedAt: now };
    await battle.save();
    return { experienceGained: 0 };
  }

  try {
    const levelingResult = await LevelingService.applyExperience(String(attackerId), amount);
    const levelUp =
      levelingResult.levelsGained > 0
        ? { levelsGained: levelingResult.levelsGained, newLevel: levelingResult.level }
        : undefined;

    const prev = (battle as IBattleDocument & { processedRewards?: Record<string, unknown> })
      .processedRewards;
    const merged =
      prev && typeof prev === 'object' && prev !== null && !Array.isArray(prev)
        ? { ...prev }
        : {};

    (battle as IBattleDocument & { processedRewards?: Record<string, unknown> }).processedRewards = {
      ...merged,
      experienceGained: amount,
      levelUp,
    };
    battle.pvpExperienceReward = { amount, processedAt: now };
    await battle.save();

    return { experienceGained: amount };
  } catch (e) {
    console.error('PvPBattleExperienceService.processPvPBattleExperienceReward', battleId, e);
    return { experienceGained: 0 };
  }
}
