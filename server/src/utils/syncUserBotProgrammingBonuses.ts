import mongoose from 'mongoose';
import { User } from '../models/User';
import { computePacketBreachArmyBonus } from '../config/packetBreachConfig';
import { computeRaceConditionHeistGuardianBonus } from '../config/raceConditionHeistConfig';
import { computeBinaryBankCrackPhreakBonus } from '../config/binaryBankCrackConfig';
import type { ArmyBonus, GuardianBonus, PhreakBonus } from '../services/BotService';

/**
 * Ensures `User.armyBonus` / `guardianBonus` / `phreakBonus` match computed Packet Breach /
 * Race Condition Heist / Binary Bank Crack rewards, then returns the bonuses to pass into
 * `BotService.getUserBotStats` (same inputs as Profile stats-breakdown and battle code paths
 * after DB is current).
 */
export async function syncAndResolveUserBotProgrammingBonuses(
  userId: mongoose.Types.ObjectId | string
): Promise<{
  userLevel: number;
  armyBonusForStats: ArmyBonus;
  guardianBonusForStats: GuardianBonus;
  phreakBonusForStats: PhreakBonus & { range?: number };
}> {
  const user = await User.findById(userId).select(
    'level packetBreach raceConditionHeist binaryBankCrack armyBonus guardianBonus phreakBonus'
  );
  if (!user) {
    throw new Error('User not found');
  }

  const userLevel = user.level || 1;
  const packetBreachLevels: string[] = Array.isArray(user.packetBreach?.levelsCompleted)
    ? user.packetBreach!.levelsCompleted
    : [];
  const programmingFromLevels = computePacketBreachArmyBonus(packetBreachLevels);
  const storedArmyBonus = user.armyBonus || { strength: 0, defense: 0, speed: 0, health: 0 };
  const armyBonusMatches =
    storedArmyBonus.strength === programmingFromLevels.strength &&
    storedArmyBonus.defense === programmingFromLevels.defense &&
    storedArmyBonus.speed === programmingFromLevels.speed &&
    storedArmyBonus.health === programmingFromLevels.health;

  const rchLevels: string[] = Array.isArray(user.raceConditionHeist?.levelsCompleted)
    ? user.raceConditionHeist!.levelsCompleted
    : [];
  const programmingGuardianFromLevels = computeRaceConditionHeistGuardianBonus(rchLevels);
  const storedGuardianBonus = user.guardianBonus || { strength: 0, defense: 0, speed: 0, health: 0 };
  const guardianBonusMatches =
    storedGuardianBonus.strength === programmingGuardianFromLevels.strength &&
    storedGuardianBonus.defense === programmingGuardianFromLevels.defense &&
    storedGuardianBonus.speed === programmingGuardianFromLevels.speed &&
    storedGuardianBonus.health === programmingGuardianFromLevels.health;

  const bbcLevels: string[] = Array.isArray(user.binaryBankCrack?.levelsCompleted)
    ? user.binaryBankCrack!.levelsCompleted
    : [];
  const programmingPhreakFromLevels = computeBinaryBankCrackPhreakBonus(bbcLevels);
  const storedPhreakBonus = user.phreakBonus ?? { strength: 0, defense: 0, speed: 0, health: 0 };
  const phreakBonusMatches =
    storedPhreakBonus.strength === programmingPhreakFromLevels.strength &&
    storedPhreakBonus.defense === programmingPhreakFromLevels.defense &&
    storedPhreakBonus.speed === programmingPhreakFromLevels.speed &&
    storedPhreakBonus.health === programmingPhreakFromLevels.health;

  const updates: Record<string, unknown> = {};
  if (!armyBonusMatches) {
    updates.armyBonus = programmingFromLevels;
  }
  if (!guardianBonusMatches) {
    updates.guardianBonus = programmingGuardianFromLevels;
  }
  if (!phreakBonusMatches) {
    updates.phreakBonus = programmingPhreakFromLevels;
  }
  if (Object.keys(updates).length > 0) {
    await User.updateOne({ _id: user._id }, { $set: updates });
  }

  const armyBonusForStats = armyBonusMatches ? storedArmyBonus : programmingFromLevels;
  const guardianBonusForStats = guardianBonusMatches ? storedGuardianBonus : programmingGuardianFromLevels;
  const phreakBonusForStats = phreakBonusMatches ? storedPhreakBonus : programmingPhreakFromLevels;

  return {
    userLevel,
    armyBonusForStats,
    guardianBonusForStats,
    phreakBonusForStats,
  };
}
