/**
 * Seed data for construction_config documents. Single source of truth for rental_property
 * (and optionally research_center) so the seed script and server bootstrap stay in sync.
 */

import type { IPropertyBuildLevel, IRoomRemodelLevel } from '../models/RentalPropertyConstructionConfig';

/** Investment Properties: levels 1–9. Garage rate from level 7+. */
export const RENTAL_PROPERTY_LEVELS: IPropertyBuildLevel[] = [
  { level: 1, constructionTimeMinutes: 5, cost: 10_000, rates: { bath: 0.005, bed1: 0.01, livingRoom: 0.01, kitchen: 0.005 } },
  { level: 2, constructionTimeMinutes: 15, cost: 30_000, rates: { bath: 0.01, bed1: 0.02, livingRoom: 0.02, kitchen: 0.01 } },
  { level: 3, constructionTimeMinutes: 30, cost: 50_000, rates: { bath: 0.015, bed1: 0.03, livingRoom: 0.03, kitchen: 0.015 } },
  { level: 4, constructionTimeMinutes: 60, cost: 75_000, rates: { bath: 0.02, bed1: 0.04, livingRoom: 0.04, kitchen: 0.02 } },
  { level: 5, constructionTimeMinutes: 120, cost: 100_000, rates: { bath: 0.025, bed1: 0.05, livingRoom: 0.05, kitchen: 0.025 } },
  { level: 6, constructionTimeMinutes: 240, cost: 200_000, rates: { bath: 0.03, bed1: 0.05, livingRoom: 0.05, kitchen: 0.03 } },
  { level: 7, constructionTimeMinutes: 480, cost: 500_000, rates: { bath: 0.03, bed1: 0.055, livingRoom: 0.055, kitchen: 0.03, garage: 0.025 } },
  { level: 8, constructionTimeMinutes: 720, cost: 1_000_000, rates: { bath: 0.035, bed1: 0.055, livingRoom: 0.055, kitchen: 0.035, garage: 0.03 } },
  { level: 9, constructionTimeMinutes: 1080, cost: 1_500_000, rates: { bath: 0.035, bed1: 0.06, livingRoom: 0.06, kitchen: 0.035, garage: 0.035 } },
];

/** Room remodel levels 2–8. Main-floor rooms use all tiers. Garage has only levels 2–4 (min property 7/8/9); adds sum to $0.02 so prop-9 garage L4 total = $0.055/s. */
export const RENTAL_ROOM_REMODEL_LEVELS: IRoomRemodelLevel[] = [
  { roomLevel: 2, constructionTimeMinutes: 5, cost: 5_000, minPropertyLevel: 3, addRates: { bathroom: 0.005, bedroom: 0.01, livingRoom: 0.01, kitchen: 0.005, garage: 0.005 } },
  { roomLevel: 3, constructionTimeMinutes: 10, cost: 10_000, minPropertyLevel: 4, addRates: { bathroom: 0.01, bedroom: 0.02, livingRoom: 0.02, kitchen: 0.01, garage: 0.005 } },
  { roomLevel: 4, constructionTimeMinutes: 15, cost: 15_000, minPropertyLevel: 5, addRates: { bathroom: 0.015, bedroom: 0.03, livingRoom: 0.03, kitchen: 0.015, garage: 0.01 } },
  { roomLevel: 5, constructionTimeMinutes: 20, cost: 20_000, minPropertyLevel: 6, addRates: { bathroom: 0.02, bedroom: 0.04, livingRoom: 0.04, kitchen: 0.02 } },
  { roomLevel: 6, constructionTimeMinutes: 25, cost: 25_000, minPropertyLevel: 7, addRates: { bathroom: 0.025, bedroom: 0.05, livingRoom: 0.05, kitchen: 0.025 } },
  { roomLevel: 7, constructionTimeMinutes: 30, cost: 30_000, minPropertyLevel: 8, addRates: { bathroom: 0.03, bedroom: 0.06, livingRoom: 0.06, kitchen: 0.03 } },
  { roomLevel: 8, constructionTimeMinutes: 35, cost: 35_000, minPropertyLevel: 9, addRates: { bathroom: 0.035, bedroom: 0.07, livingRoom: 0.07, kitchen: 0.035 } },
];

/** Garage room has max level 4. Property 7 can do garage L2; property 8 garage L3; property 9 garage L4. */
export const MAX_GARAGE_ROOM_LEVEL = 4;

/**
 * Garage remodel add ($/s) and min property level per garage room level. Used by income calculation
 * so garage income does not depend on DB construction_config (avoids stale/old config after rebuild).
 * Sum of adds for levels 2–4 = $0.02/s.
 */
export const GARAGE_REMODEL_ADD_SCHEDULE: { roomLevel: number; minPropertyLevel: number; addPerSecond: number }[] = [
  { roomLevel: 2, minPropertyLevel: 7, addPerSecond: 0.005 },
  { roomLevel: 3, minPropertyLevel: 8, addPerSecond: 0.005 },
  { roomLevel: 4, minPropertyLevel: 9, addPerSecond: 0.01 },
];
