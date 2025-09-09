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
    const secondsElapsed = (now.getTime() - lastUpdated.getTime()) / 1000;
    
    // Calculate rental housing income that should have been earned (fixed amount per property)
    const rentalIncomePerSecond = unlockedProperties.length * this.BASE_INCOME_PER_PROPERTY;
    const historicalIncome = Math.floor(secondsElapsed * rentalIncomePerSecond);
    
    return historicalIncome;
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
    
    // Calculate total effective rate including rental housing income (fixed amount per property)
    const rentalIncomePerSecond = syncResult.totalUnlockedProperties * this.BASE_INCOME_PER_PROPERTY;
    const totalEffectiveRate = user.balance.ratePerSecond + rentalIncomePerSecond;
    
    // Update user with new balance, effective rate, and sync timestamp
    user.balance.total = newBalance;
    user.balance.ratePerSecond = totalEffectiveRate;
    user.balance.rentalHousingIncomeLastSynced = syncResult.syncTimestamp;
    user.balance.lastUpdated = syncResult.syncTimestamp;
    
    await user.save();

    return {
      success: true,
      syncedAmount: syncResult.syncedAmount,
      newBalance
    };
  }
}
