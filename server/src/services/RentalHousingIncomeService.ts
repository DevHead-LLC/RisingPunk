import { IUser } from '../models/User';
import { UserResearchFeature } from '../models/UserResearchFeature';

export interface RentalHousingIncome {
  totalIncomePerSecond: number;
  propertyBreakdown: {
    propertyId: number;
    isUnlocked: boolean;
    incomePerSecond: number;
    roomValues: {
      bathroom: number;
      kitchen: number;
      bedroom: number;
      livingRoom: number;
    };
  }[];
}

export class RentalHousingIncomeService {
  private static readonly ROOM_VALUES = {
    bathroom: 0.01,
    kitchen: 0.01,
    bedroom: 0.02,
    livingRoom: 0.02
  };

  private static readonly RESEARCH_BONUS_PER_ROOM = 0.01;
  private static readonly TOTAL_ROOMS_PER_PROPERTY = 4;
  private static readonly BASE_INCOME_PER_PROPERTY = 0.06;

  static async isRentalProfitResearchUnlocked(userId: string): Promise<boolean> {
    try {
      const feature = await UserResearchFeature.findOne({
        userId,
        categoryId: 'investments',
        featureId: 'rental-profit-increase'
      })
      .select('isUnlocked unlockedAt')
      .lean();

      if (!feature) {
        console.log(`[RENTAL INCOME] Research feature not found for user ${userId}`);
        return false;
      }

      const isUnlocked = !!feature.isUnlocked;
      console.log(`[RENTAL INCOME] User ${userId} research unlock status: isUnlocked=${isUnlocked}, unlockedAt=${feature.unlockedAt}`);
      return isUnlocked;
    } catch (error) {
      console.error('[RENTAL INCOME] Error checking rental profit research unlock status:', error);
      return false;
    }
  }

  static getRoomValuesWithResearch(isResearchUnlocked: boolean): { bathroom: number; kitchen: number; bedroom: number; livingRoom: number } {
    const researchBonus = isResearchUnlocked ? this.RESEARCH_BONUS_PER_ROOM : 0;

    return {
      bathroom: this.ROOM_VALUES.bathroom + researchBonus,
      kitchen: this.ROOM_VALUES.kitchen + researchBonus,
      bedroom: this.ROOM_VALUES.bedroom + researchBonus,
      livingRoom: this.ROOM_VALUES.livingRoom + researchBonus
    };
  }

  static async calculateRentalHousingIncome(user: IUser): Promise<RentalHousingIncome> {
    const propertyBreakdown = [];
    let totalIncomePerSecond = 0;

    const isResearchUnlocked = await this.isRentalProfitResearchUnlocked(String(user._id));
    const roomValues = this.getRoomValuesWithResearch(isResearchUnlocked);
    const incomePerProperty = roomValues.bathroom + roomValues.kitchen + roomValues.bedroom + roomValues.livingRoom;
    
    console.log(`[RENTAL INCOME] Calculating for user ${user._id}: researchUnlocked=${isResearchUnlocked}, roomValues=`, roomValues, `incomePerProperty=${incomePerProperty}`);

    for (let propertyId = 1; propertyId <= 4; propertyId++) {
      const rentalHousingKey = `rentalHousing${propertyId}` as keyof typeof user.unlockedFeatures;
      const isUnlocked = user.unlockedFeatures[rentalHousingKey] || false;
      
      let incomePerSecond = 0;
      if (isUnlocked) {
        incomePerSecond = incomePerProperty;
      }

      propertyBreakdown.push({
        propertyId,
        isUnlocked,
        incomePerSecond,
        roomValues
      });

      totalIncomePerSecond += incomePerSecond;
    }

    return {
      totalIncomePerSecond,
      propertyBreakdown
    };
  }

  static async getRoomValue(user: IUser, roomType: 'bathroom' | 'kitchen' | 'bedroom' | 'livingRoom'): Promise<number> {
    const isResearchUnlocked = await this.isRentalProfitResearchUnlocked(String(user._id));
    const roomValues = this.getRoomValuesWithResearch(isResearchUnlocked);
    return roomValues[roomType];
  }

  static async getTotalPropertyIncome(user: IUser): Promise<number> {
    const isResearchUnlocked = await this.isRentalProfitResearchUnlocked(String(user._id));
    const roomValues = this.getRoomValuesWithResearch(isResearchUnlocked);
    return roomValues.bathroom + roomValues.kitchen + roomValues.bedroom + roomValues.livingRoom;
  }
}
