import mongoose from 'mongoose';
import { UserResearchFeature } from '../models/UserResearchFeature';
import { CrewStatus } from '../models/CrewStatus';
import { Crew } from '../models/Crew';
import { CREW_ARMY_BONUS_CHAIN, CREW_ARMY_BONUS_FEATURE_IDS } from '../config/crewArmyBonusResearch';
import { getCrewLevelMemberBonuses } from '../config/crewLevelMemberBonuses';
import type { ArmyBonus } from '../services/BotService';

/** Prefetched research feature rows for bonus sync (cash-flow, financial, investments). One batch query replaces N findOne (Bugbot). */
export type BonusPrefetch = { categoryId: string; featureId: string; isUnlocked: boolean; unlockedAt: Date | null }[];

const BONUS_SYNC_CATEGORIES = ['cash-flow', 'financial', 'investments'] as const;

export async function getResearchFeaturesForBonusSync(userId: string): Promise<BonusPrefetch> {
  const docs = await UserResearchFeature.find({
    userId,
    categoryId: { $in: [...BONUS_SYNC_CATEGORIES] },
  })
    .select('categoryId featureId isUnlocked unlockedAt')
    .lean();
  return docs.map(d => ({
    categoryId: d.categoryId,
    featureId: d.featureId,
    isUnlocked: !!d.isUnlocked,
    unlockedAt: d.unlockedAt ? new Date(d.unlockedAt) : null,
  }));
}

export function isUnlockedInPrefetch(prefetch: BonusPrefetch, categoryId: string, featureId: string): boolean {
  const doc = prefetch.find(d => d.categoryId === categoryId && d.featureId === featureId);
  return !!doc?.isUnlocked;
}

function getUnlockTimeInPrefetch(prefetch: BonusPrefetch, categoryId: string, featureId: string): Date | null {
  const doc = prefetch.find(d => d.categoryId === categoryId && d.featureId === featureId);
  return doc?.isUnlocked && doc.unlockedAt ? doc.unlockedAt : null;
}

/** Cash-flow feature IDs that add to base income rate (spec 18). Bugbot: no legacy IDs in DB — legacy financial/reduce-expenses is handled only in getTaxReductionBonus. Grandfather migration for increase-income-rate intentionally grants 01+02+025 ($0.055/sec), slightly more than old $0.05/sec. */
export const INCOME_RATE_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'increase-income-01', value: 0.01 },
  { featureId: 'increase-income-02', value: 0.02 },
  { featureId: 'increase-income-025', value: 0.025 },
  { featureId: 'increase-income-03', value: 0.03 },
  { featureId: 'increase-income-03-ii', value: 0.03 },
  { featureId: 'increase-income-03-iii', value: 0.03 },
  { featureId: 'increase-income-03-iv', value: 0.03 },
  { featureId: 'increase-income-03-v', value: 0.03 },
  { featureId: 'increase-income-05', value: 0.05 },
  { featureId: 'increase-income-10-i', value: 0.1 },
  { featureId: 'increase-income-10-ii', value: 0.1 }
];

/** Cash-flow feature IDs that reduce insurance expense (spec 18). Bugbot: no legacy IDs (e.g. reduce-insurance-expense) — never used in this project. */
export const INSURANCE_REDUCTION_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'reduce-insurance-01', value: 0.01 },
  { featureId: 'reduce-insurance-02', value: 0.02 },
  { featureId: 'reduce-insurance-03', value: 0.02 }
];

/** Cash-flow tax tiers stack (spec 18). Legacy financial/reduce-expenses applies only when no cash-flow tax tier is unlocked. */
export const CASH_FLOW_TAX_REDUCTION_STACK: { featureId: string; value: number }[] = [
  { featureId: 'reduce-tax-expense-02', value: 0.02 },
  { featureId: 'reduce-tax-expense-03', value: 0.03 }
];

/** Cash-flow feature IDs that reduce rent/mortgage expense. No legacy. */
export const RENT_MORTGAGE_REDUCTION_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'reduce-rent-mortgage-05', value: 0.05 },
  { featureId: 'reduce-rent-mortgage-10', value: 0.1 }
];

/** Cash-flow utilities expense reduction (spec 18). */
export const UTILITIES_REDUCTION_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'reduce-utilities-05', value: 0.05 }
];

/** Cash-flow misc/entertainment expense reduction (spec 18). */
export const MISC_ENTERTAINMENT_REDUCTION_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'reduce-misc-entertainment-10', value: 0.1 },
  { featureId: 'reduce-misc-entertainment-15', value: 0.15 }
];

/** Rental profit per room features (spec 18). All tiers in investments. Bugbot: no legacy IDs (e.g. rental-profit-increase) — never used in this project. */
export const RENTAL_PROFIT_FEATURES: { featureId: string; value: number; categoryId: string }[] = [
  { featureId: 'rental-profit-01', value: 0.01, categoryId: 'investments' },
  { featureId: 'rental-profit-015', value: 0.015, categoryId: 'investments' },
  { featureId: 'rental-profit-02-i', value: 0.02, categoryId: 'investments' },
  { featureId: 'rental-profit-02-ii', value: 0.02, categoryId: 'investments' },
  { featureId: 'rental-profit-02-iii', value: 0.02, categoryId: 'investments' }
];

/** Migration replacement set for increase-income-rate (grandfather creates 01+02+025). Add legacy only when user doesn't have all of these (Bugbot). */
export const INCOME_RATE_LEGACY_REPLACEMENT_IDS = ['increase-income-01', 'increase-income-02', 'increase-income-025'];

/**
 * Total base income rate bonus from all unlocked cash-flow income features (spec 18).
 * Legacy: add $0.05/sec when increase-income-rate is unlocked and user does not have the full migration replacement set (01+02+025), so pre-migration users keep legacy+new; avoids double-count when migrated (Bugbot).
 * Pass prefetch from getResearchFeaturesForBonusSync to avoid N+1 queries (Bugbot).
 */
export async function getBaseIncomeRateBonus(userId: string, prefetch?: BonusPrefetch): Promise<number> {
  const check = prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
  let total = 0;
  for (const { featureId, value } of INCOME_RATE_FEATURES) {
    if (await check('cash-flow', featureId)) total += value;
  }
  const hasFullReplacement = (await Promise.all(INCOME_RATE_LEGACY_REPLACEMENT_IDS.map(id => check('cash-flow', id)))).every(Boolean);
  if (!hasFullReplacement && (await check('cash-flow', 'increase-income-rate'))) total += 0.05;
  return total;
}

/** Migration replacement for reduce-insurance-expense is reduce-insurance-02. Add legacy only when user doesn't have it (Bugbot). */
export const INSURANCE_LEGACY_REPLACEMENT_ID = 'reduce-insurance-02';

/**
 * Total insurance expense reduction from all unlocked cash-flow features (spec 18).
 * Legacy: add $0.02 when reduce-insurance-expense is unlocked and user does not have the migration replacement (reduce-insurance-02).
 * Migration grants only reduce-insurance-02 ($0.02/sec) for old reduce-insurance-expense so legacy users see one tier and correct balance.
 * Pass prefetch to avoid N+1 queries (Bugbot).
 */
export async function getInsuranceReductionBonus(userId: string, prefetch?: BonusPrefetch): Promise<number> {
  const check = prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
  let total = 0;
  for (const { featureId, value } of INSURANCE_REDUCTION_FEATURES) {
    if (await check('cash-flow', featureId)) total += value;
  }
  const hasReplacement = await check('cash-flow', INSURANCE_LEGACY_REPLACEMENT_ID);
  if (!hasReplacement && (await check('cash-flow', 'reduce-insurance-expense'))) total += 0.02;
  return total;
}

/**
 * Total rent/mortgage expense reduction from all unlocked cash-flow features.
 * Pass prefetch to avoid N+1 queries.
 */
export async function getRentMortgageReductionBonus(userId: string, prefetch?: BonusPrefetch): Promise<number> {
  const check = prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
  let total = 0;
  for (const { featureId, value } of RENT_MORTGAGE_REDUCTION_FEATURES) {
    if (await check('cash-flow', featureId)) total += value;
  }
  return total;
}

/**
 * Total tax expense reduction from unlocked tax features (spec 18 + legacy).
 * Cash-flow tiers (reduce-tax-expense-02, -03, …) stack. Legacy financial/reduce-expenses grants $0.02 only when no cash-flow tax tier is unlocked.
 * Pass prefetch to avoid N+1 queries (Bugbot).
 */
export async function getTaxReductionBonus(userId: string, prefetch?: BonusPrefetch): Promise<number> {
  const check = prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
  let total = 0;
  for (const { featureId, value } of CASH_FLOW_TAX_REDUCTION_STACK) {
    if (await check('cash-flow', featureId)) total += value;
  }
  if (total === 0 && (await check('financial', 'reduce-expenses'))) total = 0.02;
  return total;
}

/**
 * Total utilities expense reduction from unlocked cash-flow features (spec 18).
 */
export async function getUtilitiesReductionBonus(userId: string, prefetch?: BonusPrefetch): Promise<number> {
  const check = prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
  let total = 0;
  for (const { featureId, value } of UTILITIES_REDUCTION_FEATURES) {
    if (await check('cash-flow', featureId)) total += value;
  }
  return total;
}

/**
 * Total misc/entertainment expense reduction from unlocked cash-flow features (spec 18).
 */
export async function getMiscEntertainmentReductionBonus(userId: string, prefetch?: BonusPrefetch): Promise<number> {
  const check = prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
  let total = 0;
  for (const { featureId, value } of MISC_ENTERTAINMENT_REDUCTION_FEATURES) {
    if (await check('cash-flow', featureId)) total += value;
  }
  return total;
}

/** Migration replacement for rental-profit-increase is rental-profit-01. Add legacy only when user doesn't have it (Bugbot). */
export const RENTAL_LEGACY_REPLACEMENT_ID = 'rental-profit-01';

/**
 * Total rental profit bonus per room per second from all unlocked investments features (spec 18).
 * Legacy: add $0.01 when rental-profit-increase is unlocked and user does not have the migration replacement (rental-profit-01), so pre-migration users keep legacy+new (Bugbot).
 * Pass prefetch to avoid N+1 queries (Bugbot).
 */
export async function getRentalProfitBonusPerRoom(userId: string, prefetch?: BonusPrefetch): Promise<number> {
  const check = prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
  let total = 0;
  for (const { featureId, value, categoryId } of RENTAL_PROFIT_FEATURES) {
    if (await check(categoryId, featureId)) total += value;
  }
  const hasReplacement = await check('investments', RENTAL_LEGACY_REPLACEMENT_ID);
  if (!hasReplacement && (await check('investments', 'rental-profit-increase'))) total += 0.01;
  return total;
}

/**
 * Rental profit bonus per room as of a given time (for historical income).
 * Legacy: add $0.01 when rental-profit-increase unlocked by asOfTime and replacement (rental-profit-01) not unlocked by then (Bugbot).
 * Pass prefetch to avoid N+1 queries (Bugbot).
 */
export async function getRentalProfitBonusPerRoomAsOf(userId: string, asOfTime: Date, prefetch?: BonusPrefetch): Promise<number> {
  const asOfMs = asOfTime.getTime();
  const getTime = prefetch
    ? (cat: string, fid: string) => Promise.resolve(getUnlockTimeInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => getResearchFeatureUnlockTime(userId, cat, fid);
  let total = 0;
  for (const { featureId, value, categoryId } of RENTAL_PROFIT_FEATURES) {
    const unlockedAt = await getTime(categoryId, featureId);
    if (unlockedAt && unlockedAt.getTime() <= asOfMs) total += value;
  }
  const replacementUnlockedAt = await getTime('investments', RENTAL_LEGACY_REPLACEMENT_ID);
  const hasReplacementByThen = replacementUnlockedAt && replacementUnlockedAt.getTime() <= asOfMs;
  const legacyUnlockedAt = await getTime('investments', 'rental-profit-increase');
  if (!hasReplacementByThen && legacyUnlockedAt && legacyUnlockedAt.getTime() <= asOfMs) total += 0.01;
  return total;
}

/** Sorted unlock times for rental-profit features (for historical income segments). Includes legacy. Pass prefetch to avoid N+1 (Bugbot). */
export async function getRentalProfitUnlockTimes(userId: string, prefetch?: BonusPrefetch): Promise<Date[]> {
  const getTime = prefetch
    ? (cat: string, fid: string) => Promise.resolve(getUnlockTimeInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => getResearchFeatureUnlockTime(userId, cat, fid);
  const times: Date[] = [];
  for (const { featureId, categoryId } of RENTAL_PROFIT_FEATURES) {
    const t = await getTime(categoryId, featureId);
    if (t) times.push(t);
  }
  const legacyT = await getTime('investments', 'rental-profit-increase');
  if (legacyT) times.push(legacyT);
  return times.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Check whether a research feature is unlocked for a user.
 * Single source of truth for research unlock checks used by rental/balance services.
 */
export async function isResearchFeatureUnlocked(
  userId: string,
  categoryId: string,
  featureId: string
): Promise<boolean> {
  try {
    const feature = await UserResearchFeature.findOne({
      userId,
      categoryId,
      featureId
    })
      .select('isUnlocked unlockedAt')
      .lean();

    if (!feature) {
      return false;
    }

    return !!feature.isUnlocked;
  } catch (error) {
    console.error(`[RESEARCH] Error checking research unlock status (${categoryId}/${featureId}):`, error);
    return false;
  }
}

/** Swarm Lead — server authority for HackMap Swarm gating (Phase 2+). */
export const SWARM_LEAD_RESEARCH = { categoryId: 'swarm' as const, featureId: 'swarm-lead' as const };

export function isSwarmLeadResearchUnlocked(userId: string): Promise<boolean> {
  return isResearchFeatureUnlocked(userId, SWARM_LEAD_RESEARCH.categoryId, SWARM_LEAD_RESEARCH.featureId);
}

/** Hack-ability battalion-size feature IDs in prereq order (spec 18). Value is the additive increase. */
const BATTALION_SIZE_FEATURES: { featureId: string; add: number }[] = [
  { featureId: 'battalion-size-250', add: 250 },
  { featureId: 'battalion-size-500', add: 500 },
  { featureId: 'battalion-size-1000', add: 1000 },
  { featureId: 'battalion-size-2000', add: 2000 },
  { featureId: 'battalion-size-4500', add: 4500 },
  { featureId: 'battalion-size-6500', add: 6500 },
  { featureId: 'battalion-size-5000-i', add: 5000 },
  { featureId: 'battalion-size-5000-ii', add: 5000 },
  { featureId: 'battalion-size-7500-i', add: 7500 },
  { featureId: 'battalion-size-7500-ii', add: 7500 },
  { featureId: 'battalion-size-10000', add: 10000 },
];

/** UI names for each tier (same order as BATTALION_SIZE_FEATURES). Must match `research_feature_definitions` / seedResearchFeatureDefinitionsFromImage.ts. */
const BATTALION_SIZE_RESEARCH_DISPLAY_NAMES: string[] = [
  'Battalion Size +250',
  'Battalion Size +500',
  'Battalion Size +1,000',
  'Battalion Size +2,000',
  'Battalion Size +4,500',
  'Battalion Size +6,500',
  'Battalion Size +5,000 I',
  'Battalion Size +5,000 II',
  'Battalion Size +7,500 I',
  'Battalion Size +7,500 II',
  'Battalion Size +10,000',
];

const BASE_BATTALION_SIZE = 250;

/**
 * When the user is blocked by current max battalion size, returns the next research hint (matches getMaxBattalionSize progression).
 * Returns null at the final cap (50,000) or if maxLimit is not a valid intermediate cap.
 */
export function getNextBattalionSizeResearchHint(maxLimit: number): string | null {
  if (BATTALION_SIZE_RESEARCH_DISPLAY_NAMES.length !== BATTALION_SIZE_FEATURES.length) {
    throw new Error('BATTALION_SIZE_RESEARCH_DISPLAY_NAMES out of sync with BATTALION_SIZE_FEATURES');
  }
  let cum = BASE_BATTALION_SIZE;
  for (let i = 0; i < BATTALION_SIZE_FEATURES.length; i++) {
    if (maxLimit === cum) {
      const nextCap = cum + BATTALION_SIZE_FEATURES[i].add;
      const name = BATTALION_SIZE_RESEARCH_DISPLAY_NAMES[i];
      return `Complete "${name}" research to increase to ${nextCap.toLocaleString('en-US')}.`;
    }
    cum += BATTALION_SIZE_FEATURES[i].add;
  }
  return null;
}

/** Legacy feature IDs (pre–spec-18) so we find docs before grandfather migration runs. Same category hack-ability. */
const BATTALION_SIZE_LEGACY_IDS: Record<string, string[]> = {
  'battalion-size-250': ['battalion-size-250', 'increase-battalion-size'],
};

/**
 * Max troops per battalion for a user from research (base 250 plus unlocked battalion-size tiers; cap up to 50,000 after all tiers).
 * Uses isUnlocked or "completing at or before asOfTime". Queries include legacy IDs so users with old docs are found before migration.
 * @param asOfTime If provided, research is treated unlocked when researchCompletesAt <= asOfTime.
 */
export async function getMaxBattalionSize(userId: string, asOfTime?: Date): Promise<number> {
  const now = (asOfTime ?? new Date()).getTime();
  let max = BASE_BATTALION_SIZE;
  for (const { featureId, add } of BATTALION_SIZE_FEATURES) {
    const featureIds = BATTALION_SIZE_LEGACY_IDS[featureId] ?? [featureId];
    const doc = await UserResearchFeature.findOne({
      userId,
      categoryId: 'hack-ability',
      featureId: featureIds.length === 1 ? featureIds[0] : { $in: featureIds },
    })
      .select('isUnlocked isResearching researchCompletesAt')
      .lean();
    const researchCompletesAt = doc?.researchCompletesAt ? new Date(doc.researchCompletesAt).getTime() : null;
    const effectivelyUnlocked =
      doc?.isUnlocked || (!!doc?.isResearching && researchCompletesAt !== null && researchCompletesAt <= now);
    if (effectivelyUnlocked) max += add;
    else break;
  }
  return max;
}

const BATTALION_SLOT_FEATURE_IDS: Record<'C' | 'D' | 'E' | 'F', string> = {
  C: 'add-battalion-c',
  D: 'add-battalion-d',
  E: 'add-battalion-e',
  F: 'add-battalion-f',
};

/** Legacy slot IDs so Battalion C is found under battalions-per-battle before grandfather migration. D/E/F have no legacy. */
const BATTALION_SLOT_LEGACY_IDS: Record<string, string[]> = {
  'add-battalion-c': ['add-battalion-c', 'battalions-per-battle'],
};

/**
 * Whether the add-battalion-X research is effectively unlocked for a user (unlocked or research just completed at asOfTime).
 * Queries include legacy IDs (e.g. battalions-per-battle for C) so users with old docs are found before migration.
 */
export async function isBattalionSlotUnlocked(
  userId: string,
  battalionId: 'C' | 'D' | 'E' | 'F',
  asOfTime?: Date
): Promise<boolean> {
  const featureId = BATTALION_SLOT_FEATURE_IDS[battalionId];
  const featureIds = BATTALION_SLOT_LEGACY_IDS[featureId] ?? [featureId];
  const doc = await UserResearchFeature.findOne({
    userId,
    categoryId: 'hack-ability',
    featureId: featureIds.length === 1 ? featureIds[0] : { $in: featureIds },
  })
    .select('isUnlocked isResearching researchCompletesAt')
    .lean();
  if (!doc) return false;
  const now = (asOfTime ?? new Date()).getTime();
  const researchCompletesAt = doc.researchCompletesAt ? new Date(doc.researchCompletesAt).getTime() : null;
  return !!(
    doc.isUnlocked ||
    (doc.isResearching && researchCompletesAt !== null && researchCompletesAt <= now)
  );
}

/**
 * Get the unlock timestamp for a research feature, or null if not unlocked.
 */
export async function getResearchFeatureUnlockTime(
  userId: string,
  categoryId: string,
  featureId: string
): Promise<Date | null> {
  try {
    const feature = await UserResearchFeature.findOne({
      userId,
      categoryId,
      featureId
    })
      .select('isUnlocked unlockedAt')
      .lean();

    if (!feature || !feature.isUnlocked || !feature.unlockedAt) {
      return null;
    }

    return feature.unlockedAt;
  } catch (error) {
    console.error(`[RESEARCH] Error getting research unlock time (${categoryId}/${featureId}):`, error);
    return null;
  }
}

/**
 * Crew army bonuses split for UI (stats breakdown + Digital Barracks): **level table** vs **Hack Crew research** unlocks.
 * Battles use {@link getCrewArmyBonusTotalsForUser} (sum of both). Not in a crew → both zero.
 */
export async function getCrewArmyBonusPartsForUser(userId: mongoose.Types.ObjectId | string): Promise<{
  levelTable: { atk: number; def: number; hp: number };
  hackCrewResearch: { atk: number; def: number; hp: number };
}> {
  const crewStatus = await CrewStatus.findOne({ userId }).select('isInCrew crewId').lean();
  if (!crewStatus?.isInCrew || !crewStatus.crewId) {
    return {
      levelTable: { atk: 0, def: 0, hp: 0 },
      hackCrewResearch: { atk: 0, def: 0, hp: 0 },
    };
  }

  const crewDoc = await Crew.findById(crewStatus.crewId).select('level').lean();
  const crewLevel = crewDoc?.level ?? 1;
  const levelRow = getCrewLevelMemberBonuses(crewLevel);
  const levelTable = {
    atk: levelRow.strength,
    def: levelRow.defense,
    hp: levelRow.health,
  };

  const docs = await UserResearchFeature.find({
    userId,
    categoryId: 'hack-crew',
    featureId: { $in: CREW_ARMY_BONUS_FEATURE_IDS },
    isUnlocked: true,
  })
    .select('featureId')
    .lean();
  const unlocked = new Set(docs.map((d) => d.featureId));
  let atk = 0;
  let def = 0;
  let hp = 0;
  for (const row of CREW_ARMY_BONUS_CHAIN) {
    if (unlocked.has(row.featureId)) {
      atk += row.atk;
      def += row.def;
      hp += row.hp;
    }
  }
  const hackCrewResearch = { atk, def, hp };
  return { levelTable, hackCrewResearch };
}

/** Stacked Crew Bonus (Hack Crew research + crew level table) ATK/DEF/HP — only while user is in a crew. */
export async function getCrewArmyBonusTotalsForUser(
  userId: mongoose.Types.ObjectId | string
): Promise<{ atk: number; def: number; hp: number }> {
  const { levelTable, hackCrewResearch } = await getCrewArmyBonusPartsForUser(userId);
  return {
    atk: levelTable.atk + hackCrewResearch.atk,
    def: levelTable.def + hackCrewResearch.def,
    hp: levelTable.hp + hackCrewResearch.hp,
  };
}

/** Passive income ($/sec) from crew level table — 0 if not in a crew. */
export async function getCrewLevelIncomeBonusForUser(
  userId: mongoose.Types.ObjectId | string
): Promise<number> {
  const crewStatus = await CrewStatus.findOne({ userId }).select('isInCrew crewId').lean();
  if (!crewStatus?.isInCrew || !crewStatus.crewId) {
    return 0;
  }
  const crewDoc = await Crew.findById(crewStatus.crewId).select('level').lean();
  const crewLevel = crewDoc?.level ?? 1;
  return getCrewLevelMemberBonuses(crewLevel).incomePerSecond;
}

/** Apply crew army bonuses on top of Packet Breach / RCH / BBC programming bonuses (same shape for all three bot families). */
export function mergeCrewArmyIntoArmyBonus(programming: ArmyBonus, crew: { atk: number; def: number; hp: number }): ArmyBonus {
  return {
    strength: programming.strength + crew.atk,
    defense: programming.defense + crew.def,
    health: programming.health + crew.hp,
    speed: programming.speed,
  };
}
