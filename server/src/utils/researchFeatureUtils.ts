import { UserResearchFeature } from '../models/UserResearchFeature';

/** Cash-flow feature IDs that add to base income rate (spec 18). */
const INCOME_RATE_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'increase-income-01', value: 0.01 },
  { featureId: 'increase-income-02', value: 0.02 },
  { featureId: 'increase-income-025', value: 0.025 },
  { featureId: 'increase-income-03', value: 0.03 }
];

/** Cash-flow feature IDs that reduce insurance expense (spec 18). */
const INSURANCE_REDUCTION_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'reduce-insurance-01', value: 0.01 },
  { featureId: 'reduce-insurance-02', value: 0.02 }
];

/** Cash-flow feature IDs that reduce tax expense (spec 18). Includes legacy 'reduce-expenses' for backwards compatibility. */
const TAX_REDUCTION_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'reduce-tax-expense-02', value: 0.02 },
  { featureId: 'reduce-expenses', value: 0.02 }
];

/** Investments feature IDs that add rental profit per room (spec 18). */
const RENTAL_PROFIT_FEATURES: { featureId: string; value: number }[] = [
  { featureId: 'rental-profit-01', value: 0.01 },
  { featureId: 'rental-profit-015', value: 0.015 }
];

/**
 * Total base income rate bonus from all unlocked cash-flow income features (spec 18).
 */
export async function getBaseIncomeRateBonus(userId: string): Promise<number> {
  let total = 0;
  for (const { featureId, value } of INCOME_RATE_FEATURES) {
    const unlocked = await isResearchFeatureUnlocked(userId, 'cash-flow', featureId);
    if (unlocked) total += value;
  }
  return total;
}

/**
 * Total insurance expense reduction from all unlocked cash-flow features (spec 18).
 */
export async function getInsuranceReductionBonus(userId: string): Promise<number> {
  let total = 0;
  for (const { featureId, value } of INSURANCE_REDUCTION_FEATURES) {
    const unlocked = await isResearchFeatureUnlocked(userId, 'cash-flow', featureId);
    if (unlocked) total += value;
  }
  return total;
}

/**
 * Total tax expense reduction from all unlocked cash-flow features (spec 18).
 * Only one of reduce-tax-expense-02 or legacy reduce-expenses should be unlocked; both grant $0.02.
 */
export async function getTaxReductionBonus(userId: string): Promise<number> {
  let total = 0;
  for (const { featureId, value } of TAX_REDUCTION_FEATURES) {
    const unlocked = await isResearchFeatureUnlocked(userId, 'cash-flow', featureId);
    if (unlocked) {
      total += value;
      break; // Only one tax reduction feature (current or legacy) per user
    }
  }
  return total;
}

/**
 * Total rental profit bonus per room per second from all unlocked investments features (spec 18).
 */
export async function getRentalProfitBonusPerRoom(userId: string): Promise<number> {
  let total = 0;
  for (const { featureId, value } of RENTAL_PROFIT_FEATURES) {
    const unlocked = await isResearchFeatureUnlocked(userId, 'investments', featureId);
    if (unlocked) total += value;
  }
  return total;
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
  { featureId: 'battalion-size-1000', add: 1000 }
];

const BASE_BATTALION_SIZE = 250;

/**
 * Max troops per battalion for a user from research (250, 500, 1000, or 2000).
 * Uses isUnlocked or "completing at or before asOfTime" so the cap updates as soon as research completes.
 * @param asOfTime If provided, research is treated unlocked when researchCompletesAt <= asOfTime.
 */
export async function getMaxBattalionSize(userId: string, asOfTime?: Date): Promise<number> {
  const now = (asOfTime ?? new Date()).getTime();
  let max = BASE_BATTALION_SIZE;
  for (const { featureId, add } of BATTALION_SIZE_FEATURES) {
    const doc = await UserResearchFeature.findOne({
      userId,
      categoryId: 'hack-ability',
      featureId
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
