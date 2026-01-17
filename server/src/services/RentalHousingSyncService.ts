import { IUser } from '../models/User';
import { RentalHousingIncomeService } from './RentalHousingIncomeService';

export interface RentalHousingSyncResult {
  needsSync: boolean;
  syncedAmount: number;
  totalUnlockedProperties: number;
  syncTimestamp: Date;
}

export class RentalHousingSyncService {
  private static readonly BASE_INCOME_PER_PROPERTY = 0.06; // $0.06 per property per second

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
      const rentalHousingKey = `rentalHousing${i}` as keyof typeof user.unlockedFeatures;
      if (user.unlockedFeatures[rentalHousingKey]) {
        unlockedProperties.push(i);
      }
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

  private static async calculateIncomeForPeriod(user: IUser, propertyCount: number, isResearchUnlocked: boolean): Promise<number> {
    const baseIncomePerProperty = 0.06; // $0.06 per property per second (base rate)
    const researchBonusPerProperty = 0.04; // $0.04 bonus per property per second when research unlocked
    const incomePerProperty = baseIncomePerProperty + (isResearchUnlocked ? researchBonusPerProperty : 0);
    return propertyCount * incomePerProperty;
  }

  static async performSync(user: IUser): Promise<{ success: boolean; syncedAmount: number; newBalance: number }> {
    const syncResult = await this.checkAndSyncRentalHousingIncome(user);
    
    if (!syncResult.needsSync) {
      return {
        success: true,
        syncedAmount: 0,
        newBalance: user.balance.total
      };
    }

    // Add the synced amount to the user's balance
    const newBalance = user.balance.total + syncResult.syncedAmount;
    
    // Calculate total effective rate as baseRate + passiveIncome
    // Base rate is always $1.00, passive income is rental housing income
    const baseRate = 1.0;
    const rentalIncome = await RentalHousingIncomeService.calculateRentalHousingIncome(user);
    const rentalIncomePerSecond = rentalIncome.totalIncomePerSecond;
    const totalEffectiveRate = baseRate + rentalIncomePerSecond;
    
    // Update user with new balance, effective rate, and sync timestamp
    user.balance.total = newBalance;
    user.balance.ratePerSecond = totalEffectiveRate;
    user.balance.rentalHousingIncomeLastSynced = syncResult.syncTimestamp;
    user.balance.lastUpdated = syncResult.syncTimestamp;
    
    // Note: Lifetime high check is handled by the calling code (e.g., /api/balance endpoint)
    // to avoid duplicate checks and ensure correct update flag
    
    await user.save();

    return {
      success: true,
      syncedAmount: syncResult.syncedAmount,
      newBalance
    };
  }
}
