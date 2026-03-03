import { IUser } from '../models/User';
import { RentalHousingIncomeService } from './RentalHousingIncomeService';
import { getPropertyMaxLevel } from './RentalPropertyConfigService';
import { getBaseIncomeRateBonus, getInsuranceReductionBonus, getTaxReductionBonus, getRentMortgageReductionBonus, getRentalProfitBonusPerRoom, getRentalProfitBonusPerRoomAsOf, getResearchFeaturesForBonusSync, type BonusPrefetch } from '../utils/researchFeatureUtils';

export interface RentalHousingSyncResult {
  needsSync: boolean;
  syncedAmount: number;
  totalUnlockedProperties: number;
  syncTimestamp: Date;
}

export interface PerformSyncResult {
  success: boolean;
  syncedAmount: number;
  newBalance: number;
  insuranceReduction: number;
  taxReduction: number;
  rentMortgageReduction: number;
}

export class RentalHousingSyncService {
  // Income/insurance bonuses are now multi-tier per spec 18; see researchFeatureUtils getBaseIncomeRateBonus, getInsuranceReductionBonus
  /** Pre-level-system flat rate per property per second; use for historical income when user is legacy (would be grandfathered). */
  private static readonly LEGACY_FLAT_RATE_PER_PROPERTY = 0.06;
  private static readonly LEGACY_RESEARCH_BONUS_PER_PROPERTY = 0.04; // 4 rooms × 0.01

  static async checkAndSyncRentalHousingIncome(user: IUser, bonusPrefetch?: BonusPrefetch): Promise<RentalHousingSyncResult> {
    const now = new Date();
    const maxPropertyLevel = await getPropertyMaxLevel();

    // Check if user has any unlocked rental properties
    const unlockedProperties = this.getUnlockedProperties(user, maxPropertyLevel);
    const totalUnlockedProperties = unlockedProperties.length;

    if (totalUnlockedProperties === 0) {
      // No properties unlocked, no sync needed
      return {
        needsSync: false,
        syncedAmount: 0,
        totalUnlockedProperties: 0,
        syncTimestamp: now
      };
    }

    // Check if we need to sync
    const needsSync = this.needsSync(user, now);

    if (!needsSync) {
      return {
        needsSync: false,
        syncedAmount: 0,
        totalUnlockedProperties,
        syncTimestamp: user.balance.rentalHousingIncomeLastSynced || now
      };
    }

    // Calculate historical income that should have been earned
    const syncedAmount = await this.calculateHistoricalIncome(user, now, bonusPrefetch, maxPropertyLevel);

    return {
      needsSync: true,
      syncedAmount,
      totalUnlockedProperties,
      syncTimestamp: now
    };
  }

  private static getUnlockedProperties(user: IUser, maxPropertyLevel: number): number[] {
    const unlockedProperties: number[] = [];
    for (let i = 1; i <= 4; i++) {
      const level = RentalHousingIncomeService.getPropertyLevel(user, i, maxPropertyLevel);
      if (level >= 1) unlockedProperties.push(i);
    }
    return unlockedProperties;
  }

  private static needsSync(user: IUser, now: Date): boolean {
    // If never synced before, we need to sync
    if (!user.balance.rentalHousingIncomeLastSynced) {
      return true;
    }

    // If ratePerSecond has changed since last sync, we need to recalculate
    // For now, we'll sync if it's been more than 1 hour since last sync
    // This ensures we don't miss significant ratePerSecond changes
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return user.balance.rentalHousingIncomeLastSynced < oneHourAgo;
  }

  private static async calculateHistoricalIncome(user: IUser, now: Date, bonusPrefetch: BonusPrefetch | undefined, maxPropertyLevel: number): Promise<number> {
    const unlockedProperties = this.getUnlockedProperties(user, maxPropertyLevel);
    if (unlockedProperties.length === 0) {
      return 0;
    }

    const lastUpdated = user.balance.lastUpdated;
    const userId = String(user._id);
    const lastMs = lastUpdated.getTime();
    const nowMs = now.getTime();

    // Segment by each rental-profit tier unlock time so we don't apply combined bonus retroactively.
    const unlockTimes = await RentalHousingIncomeService.getRentalProfitUnlockTimes(userId, bonusPrefetch);
    const boundariesInRange = unlockTimes.filter(t => {
      const ms = t.getTime();
      return ms > lastMs && ms <= nowMs;
    });
    const boundaries = [lastUpdated, ...boundariesInRange, now];

    let historicalIncome = 0;
    for (let i = 0; i < boundaries.length - 1; i++) {
      const segmentStart = boundaries[i];
      const segmentEnd = boundaries[i + 1];
      const secondsInSegment = (segmentEnd.getTime() - segmentStart.getTime()) / 1000;
      const bonusPerRoom = await getRentalProfitBonusPerRoomAsOf(userId, segmentStart, bonusPrefetch);
      const incomePerSecond = await this.calculateIncomeForPeriod(user, unlockedProperties.length, bonusPerRoom, maxPropertyLevel);
      historicalIncome += Math.floor(secondsInSegment * incomePerSecond);
    }

    return historicalIncome;
  }

  /** True if every unlocked property would be grandfathered (no level or level 1 not set by build). Uses getPropertyLevel so we match getUnlockedProperties (levels and unlockedFeatures). */
  private static isFullyLegacyForHistoricalIncome(user: IUser, maxPropertyLevel: number): boolean {
    const levelSetByBuild = (user.rentalHousingLevelSetByBuild as Record<string, boolean>) || {};
    const levels = (user.rentalHousingLevels as Record<string, number>) || {};
    for (let i = 1; i <= 4; i++) {
      const level = RentalHousingIncomeService.getPropertyLevel(user, i, maxPropertyLevel);
      if (level < 1) continue;
      const storedLevel = levels[`property${i}`];
      const setByBuild = levelSetByBuild[`property${i}`];
      if (typeof storedLevel === 'number' && storedLevel >= 2) return false;
      if (typeof storedLevel === 'number' && storedLevel === 1 && setByBuild) return false;
    }
    return true;
  }

  /** researchBonusPerRoom: 0 = no bonus; for legacy users any positive value uses LEGACY_RESEARCH_BONUS_PER_PROPERTY. */
  private static async calculateIncomeForPeriod(user: IUser, propertyCount: number, researchBonusPerRoom: number, maxPropertyLevel: number): Promise<number> {
    if (this.isFullyLegacyForHistoricalIncome(user, maxPropertyLevel)) {
      return propertyCount * (this.LEGACY_FLAT_RATE_PER_PROPERTY + (researchBonusPerRoom > 0 ? this.LEGACY_RESEARCH_BONUS_PER_PROPERTY : 0));
    }
    const income = await RentalHousingIncomeService.calculateRentalHousingIncome(user, {
      rentalProfitBonusPerRoom: researchBonusPerRoom,
    });
    return income.totalIncomePerSecond;
  }

  /**
   * Ensure legacy users with unlockedFeatures.rentalHousingN have rentalHousingLevels.propertyN = 5 (grandfathered).
   * In performSync we call checkAndSyncRentalHousingIncome before this so historical income uses pre-grandfather rates;
   * then we call this so ratePerSecond is correct going forward. Other callers (e.g. income endpoint) call this first so
   * current income/display uses level-5 rates.
   */
  static async ensureLegacyRentalLevels(user: IUser): Promise<boolean> {
    let updated = false;
    const maxPropertyLevel = await getPropertyMaxLevel();
    const levelSetByBuild = (user.rentalHousingLevelSetByBuild as Record<string, boolean>) || {};
    (user.rentalHousingLevels as any) = user.rentalHousingLevels || {};
    for (let i = 1; i <= 4; i++) {
      const ufKey = `rentalHousing${i}` as keyof typeof user.unlockedFeatures;
      const isUnlocked = user.unlockedFeatures[ufKey];
      const level = (user.rentalHousingLevels as Record<string, number>)?.[`property${i}`];
      const setByBuild = levelSetByBuild[`property${i}`];
      const shouldGrandfather = isUnlocked && (typeof level !== 'number' || level < 1 || (level === 1 && !setByBuild));
      if (shouldGrandfather) {
        (user.rentalHousingLevels as any)[`property${i}`] = Math.min(5, maxPropertyLevel);
        updated = true;
      } else if (typeof level === 'number' && level > maxPropertyLevel) {
        (user.rentalHousingLevels as any)[`property${i}`] = maxPropertyLevel;
        updated = true;
      }
    }
    if (updated) await user.save();
    return updated;
  }

  static async performSync(user: IUser): Promise<PerformSyncResult> {
    const userId = String(user._id);
    // One batch query for bonus-related research features; pass to all bonus getters to avoid N+1 (Bugbot).
    const bonusPrefetch = await getResearchFeaturesForBonusSync(userId);

    // Historical income must use pre-grandfather rates (legacy users at level 1), so run sync check first.
    const syncResult = await this.checkAndSyncRentalHousingIncome(user, bonusPrefetch);
    await this.ensureLegacyRentalLevels(user);

    // CRITICAL: Always calculate and update ratePerSecond, even if no rental properties exist
    // Base rate is $1.00 + income rate bonus + insurance + tax + rent/mortgage reduction, plus passive income
    const [incomeBonus, insuranceBonus, taxBonus, rentMortgageBonus] = await Promise.all([
      getBaseIncomeRateBonus(userId, bonusPrefetch),
      getInsuranceReductionBonus(userId, bonusPrefetch),
      getTaxReductionBonus(userId, bonusPrefetch),
      getRentMortgageReductionBonus(userId, bonusPrefetch),
    ]);
    const baseRate = 1.0 + incomeBonus + insuranceBonus + taxBonus + rentMortgageBonus;

    if (baseRate < 0) {
      console.error('[INCOME RATE] Invalid baseRate calculated:', baseRate);
      throw new Error('Invalid base rate calculation');
    }

    const rentalBonusPerRoom = await getRentalProfitBonusPerRoom(userId, bonusPrefetch);
    const rentalIncome = await RentalHousingIncomeService.calculateRentalHousingIncome(user, { rentalProfitBonusPerRoom: rentalBonusPerRoom });
    const rentalIncomePerSecond = rentalIncome.totalIncomePerSecond;
    const totalEffectiveRate = baseRate + rentalIncomePerSecond;
    
    if (totalEffectiveRate < 0) {
      console.error('[INCOME RATE] Invalid totalEffectiveRate calculated:', totalEffectiveRate);
      throw new Error('Invalid total effective rate calculation');
    }
    
    // Update balance and timestamps only if rental sync occurred
    // If no sync needed, preserve existing balance and lastUpdated (already handled by /api/balance)
    if (syncResult.needsSync) {
      const newBalance = user.balance.total + syncResult.syncedAmount;
      user.balance.total = newBalance;
      user.balance.rentalHousingIncomeLastSynced = syncResult.syncTimestamp;
      // Only update lastUpdated if rental sync occurred (preserves income calculation from /api/balance)
      user.balance.lastUpdated = syncResult.syncTimestamp;
    } else {
      // No rental sync, but still update rentalHousingIncomeLastSynced to current time
      // This prevents unnecessary sync checks in the future
      user.balance.rentalHousingIncomeLastSynced = syncResult.syncTimestamp;
    }
    
    // Always update ratePerSecond to ensure research bonuses are applied
    // This must happen even when needsSync is false to apply income rate research bonuses
    user.balance.ratePerSecond = totalEffectiveRate;
    
    // Note: Lifetime high check is handled by the calling code (e.g., /api/balance endpoint)
    // to avoid duplicate checks and ensure correct update flag
    
    await user.save();

    return {
      success: true,
      syncedAmount: syncResult.syncedAmount,
      newBalance: user.balance.total,
      insuranceReduction: insuranceBonus,
      taxReduction: taxBonus,
      rentMortgageReduction: rentMortgageBonus,
    };
  }
}
