/**
 * Research Center building levels 1–3.
 * Level 1 = initial build; levels 2–3 = upgrades.
 */

export const RESEARCH_CENTER_LEVELS = [
  { level: 1, constructionTimeMinutes: 1, cost: 5_000 },
  { level: 2, constructionTimeMinutes: 30, cost: 15_000 },
  { level: 3, constructionTimeMinutes: 60, cost: 30_000 },
] as const;

export type ResearchCenterLevel = 1 | 2 | 3;

export function getResearchCenterLevelConfig(level: ResearchCenterLevel) {
  const config = RESEARCH_CENTER_LEVELS.find(c => c.level === level);
  if (!config) throw new Error(`Invalid research center level: ${level}`);
  return config;
}
