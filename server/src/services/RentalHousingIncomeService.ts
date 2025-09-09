import { IUser } from '../models/User';

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

  private static readonly TOTAL_ROOMS_PER_PROPERTY = 4;
  private static readonly BASE_INCOME_PER_PROPERTY = 0.06; // $0.01 + $0.01 + $0.02 + $0.02

  static calculateRentalHousingIncome(user: IUser): RentalHousingIncome {
    const propertyBreakdown = [];
    let totalIncomePerSecond = 0;

    for (let propertyId = 1; propertyId <= 4; propertyId++) {
      const rentalHousingKey = `rentalHousing${propertyId}` as keyof typeof user.unlockedFeatures;
      const isUnlocked = user.unlockedFeatures[rentalHousingKey] || false;
      
      let incomePerSecond = 0;
      if (isUnlocked) {
        incomePerSecond = this.BASE_INCOME_PER_PROPERTY; // Fixed amount per property
      }

      const roomValues = {
        bathroom: this.ROOM_VALUES.bathroom, // Fixed room values
        kitchen: this.ROOM_VALUES.kitchen,
        bedroom: this.ROOM_VALUES.bedroom,
        livingRoom: this.ROOM_VALUES.livingRoom
      };

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

  static getRoomValue(roomType: 'bathroom' | 'kitchen' | 'bedroom' | 'livingRoom'): number {
    return this.ROOM_VALUES[roomType]; // Fixed room values
  }

  static getTotalPropertyIncome(): number {
    return this.BASE_INCOME_PER_PROPERTY; // Fixed amount per property
  }
}
