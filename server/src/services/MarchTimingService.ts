/**
 * Authoritative march distance and pace (seconds per DU from army composition); see taskItems/featuresAndBugs/map-hack-travel-async-battles.md and taskItems/historical-actions.md § Map hack.
 */

import type { AttackMarchArmySnapshot } from '../types/attackMarch';

export const MARCH_REF_BATTALIONS = 3;
export const MARCH_REF_TOTAL_BOTS = 150_000;
export const MARCH_REF_SECONDS_PER_DU = 3;
export const MARCH_SECONDS_PER_DU_MIN = 1.0;
export const MARCH_SECONDS_PER_DU_MAX = 12.0;

function clampSecondsPerDu(raw: number): number {
  return Math.min(MARCH_SECONDS_PER_DU_MAX, Math.max(MARCH_SECONDS_PER_DU_MIN, raw));
}

/**
 * Euclidean distance in DU between tile centers (integer grid coords).
 * @see taskItems/featuresAndBugs/map-hack-travel-async-battles.md — march distance & travel time
 */
export function distanceDuTileUnits(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number
): number {
  const dx = Math.abs(Number(targetX) - Number(originX));
  const dy = Math.abs(Number(targetY) - Number(originY));
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    throw new Error('distanceDuTileUnits: coordinates must be finite numbers');
  }
  return Math.hypot(dx, dy);
}

/**
 * Seconds per DU from committed army (geometric mean mass ratio × ref 3 s/DU, clamped 1–12).
 */
export function secondsPerDuFromArmySnapshot(snapshot: AttackMarchArmySnapshot): number {
  if (!snapshot || !Array.isArray(snapshot.battalions)) {
    throw new Error('secondsPerDuFromArmySnapshot: battalions array required');
  }
  const withBots = snapshot.battalions.filter(
    (b) => b != null && typeof b.quantity === 'number' && Number.isFinite(b.quantity) && b.quantity > 0
  );
  if (withBots.length === 0) {
    throw new Error('secondsPerDuFromArmySnapshot: at least one battalion with quantity > 0 is required');
  }
  const battalionCount = withBots.length;
  const totalBots = withBots.reduce((sum, b) => sum + b.quantity, 0);
  if (!Number.isFinite(totalBots) || totalBots <= 0) {
    throw new Error('secondsPerDuFromArmySnapshot: invalid totalBots');
  }
  const rN = battalionCount / MARCH_REF_BATTALIONS;
  const rT = totalBots / MARCH_REF_TOTAL_BOTS;
  const massRatio = Math.sqrt(rN * rT);
  const rawSecondsPerDu = MARCH_REF_SECONDS_PER_DU * massRatio;
  return clampSecondsPerDu(rawSecondsPerDu);
}

export function totalTravelSeconds(distanceDu: number, secondsPerDu: number): number {
  if (!Number.isFinite(distanceDu) || distanceDu < 0) {
    throw new Error('totalTravelSeconds: distanceDu must be a non-negative finite number');
  }
  if (!Number.isFinite(secondsPerDu) || secondsPerDu <= 0) {
    throw new Error('totalTravelSeconds: secondsPerDu must be a positive finite number');
  }
  return distanceDu * secondsPerDu;
}
