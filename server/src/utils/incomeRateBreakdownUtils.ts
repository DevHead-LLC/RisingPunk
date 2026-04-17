import type { BonusPrefetch } from './researchFeatureUtils';
import {
  isUnlockedInPrefetch,
  isResearchFeatureUnlocked,
  INCOME_RATE_FEATURES,
  INSURANCE_REDUCTION_FEATURES,
  CASH_FLOW_TAX_REDUCTION_STACK,
  RENT_MORTGAGE_REDUCTION_FEATURES,
  UTILITIES_REDUCTION_FEATURES,
  MISC_ENTERTAINMENT_REDUCTION_FEATURES,
  INCOME_RATE_LEGACY_REPLACEMENT_IDS,
  INSURANCE_LEGACY_REPLACEMENT_ID,
  RENTAL_PROFIT_FEATURES,
  RENTAL_LEGACY_REPLACEMENT_ID,
} from './researchFeatureUtils';

/** One unlocked research contribution to $/sec (job rate or per-room rental bonus). */
export type IncomeRateLine = {
  categoryId: string;
  featureId: string;
  /** Short description for UI */
  label: string;
  /** Added to job rate, or per-room increment for rental-profit tiers */
  perSecond: number;
};

function checkFn(userId: string, prefetch: BonusPrefetch | undefined) {
  return prefetch
    ? (cat: string, fid: string) => Promise.resolve(isUnlockedInPrefetch(prefetch, cat, fid))
    : (cat: string, fid: string) => isResearchFeatureUnlocked(userId, cat, fid);
}

/** Mirrors {@link getBaseIncomeRateBonus} — lines + total. */
export async function getBaseIncomeRateBonusLines(
  userId: string,
  prefetch?: BonusPrefetch
): Promise<{ lines: IncomeRateLine[]; total: number }> {
  const check = checkFn(userId, prefetch);
  const lines: IncomeRateLine[] = [];
  let total = 0;
  for (const { featureId, value } of INCOME_RATE_FEATURES) {
    if (await check('cash-flow', featureId)) {
      lines.push({
        categoryId: 'cash-flow',
        featureId,
        label: `Income research: ${featureId}`,
        perSecond: value,
      });
      total += value;
    }
  }
  const hasFullReplacement = (
    await Promise.all(INCOME_RATE_LEGACY_REPLACEMENT_IDS.map((id) => check('cash-flow', id)))
  ).every(Boolean);
  if (!hasFullReplacement && (await check('cash-flow', 'increase-income-rate'))) {
    lines.push({
      categoryId: 'cash-flow',
      featureId: 'increase-income-rate',
      label: 'Legacy: increase-income-rate',
      perSecond: 0.05,
    });
    total += 0.05;
  }
  return { lines, total };
}

/** Mirrors {@link getInsuranceReductionBonus}. */
export async function getInsuranceReductionLines(
  userId: string,
  prefetch?: BonusPrefetch
): Promise<{ lines: IncomeRateLine[]; total: number }> {
  const check = checkFn(userId, prefetch);
  const lines: IncomeRateLine[] = [];
  let total = 0;
  for (const { featureId, value } of INSURANCE_REDUCTION_FEATURES) {
    if (await check('cash-flow', featureId)) {
      lines.push({
        categoryId: 'cash-flow',
        featureId,
        label: `Insurance offset: ${featureId}`,
        perSecond: value,
      });
      total += value;
    }
  }
  const hasReplacement = await check('cash-flow', INSURANCE_LEGACY_REPLACEMENT_ID);
  if (!hasReplacement && (await check('cash-flow', 'reduce-insurance-expense'))) {
    lines.push({
      categoryId: 'cash-flow',
      featureId: 'reduce-insurance-expense',
      label: 'Legacy: reduce-insurance-expense',
      perSecond: 0.02,
    });
    total += 0.02;
  }
  return { lines, total };
}

/** Mirrors {@link getTaxReductionBonus}. */
export async function getTaxReductionLines(
  userId: string,
  prefetch?: BonusPrefetch
): Promise<{ lines: IncomeRateLine[]; total: number }> {
  const check = checkFn(userId, prefetch);
  const lines: IncomeRateLine[] = [];
  let total = 0;
  for (const { featureId, value } of CASH_FLOW_TAX_REDUCTION_STACK) {
    if (await check('cash-flow', featureId)) {
      lines.push({
        categoryId: 'cash-flow',
        featureId,
        label: `Tax expense offset: ${featureId}`,
        perSecond: value,
      });
      total += value;
    }
  }
  if (total === 0 && (await check('financial', 'reduce-expenses'))) {
    lines.push({
      categoryId: 'financial',
      featureId: 'reduce-expenses',
      label: 'Legacy financial: reduce-expenses',
      perSecond: 0.02,
    });
    total = 0.02;
  }
  return { lines, total };
}

/** Mirrors {@link getRentMortgageReductionBonus}. */
export async function getRentMortgageReductionLines(
  userId: string,
  prefetch?: BonusPrefetch
): Promise<{ lines: IncomeRateLine[]; total: number }> {
  const check = checkFn(userId, prefetch);
  const lines: IncomeRateLine[] = [];
  let total = 0;
  for (const { featureId, value } of RENT_MORTGAGE_REDUCTION_FEATURES) {
    if (await check('cash-flow', featureId)) {
      lines.push({
        categoryId: 'cash-flow',
        featureId,
        label: `Rent/mortgage offset: ${featureId}`,
        perSecond: value,
      });
      total += value;
    }
  }
  return { lines, total };
}

/** Mirrors {@link getUtilitiesReductionBonus}. */
export async function getUtilitiesReductionLines(
  userId: string,
  prefetch?: BonusPrefetch
): Promise<{ lines: IncomeRateLine[]; total: number }> {
  const check = checkFn(userId, prefetch);
  const lines: IncomeRateLine[] = [];
  let total = 0;
  for (const { featureId, value } of UTILITIES_REDUCTION_FEATURES) {
    if (await check('cash-flow', featureId)) {
      lines.push({
        categoryId: 'cash-flow',
        featureId,
        label: `Utilities offset: ${featureId}`,
        perSecond: value,
      });
      total += value;
    }
  }
  return { lines, total };
}

/** Mirrors {@link getMiscEntertainmentReductionBonus}. */
export async function getMiscEntertainmentReductionLines(
  userId: string,
  prefetch?: BonusPrefetch
): Promise<{ lines: IncomeRateLine[]; total: number }> {
  const check = checkFn(userId, prefetch);
  const lines: IncomeRateLine[] = [];
  let total = 0;
  for (const { featureId, value } of MISC_ENTERTAINMENT_REDUCTION_FEATURES) {
    if (await check('cash-flow', featureId)) {
      lines.push({
        categoryId: 'cash-flow',
        featureId,
        label: `Misc/entertainment offset: ${featureId}`,
        perSecond: value,
      });
      total += value;
    }
  }
  return { lines, total };
}

/** Mirrors {@link getRentalProfitBonusPerRoom} — each line is per room $/sec added to every room rate. */
export async function getRentalProfitResearchLines(
  userId: string,
  prefetch?: BonusPrefetch
): Promise<{ lines: IncomeRateLine[]; perRoomTotal: number }> {
  const check = checkFn(userId, prefetch);
  const lines: IncomeRateLine[] = [];
  let perRoomTotal = 0;
  for (const { featureId, value, categoryId } of RENTAL_PROFIT_FEATURES) {
    if (await check(categoryId, featureId)) {
      lines.push({
        categoryId,
        featureId,
        label: `Rental profit research: ${featureId} (per room)`,
        perSecond: value,
      });
      perRoomTotal += value;
    }
  }
  const hasReplacement = await check('investments', RENTAL_LEGACY_REPLACEMENT_ID);
  if (!hasReplacement && (await check('investments', 'rental-profit-increase'))) {
    lines.push({
      categoryId: 'investments',
      featureId: 'rental-profit-increase',
      label: 'Legacy: rental-profit-increase (per room)',
      perSecond: 0.01,
    });
    perRoomTotal += 0.01;
  }
  return { lines, perRoomTotal };
}
