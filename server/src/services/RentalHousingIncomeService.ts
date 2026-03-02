import { IUser } from '../models/User';
import { getRentalProfitBonusPerRoom, getResearchFeatureUnlockTime, getRentalProfitUnlockTimes, RENTAL_PROFIT_FEATURES, type BonusPrefetch } from '../utils/researchFeatureUtils';
import { getRentalPropertyConfig } from './RentalPropertyConfigService';
import type { RentalPropertyConfig } from './RentalPropertyConfigService';
import type { IPropertyBuildLevel, IRoomRemodelLevel } from '../models/RentalPropertyConstructionConfig';

export type RoomType = 'bathroom' | 'kitchen' | 'bedroom' | 'livingRoom' | 'garage';

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
      garage: number;
    };
    roomLevels?: {
      bathroom: number;
      kitchen: number;
      bedroom: number;
      livingRoom: number;
      garage: number;
    };
  }[];
}

const PROPERTY_LEVEL_CAP = 9;
const ROOM_LEVEL_CAP = 8;

export class RentalHousingIncomeService {
  /** Effective property level (1-9). Uses rentalHousingLevels; if legacy unlocked with no level, returns 1. Capped at 9. */
  static getPropertyLevel(user: IUser, propertyId: number): number {
    const levels = user.rentalHousingLevels;
    const level = levels?.[`property${propertyId}` as keyof typeof levels];
    if (typeof level === 'number' && level >= 1 && level <= PROPERTY_LEVEL_CAP) return Math.min(PROPERTY_LEVEL_CAP, level);
    const rentalHousingKey = `rentalHousing${propertyId}` as keyof typeof user.unlockedFeatures;
    const isUnlocked = user.unlockedFeatures[rentalHousingKey];
    if (isUnlocked) return 1;
    return 0;
  }

  /** Room levels 1-8 for a property. Garage default 1. Capped at 8. */
  static getRoomLevels(user: IUser, propertyId: number): {
    bathroom: number;
    kitchen: number;
    bedroom: number;
    livingRoom: number;
    garage: number;
  } {
    const rooms = user.rentalHousingRooms?.[`property${propertyId}` as keyof typeof user.rentalHousingRooms];
    if (!rooms) return { bathroom: 1, kitchen: 1, bedroom: 1, livingRoom: 1, garage: 1 };
    const clamp = (n: number) => Math.min(ROOM_LEVEL_CAP, Math.max(1, n));
    return {
      bathroom: clamp(rooms.bathroom ?? 1),
      kitchen: clamp(rooms.kitchen ?? 1),
      bedroom: clamp(rooms.bedroom ?? 1),
      livingRoom: clamp(rooms.livingRoom ?? 1),
      garage: clamp(rooms.garage ?? 1),
    };
  }

  /** Compute one room's rate from config. Garage only when propertyLevel >= 7; garage remodel add only for room level 5+. */
  static getRoomIncomeFromConfig(
    config: RentalPropertyConfig,
    propertyLevel: number,
    roomLevel: number,
    roomType: RoomType
  ): number {
    if (propertyLevel < 1 || propertyLevel > config.maxPropertyLevel) return 0;
    const levelConfig = config.propertyLevels.find((l) => l.level === propertyLevel);
    if (!levelConfig) return 0;

    const rateKey = roomType === 'bathroom' ? 'bath' : roomType === 'bedroom' ? 'bed1' : roomType === 'livingRoom' ? 'livingRoom' : roomType === 'kitchen' ? 'kitchen' : 'garage';
    const addKey = roomType === 'bathroom' ? 'bathroom' : roomType === 'bedroom' ? 'bedroom' : roomType === 'livingRoom' ? 'livingRoom' : roomType === 'kitchen' ? 'kitchen' : 'garage';

    if (roomType === 'garage') {
      const garageRate = levelConfig.rates.garage ?? 0;
      if (propertyLevel < 7 || garageRate === 0) return 0;
      const remodelConfig = config.roomRemodelLevels.find((r) => r.roomLevel === roomLevel);
      const add = roomLevel >= 5 && remodelConfig?.addRates.garage != null ? remodelConfig.addRates.garage : 0;
      return garageRate + add;
    }

    let base = 0;
    if (rateKey === 'bath') base = levelConfig.rates.bath;
    else if (rateKey === 'bed1') base = levelConfig.rates.bed1;
    else if (rateKey === 'livingRoom') base = levelConfig.rates.livingRoom;
    else if (rateKey === 'kitchen') base = levelConfig.rates.kitchen;
    const remodelConfig = config.roomRemodelLevels.find((r) => r.roomLevel === roomLevel);
    const minProp = remodelConfig?.minPropertyLevel ?? 999;
    const add = roomLevel >= 2 && propertyLevel >= minProp && remodelConfig ? (remodelConfig.addRates as any)[addKey] ?? 0 : 0;
    return base + add;
  }

  static async getRentalProfitBonusPerRoom(userId: string, prefetch?: BonusPrefetch): Promise<number> {
    return getRentalProfitBonusPerRoom(userId, prefetch);
  }

  /** Earliest unlock time among rental-profit features (for historical income split). */
  static async getRentalProfitResearchUnlockTime(userId: string): Promise<Date | null> {
    let earliest: Date | null = null;
    for (const { featureId, categoryId } of RENTAL_PROFIT_FEATURES) {
      const t = await getResearchFeatureUnlockTime(userId, categoryId, featureId);
      if (t && (!earliest || t < earliest)) earliest = t;
    }
    return earliest;
  }

  /** Sorted unlock times for each rental-profit tier (for historical income segments). Includes legacy. Pass prefetch to avoid N+1. */
  static async getRentalProfitUnlockTimes(userId: string, prefetch?: BonusPrefetch): Promise<Date[]> {
    return getRentalProfitUnlockTimes(userId, prefetch);
  }

  /** Research bonus is applied per room. Garage only earns bonus when it has a base rate (property level >= 7). */
  static getRoomValuesWithResearch(
    baseRoomValues: { bathroom: number; kitchen: number; bedroom: number; livingRoom: number; garage: number },
    bonusPerRoom: number
  ): { bathroom: number; kitchen: number; bedroom: number; livingRoom: number; garage: number } {
    return {
      bathroom: baseRoomValues.bathroom + bonusPerRoom,
      kitchen: baseRoomValues.kitchen + bonusPerRoom,
      bedroom: baseRoomValues.bedroom + bonusPerRoom,
      livingRoom: baseRoomValues.livingRoom + bonusPerRoom,
      garage: baseRoomValues.garage > 0 ? baseRoomValues.garage + bonusPerRoom : 0,
    };
  }

  static async calculateRentalHousingIncome(
    user: IUser,
    options?: { includeResearchBonus?: boolean; rentalProfitBonusPerRoom?: number }
  ): Promise<RentalHousingIncome> {
    const config = await getRentalPropertyConfig();
    const propertyBreakdown: RentalHousingIncome['propertyBreakdown'] = [];
    let totalIncomePerSecond = 0;
    const explicitBonus = options?.rentalProfitBonusPerRoom;
    const bonusPerRoom =
      typeof explicitBonus === 'number'
        ? explicitBonus
        : options?.includeResearchBonus !== false
          ? await this.getRentalProfitBonusPerRoom(String(user._id))
          : 0;

    for (let propertyId = 1; propertyId <= 4; propertyId++) {
      const propertyLevel = this.getPropertyLevel(user, propertyId);
      const isUnlocked = propertyLevel >= 1;
      const roomLevels = this.getRoomLevels(user, propertyId);

      const bathroomRate = this.getRoomIncomeFromConfig(config, propertyLevel, roomLevels.bathroom, 'bathroom');
      const kitchenRate = this.getRoomIncomeFromConfig(config, propertyLevel, roomLevels.kitchen, 'kitchen');
      const bedroomRate = this.getRoomIncomeFromConfig(config, propertyLevel, roomLevels.bedroom, 'bedroom');
      const livingRoomRate = this.getRoomIncomeFromConfig(config, propertyLevel, roomLevels.livingRoom, 'livingRoom');
      const garageRate = this.getRoomIncomeFromConfig(config, propertyLevel, roomLevels.garage, 'garage');

      const baseRoomValues = {
        bathroom: bathroomRate,
        kitchen: kitchenRate,
        bedroom: bedroomRate,
        livingRoom: livingRoomRate,
        garage: garageRate,
      };
      const roomValues = this.getRoomValuesWithResearch(baseRoomValues, bonusPerRoom);
      const incomePerSecond = isUnlocked
        ? roomValues.bathroom + roomValues.kitchen + roomValues.bedroom + roomValues.livingRoom + roomValues.garage
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
