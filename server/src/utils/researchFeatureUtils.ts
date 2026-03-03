import { UserResearchFeature } from '../models/UserResearchFeature';

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

function isUnlockedInPrefetch(prefetch: BonusPrefetch, categoryId: string, featureId: string): boolean {
  const doc = prefetch.find(d => d.categoryId === categoryId && d.featureId === featureId);
  return !!doc?.isUnlocked;
}

function getUnlockTimeInPrefetch(prefetch: BonusPrefetch, categoryId: string, featureId: string): Date | null {
  const doc = prefetch.find(d => d.categoryId === categoryId && d.featureId === featureId);
  return doc?.isUnlocked && doc.unlockedAt ? doc.unlockedAt : null;
}

/** Cash-flow feature IDs that add to base income rate (spec 18). Bugbot: no legacy IDs in DB — only reduce-expenses is legacy (TAX_REDUCTION_FEATURES). Grandfather migration for increase-income-rate intentionally grants 01+02+025 ($0.055/sec), slightly more than old $0.05/sec. */
const INCOME_RATE_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'increase-income-01', value: 0.01 },
  { featureId: 'increase-income-02', value: 0.02 },
  { featureId: 'increase-income-025', value: 0.025 },
  { featureId: 'increase-income-03', value: 0.03 },
  { featureId: 'increase-income-03-ii', value: 0.03 },
  { featureId: 'increase-income-03-iii', value: 0.03 }
];

/** Cash-flow feature IDs that reduce insurance expense (spec 18). Bugbot: no legacy IDs (e.g. reduce-insurance-expense) — never used in this project. */
const INSURANCE_REDUCTION_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'reduce-insurance-01', value: 0.01 },
  { featureId: 'reduce-insurance-02', value: 0.02 }
];

/** Tax reduction: current spec (cash-flow) and legacy (financial/reduce-expenses). Check correct category per feature. Bugbot: new starts of financial/reduce-expenses are blocked in ResearchFeatureService to prevent cheap tax-reduction bypass. */
const TAX_REDUCTION_FEATURES: { featureId: string; value: number; categoryId: string }[] = [
  { featureId: 'reduce-tax-expense-02', value: 0.02, categoryId: 'cash-flow' },
  { featureId: 'reduce-expenses', value: 0.02, categoryId: 'financial' }
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
const INCOME_RATE_LEGACY_REPLACEMENT_IDS = ['increase-income-01', 'increase-income-02', 'increase-income-025'];

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
const INSURANCE_LEGACY_REPLACEMENT_ID = 'reduce-insurance-02';

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
 * Total tax expense reduction from unlocked tax features (spec 18 + legacy).
 * reduce-tax-expense-02 is cash-flow; legacy reduce-expenses is financial. Only one applies; both grant $0.02.
 * Pass prefetch to avoid N+1 queries (Bugbot).
 */
export async function getTaxReductionBonus(userId: string, prefetch?: BonusPrefetch): Promise<number> {
  const check = prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
  let total = 0;
  for (const { featureId, value, categoryId } of TAX_REDUCTION_FEATURES) {
    if (await check(categoryId, featureId)) {
      total += value;
      break; // Only one tax reduction feature (current or legacy) per user
    }
  }
  return total;
}

/** Migration replacement for rental-profit-increase is rental-profit-01. Add legacy only when user doesn't have it (Bugbot). */
const RENTAL_LEGACY_REPLACEMENT_ID = 'rental-profit-01';

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

/** Hack-ability battalion-size feature IDs in prereq order (spec 18). Value is the additive increase. */
const BATTALION_SIZE_FEATURES: { featureId: string; add: number }[] = [
  { featureId: 'battalion-size-250', add: 250 },
  { featureId: 'battalion-size-500', add: 500 },
  { featureId: 'battalion-size-1000', add: 1000 },
  { featureId: 'battalion-size-2000', add: 2000 },
  { featureId: 'battalion-size-4500', add: 4500 },
  { featureId: 'battalion-size-6500', add: 6500 },
];

/** Legacy feature IDs (pre–spec-18) so we find docs before grandfather migration runs. Same category hack-ability. */
const BATTALION_SIZE_LEGACY_IDS: Record<string, string[]> = {
  'battalion-size-250': ['battalion-size-250', 'increase-battalion-size'],
};

const BASE_BATTALION_SIZE = 250;

/**
 * Max troops per battalion for a user from research (250, 500, 1000, 2000, 4000, 8500, or 15000).
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
