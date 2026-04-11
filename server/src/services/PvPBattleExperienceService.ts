/**
 * Apply experience to the attacker when they win a user-vs-user (Hack Map PvP) battle.
 * Idempotent via `pvpExperienceReward.processedAt` (same pattern as `pvpMoneyTransfer`).
 */

import { Battle } from '../models/Battle';
import type { IBattleDocument } from '../models/Battle';
import { NodeOwner } from '../types/battle';
import { PVP_BATTLE_EXPERIENCE_REWARD } from '../config/pvpBattleRewards';
import { LevelingService } from './LevelingService';

export interface PvPBattleExperienceResult {
  experienceGained: number;
}

/**
 * When the attacker wins a PvP battle, grant {@link PVP_BATTLE_EXPERIENCE_REWARD} once per battle.
 * Persists `processedRewards.experienceGained` / `levelUp` for replay and API parity with NPC battles.
 */
export async function processPvPBattleExperienceReward(
  battleId: string
): Promise<PvPBattleExperienceResult> {
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
