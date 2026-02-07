import { IUser } from '../models/User';
import { RentalHousingIncomeService } from './RentalHousingIncomeService';
import { isResearchFeatureUnlocked, getResearchFeatureUnlockTime } from '../utils/researchFeatureUtils';

export interface RentalHousingSyncResult {
  needsSync: boolean;
  syncedAmount: number;
  totalUnlockedProperties: number;
  syncTimestamp: Date;
}

export class RentalHousingSyncService {
  private static readonly BASE_INCOME_RATE_BONUS = 0.05; // $0.05 per second bonus when income rate research unlocked
  private static readonly INSURANCE_REDUCTION_BONUS = 0.02; // $0.02 per second when reduce insurance expense research unlocked
  /** Pre-level-system flat rate per property per second; use for historical income when user is legacy (would be grandfathered). */
  private static readonly LEGACY_FLAT_RATE_PER_PROPERTY = 0.06;
  private static readonly LEGACY_RESEARCH_BONUS_PER_PROPERTY = 0.04; // 4 rooms × 0.01

  static async checkAndSyncRentalHousingIncome(user: IUser): Promise<RentalHousingSyncResult> {
    const now = new Date();
    
    // Check if user has any unlocked rental properties
    const unlockedProperties = this.getUnlockedProperties(user);
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
    const syncedAmount = await this.calculateHistoricalIncome(user, now);
    
    return {
      needsSync: true,
      syncedAmount,
      totalUnlockedProperties,
      syncTimestamp: now
    };
  }

  private static getUnlockedProperties(user: IUser): number[] {
    const unlockedProperties: number[] = [];
    for (let i = 1; i <= 4; i++) {
      const level = RentalHousingIncomeService.getPropertyLevel(user, i);
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

  static async isIncomeRateResearchUnlocked(userId: string): Promise<boolean> {
    return isResearchFeatureUnlocked(userId, 'cash-flow', 'increase-income-rate');
  }

  static async isInsuranceReductionResearchUnlocked(userId: string): Promise<boolean> {
    return isResearchFeatureUnlocked(userId, 'cash-flow', 'reduce-insurance-expense');
  }

  static async getIncomeRateResearchUnlockTime(userId: string): Promise<Date | null> {
    return getResearchFeatureUnlockTime(userId, 'cash-flow', 'increase-income-rate');
  }

  private static async calculateHistoricalIncome(user: IUser, now: Date): Promise<number> {
    const unlockedProperties = this.getUnlockedProperties(user);
    if (unlockedProperties.length === 0) {
      return 0;
    }

    // Calculate income from when balance was last updated
    const lastUpdated = user.balance.lastUpdated;
    
    // Get research unlock time to prevent retroactive bonus application
    const researchUnlockTime = await RentalHousingIncomeService.getRentalProfitResearchUnlockTime(String(user._id));
    
    let historicalIncome = 0;
    
    if (researchUnlockTime && researchUnlockTime > lastUpdated && researchUnlockTime <= now) {
      // Research was unlocked during the historical period - split calculation
      // Calculate income BEFORE research unlock (old rate)
      const secondsBeforeUnlock = (researchUnlockTime.getTime() - lastUpdated.getTime()) / 1000;
      const incomeBeforeUnlock = await this.calculateIncomeForPeriod(user, unlockedProperties.length, false);
      const incomeBefore = Math.floor(secondsBeforeUnlock * incomeBeforeUnlock);
      
      // Calculate income AFTER research unlock (new rate)
      const secondsAfterUnlock = (now.getTime() - researchUnlockTime.getTime()) / 1000;
      const incomeAfterUnlock = await this.calculateIncomeForPeriod(user, unlockedProperties.length, true);
      const incomeAfter = Math.floor(secondsAfterUnlock * incomeAfterUnlock);
      
      historicalIncome = incomeBefore + incomeAfter;
    } else {
      // Research was unlocked before lastUpdated or not unlocked yet - use single rate
      const secondsElapsed = (now.getTime() - lastUpdated.getTime()) / 1000;
      const isResearchUnlocked = !!researchUnlockTime && researchUnlockTime <= lastUpdated;
      const incomePerSecond = await this.calculateIncomeForPeriod(user, unlockedProperties.length, isResearchUnlocked);
      historicalIncome = Math.floor(secondsElapsed * incomePerSecond);
    }
    
    return historicalIncome;
  }

  /** True if every unlocked property would be grandfathered (no level or level 1 not set by build). Uses getPropertyLevel so we match getUnlockedProperties (levels and unlockedFeatures). */
  private static isFullyLegacyForHistoricalIncome(user: IUser): boolean {
    const levelSetByBuild = (user.rentalHousingLevelSetByBuild as Record<string, boolean>) || {};
    const levels = (user.rentalHousingLevels as Record<string, number>) || {};
    for (let i = 1; i <= 4; i++) {
      const level = RentalHousingIncomeService.getPropertyLevel(user, i);
      if (level < 1) continue;
      const storedLevel = levels[`property${i}`];
      const setByBuild = levelSetByBuild[`property${i}`];
      if (typeof storedLevel === 'number' && storedLevel >= 2) return false;
      if (typeof storedLevel === 'number' && storedLevel === 1 && setByBuild) return false;
    }
    return true;
  }

  private static async calculateIncomeForPeriod(user: IUser, propertyCount: number, isResearchUnlocked: boolean): Promise<number> {
    if (this.isFullyLegacyForHistoricalIncome(user)) {
      return propertyCount * (this.LEGACY_FLAT_RATE_PER_PROPERTY + (isResearchUnlocked ? this.LEGACY_RESEARCH_BONUS_PER_PROPERTY : 0));
    }
    const income = await RentalHousingIncomeService.calculateRentalHousingIncome(user, {
      includeResearchBonus: isResearchUnlocked,
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
    const levelSetByBuild = (user.rentalHousingLevelSetByBuild as Record<string, boolean>) || {};
    for (let i = 1; i <= 4; i++) {
      const ufKey = `rentalHousing${i}` as keyof typeof user.unlockedFeatures;
      const isUnlocked = user.unlockedFeatures[ufKey];
      const level = (user.rentalHousingLevels as Record<string, number>)?.[`property${i}`];
      const setByBuild = levelSetByBuild[`property${i}`];
      const shouldGrandfather = isUnlocked && (typeof level !== 'number' || level < 1 || (level === 1 && !setByBuild));
      if (shouldGrandfather) {
        (user.rentalHousingLevels as any) = user.rentalHousingLevels || {};
        (user.rentalHousingLevels as any)[`property${i}`] = 5;
        updated = true;
      }
    }
    if (updated) await user.save();
    return updated;
  }

  static async performSync(user: IUser): Promise<{ success: boolean; syncedAmount: number; newBalance: number }> {
    // Historical income must use pre-grandfather rates (legacy users at level 1), so run sync check first.
    const syncResult = await this.checkAndSyncRentalHousingIncome(user);
    await this.ensureLegacyRentalLevels(user);
    
    // CRITICAL: Always calculate and update ratePerSecond, even if no rental properties exist
    // This ensures income rate and insurance reduction research bonuses are applied for all users
    // Base rate is $1.00 + income rate bonus ($0.05) + insurance reduction bonus ($0.02) when unlocked, plus passive income
    const isIncomeRateUnlocked = await this.isIncomeRateResearchUnlocked(String(user._id));
    const isInsuranceReductionUnlocked = await this.isInsuranceReductionResearchUnlocked(String(user._id));
    const baseRate = 1.0
      + (isIncomeRateUnlocked ? this.BASE_INCOME_RATE_BONUS : 0)
      + (isInsuranceReductionUnlocked ? this.INSURANCE_REDUCTION_BONUS : 0);
    
    if (baseRate < 0) {
      console.error('[INCOME RATE] Invalid baseRate calculated:', baseRate);
      throw new Error('Invalid base rate calculation');
    }
    
    const rentalIncome = await RentalHousingIncomeService.calculateRentalHousingIncome(user);
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
      newBalance: user.balance.total
    };
  }
}
