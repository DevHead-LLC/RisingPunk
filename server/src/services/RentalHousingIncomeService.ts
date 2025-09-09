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
        incomePerSecond = this.BASE_INCOME_PER_PROPERTY * user.balance.ratePerSecond;
      }

      const roomValues = {
        bathroom: this.ROOM_VALUES.bathroom * user.balance.ratePerSecond,
        kitchen: this.ROOM_VALUES.kitchen * user.balance.ratePerSecond,
        bedroom: this.ROOM_VALUES.bedroom * user.balance.ratePerSecond,
        livingRoom: this.ROOM_VALUES.livingRoom * user.balance.ratePerSecond
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

  static getRoomValue(roomType: 'bathroom' | 'kitchen' | 'bedroom' | 'livingRoom', ratePerSecond: number): number {
    return this.ROOM_VALUES[roomType] * ratePerSecond;
  }

  static getTotalPropertyIncome(ratePerSecond: number): number {
    return this.BASE_INCOME_PER_PROPERTY * ratePerSecond;
  }
}
