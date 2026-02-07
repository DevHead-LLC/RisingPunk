import { IUser } from '../models/User';
import { isResearchFeatureUnlocked, getResearchFeatureUnlockTime } from '../utils/researchFeatureUtils';
import {
  PROPERTY_BASE_RATES,
  ROOM_REMODEL_ADD_SMALL,
  ROOM_REMODEL_ADD_LARGE,
  ROOM_REMODEL_MIN_PROPERTY_LEVEL,
  type RoomType,
} from '../config/rentalPropertyConfig';

export interface RentalHousingIncome {
  totalIncomePerSecond: number;
  propertyBreakdown: {
    propertyId: number;
    isUnlocked: boolean;
    propertyLevel: number;
    incomePerSecond: number;
    roomValues: {
      bathroom: number;
      kitchen: number;
      bedroom: number;
      livingRoom: number;
    };
    roomLevels?: {
      bathroom: number;
      kitchen: number;
      bedroom: number;
      livingRoom: number;
    };
  }[];
}

export class RentalHousingIncomeService {
  private static readonly RESEARCH_BONUS_PER_ROOM = 0.01;

  /** Effective property level (1-5). Uses rentalHousingLevels; if legacy unlocked with no level, returns 1. */
  static getPropertyLevel(user: IUser, propertyId: number): number {
    const levels = user.rentalHousingLevels;
    const level = levels?.[`property${propertyId}` as keyof typeof levels];
    if (typeof level === 'number' && level >= 1 && level <= 5) return level;
    const rentalHousingKey = `rentalHousing${propertyId}` as keyof typeof user.unlockedFeatures;
    const isUnlocked = user.unlockedFeatures[rentalHousingKey];
    if (isUnlocked) return 1;
    return 0;
  }

  /** Room levels 1-4 for a property. Default 1. */
  static getRoomLevels(user: IUser, propertyId: number): { bathroom: number; kitchen: number; bedroom: number; livingRoom: number } {
    const rooms = user.rentalHousingRooms?.[`property${propertyId}` as keyof typeof user.rentalHousingRooms];
    if (!rooms) return { bathroom: 1, kitchen: 1, bedroom: 1, livingRoom: 1 };
    return {
      bathroom: Math.min(4, Math.max(1, rooms.bathroom ?? 1)),
      kitchen: Math.min(4, Math.max(1, rooms.kitchen ?? 1)),
      bedroom: Math.min(4, Math.max(1, rooms.bedroom ?? 1)),
      livingRoom: Math.min(4, Math.max(1, rooms.livingRoom ?? 1)),
    };
  }

  /** Income for one room: base (from property level) + remodel add (if room level 2+ and property level allows). */
  static getRoomIncome(
    propertyLevel: number,
    roomLevel: number,
    isSmallRoom: boolean
  ): number {
    if (propertyLevel < 1 || propertyLevel > 5) return 0;
    const baseRates = isSmallRoom ? PROPERTY_BASE_RATES.small : PROPERTY_BASE_RATES.large;
    let rate = baseRates[propertyLevel - 1];
    if (roomLevel >= 2 && roomLevel <= 4) {
      const minProp = ROOM_REMODEL_MIN_PROPERTY_LEVEL[roomLevel as 2 | 3 | 4];
      if (propertyLevel >= minProp) {
        const addRates = isSmallRoom ? ROOM_REMODEL_ADD_SMALL : ROOM_REMODEL_ADD_LARGE;
        rate += addRates[roomLevel as 2 | 3 | 4];
      }
    }
    return rate;
  }

  static async isRentalProfitResearchUnlocked(userId: string): Promise<boolean> {
    return isResearchFeatureUnlocked(userId, 'investments', 'rental-profit-increase');
  }

  static async getRentalProfitResearchUnlockTime(userId: string): Promise<Date | null> {
    return getResearchFeatureUnlockTime(userId, 'investments', 'rental-profit-increase');
  }

  static getRoomValuesWithResearch(
    baseRoomValues: { bathroom: number; kitchen: number; bedroom: number; livingRoom: number },
    isResearchUnlocked: boolean
  ): { bathroom: number; kitchen: number; bedroom: number; livingRoom: number } {
    const bonus = isResearchUnlocked ? this.RESEARCH_BONUS_PER_ROOM : 0;
    return {
      bathroom: baseRoomValues.bathroom + bonus,
      kitchen: baseRoomValues.kitchen + bonus,
      bedroom: baseRoomValues.bedroom + bonus,
      livingRoom: baseRoomValues.livingRoom + bonus,
    };
  }

  static async calculateRentalHousingIncome(
    user: IUser,
    options?: { includeResearchBonus?: boolean }
  ): Promise<RentalHousingIncome> {
    const propertyBreakdown: RentalHousingIncome['propertyBreakdown'] = [];
    let totalIncomePerSecond = 0;
    const includeResearch = options?.includeResearchBonus !== false;
    const isResearchUnlocked = includeResearch && (await this.isRentalProfitResearchUnlocked(String(user._id)));

    for (let propertyId = 1; propertyId <= 4; propertyId++) {
      const propertyLevel = this.getPropertyLevel(user, propertyId);
      const isUnlocked = propertyLevel >= 1;
      const roomLevels = this.getRoomLevels(user, propertyId);

      const bathroomRate = this.getRoomIncome(propertyLevel, roomLevels.bathroom, true);
      const kitchenRate = this.getRoomIncome(propertyLevel, roomLevels.kitchen, true);
      const bedroomRate = this.getRoomIncome(propertyLevel, roomLevels.bedroom, false);
      const livingRoomRate = this.getRoomIncome(propertyLevel, roomLevels.livingRoom, false);

      const baseRoomValues = {
        bathroom: bathroomRate,
        kitchen: kitchenRate,
        bedroom: bedroomRate,
        livingRoom: livingRoomRate,
      };
      const roomValues = this.getRoomValuesWithResearch(baseRoomValues, isResearchUnlocked);
      const incomePerSecond = isUnlocked
        ? roomValues.bathroom + roomValues.kitchen + roomValues.bedroom + roomValues.livingRoom
        : 0;

      propertyBreakdown.push({
        propertyId,
        isUnlocked,
        propertyLevel: isUnlocked ? propertyLevel : 0,
        incomePerSecond,
        roomValues,
        roomLevels,
      });
      totalIncomePerSecond += incomePerSecond;
    }

    return {
      totalIncomePerSecond,
      propertyBreakdown,
    };
  }

  static async getRoomValue(
    user: IUser,
    propertyId: number,
    roomType: RoomType
  ): Promise<number> {
    const income = await this.calculateRentalHousingIncome(user);
    const prop = income.propertyBreakdown.find(p => p.propertyId === propertyId);
    if (!prop) return 0;
    return prop.roomValues[roomType];
  }

  static async getTotalPropertyIncome(user: IUser): Promise<number> {
    const income = await this.calculateRentalHousingIncome(user);
    return income.totalIncomePerSecond;
  }
}
