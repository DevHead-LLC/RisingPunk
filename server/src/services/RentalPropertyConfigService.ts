import {
  RentalPropertyConstructionConfig,
  IPropertyBuildLevel,
  IRoomRemodelLevel,
} from '../models/RentalPropertyConstructionConfig';

const RENTAL_PROPERTY_BUILDING_TYPE = 'rental_property';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedConfig: { propertyLevels: IPropertyBuildLevel[]; roomRemodelLevels: IRoomRemodelLevel[]; maxPropertyLevel: number; maxRoomLevel: number } | null = null;
let cacheExpiresAt = 0;

export type RentalPropertyConfig = {
  propertyLevels: IPropertyBuildLevel[];
  roomRemodelLevels: IRoomRemodelLevel[];
  maxPropertyLevel: number;
  maxRoomLevel: number;
};

export async function getRentalPropertyConfig(): Promise<RentalPropertyConfig> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiresAt) {
    return cachedConfig;
  }
  const doc = await RentalPropertyConstructionConfig.findOne({ buildingType: RENTAL_PROPERTY_BUILDING_TYPE }).lean();
  if (!doc) {
    throw new Error('Construction config for rental_property not found in database. Run the seed script to populate construction_config.');
  }
  const propertyLevels = (doc as any).propertyLevels as IPropertyBuildLevel[];
  const roomRemodelLevels = (doc as any).roomRemodelLevels as IRoomRemodelLevel[];
  if (!propertyLevels?.length || !roomRemodelLevels?.length) {
    throw new Error('Rental property construction config has no propertyLevels or roomRemodelLevels.');
  }
  const maxPropertyLevel = Math.max(...propertyLevels.map((l) => l.level));
  const maxRoomLevel = Math.max(...roomRemodelLevels.map((l) => l.roomLevel));
  cachedConfig = { propertyLevels, roomRemodelLevels, maxPropertyLevel, maxRoomLevel };
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedConfig;
}

export async function getPropertyBuildLevelConfig(level: number): Promise<IPropertyBuildLevel> {
  const { propertyLevels } = await getRentalPropertyConfig();
  const config = propertyLevels.find((c) => c.level === level);
  if (!config) {
    throw new Error(`Invalid property build level: ${level}`);
  }
  return config;
}

export async function getPropertyMaxLevel(): Promise<number> {
  const { maxPropertyLevel } = await getRentalPropertyConfig();
  return maxPropertyLevel;
}

export async function getRoomRemodelLevelConfig(roomLevel: number): Promise<IRoomRemodelLevel> {
  const { roomRemodelLevels } = await getRentalPropertyConfig();
  const config = roomRemodelLevels.find((c) => c.roomLevel === roomLevel);
  if (!config) {
    throw new Error(`Invalid room remodel level: ${roomLevel}`);
  }
  return config;
}

export async function getRoomRemodelMaxLevel(): Promise<number> {
  const { maxRoomLevel } = await getRentalPropertyConfig();
  return maxRoomLevel;
}
