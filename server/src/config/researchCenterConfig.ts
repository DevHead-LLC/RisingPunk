/**
 * Research Center construction config — source of truth is construction_config collection.
 * Re-exports from ConstructionConfigService. Level is 1 to maxLevel (from DB).
 */

export type ResearchCenterLevel = number;

export {
  getResearchCenterLevelConfig,
  getResearchCenterMaxLevel,
} from '../services/ConstructionConfigService';
