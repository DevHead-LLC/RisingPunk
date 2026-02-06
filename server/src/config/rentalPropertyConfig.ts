/**
 * Rental property build levels (1-5) and room remodel levels (1-4).
 * Builds = property level upgrades. Remodels = per-room upgrades.
 * Room level 1 = base (no remodel). Room levels 2-4 add income (require property level 3+).
 */

export const PROPERTY_BUILD_LEVELS = [
  { level: 1, constructionTimeMinutes: 5, cost: 10_000 },
  { level: 2, constructionTimeMinutes: 15, cost: 30_000 },
  { level: 3, constructionTimeMinutes: 30, cost: 50_000 },
  { level: 4, constructionTimeMinutes: 60, cost: 75_000 },
  { level: 5, constructionTimeMinutes: 120, cost: 100_000 },
] as const;

/** Base income per second by property level. Bath/kitchen = small rate, bed/living = double rate. */
export const PROPERTY_BASE_RATES = {
  /** Bath and kitchen ($/sec) */
  small: [0.005, 0.01, 0.015, 0.02, 0.025] as const,
  /** Bedroom and living room ($/sec) */
  large: [0.01, 0.02, 0.03, 0.04, 0.05] as const,
} as const;

/**
 * Room remodel levels 2-4: add this amount to the room's base (bath/kitchen = small).
 * Min property level required: room level 2 → property 3, room 3 → property 4, room 4 → property 5.
 */
export const ROOM_REMODEL_ADD_SMALL: Record<2 | 3 | 4, number> = {
  2: 0.005,
  3: 0.01,
  4: 0.015,
};

/** Same as above for bedroom/living room (large rooms — double the add). */
export const ROOM_REMODEL_ADD_LARGE: Record<2 | 3 | 4, number> = {
  2: 0.01,
  3: 0.02,
  4: 0.03,
};

/** Min property level required to have this room remodel level (room level 2/3/4). */
export const ROOM_REMODEL_MIN_PROPERTY_LEVEL: Record<2 | 3 | 4, number> = {
  2: 3,
  3: 4,
  4: 5,
};

export const ROOM_REMODEL_LEVELS = [
  { roomLevel: 2, constructionTimeMinutes: 5, cost: 5_000, addPerSecond: 0.005, minPropertyLevel: 3 },
  { roomLevel: 3, constructionTimeMinutes: 10, cost: 10_000, addPerSecond: 0.01, minPropertyLevel: 4 },
  { roomLevel: 4, constructionTimeMinutes: 15, cost: 15_000, addPerSecond: 0.015, minPropertyLevel: 5 },
] as const;

export type RoomType = 'bathroom' | 'kitchen' | 'bedroom' | 'livingRoom';

export function getPropertyBuildConfig(level: 1 | 2 | 3 | 4 | 5) {
  const config = PROPERTY_BUILD_LEVELS.find(c => c.level === level);
  if (!config) throw new Error(`Invalid property build level: ${level}`);
  return config;
}

export function getRoomRemodelConfig(roomLevel: 2 | 3 | 4) {
  const config = ROOM_REMODEL_LEVELS.find(c => c.roomLevel === roomLevel);
  if (!config) throw new Error(`Invalid room remodel level: ${roomLevel}`);
  return config;
}
