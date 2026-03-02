import { ConstructionConfig, IConstructionLevel } from '../models/ConstructionConfig';

const RESEARCH_CENTER_BUILDING_TYPE = 'research_center';

/** Cache TTL: 5 minutes. Config rarely changes; avoids repeated DB reads for status polling and multi-call route handlers. */
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedResearchCenterConfig: ResearchCenterConfig | null = null;
let cacheExpiresAt = 0;

export interface ResearchCenterConfig {
  levels: IConstructionLevel[];
  maxLevel: number;
}

/**
 * Load Research Center construction config from construction_config collection.
 * Results are cached in memory for CACHE_TTL_MS to avoid redundant DB round trips (e.g. status polled every 5s during builds).
 * Throws if document for research_center is missing (no default values).
 */
export async function getResearchCenterConfig(): Promise<ResearchCenterConfig> {
  const now = Date.now();
  if (cachedResearchCenterConfig && now < cacheExpiresAt) {
    return cachedResearchCenterConfig;
  }
  const doc = await ConstructionConfig.findOne({ buildingType: RESEARCH_CENTER_BUILDING_TYPE }).lean();
  if (!doc) {
    throw new Error('Construction config for research_center not found in database. Run the seed script to populate construction_config.');
  }
  const levels = doc.levels as IConstructionLevel[];
  if (!levels?.length) {
    throw new Error('Research center construction config has no levels.');
  }
  const maxLevel = Math.max(...levels.map((l) => l.level));
  cachedResearchCenterConfig = { levels, maxLevel };
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedResearchCenterConfig;
}

/**
 * Get config for a specific Research Center level. Throws if level not defined in config.
 */
export async function getResearchCenterLevelConfig(level: number): Promise<IConstructionLevel> {
  const { levels } = await getResearchCenterConfig();
  const config = levels.find((c) => c.level === level);
  if (!config) {
    throw new Error(`Invalid research center level: ${level}`);
  }
  return config;
}

/**
 * Get max Research Center level from config. Throws if config missing.
 */
export async function getResearchCenterMaxLevel(): Promise<number> {
  const { maxLevel } = await getResearchCenterConfig();
  return maxLevel;
}
