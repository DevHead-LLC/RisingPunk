/**
 * Storage speedup UI: compact duration labels on item buttons, max quantity vs remaining timer, list order.
 * Single source of truth (was duplicated across SpeedupModal, FeatureModal, InvestmentPropertyScreen).
 */

/** Longest duration first, then label A–Z (matches SpeedupModal / construction storage lists). */
export function compareStorageSpeedupItemsByDurationDesc(
  a: { durationSeconds?: number; label: string },
  b: { durationSeconds?: number; label: string }
): number {
  const durationA = Math.max(0, Math.floor(a.durationSeconds ?? 0));
  const durationB = Math.max(0, Math.floor(b.durationSeconds ?? 0));
  if (durationA !== durationB) {
    return durationB - durationA;
  }
  return a.label.localeCompare(b.label);
}

export function formatStorageSpeedupButtonDuration(durationSeconds: number): string {
  const seconds = Math.max(0, Math.floor(durationSeconds));
  if (seconds % 3600 === 0 && seconds >= 3600) {
    const hours = seconds / 3600;
    return `${hours}h`;
  }
  if (seconds % 60 === 0 && seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

export function getMaxStorageSpeedupUsableQuantity(
  durationSeconds: number,
  ownedQuantity: number,
  remainingTimeMs: number
): number {
  const duration = Math.max(1, Math.floor(durationSeconds));
  const remainingSeconds = Math.max(0, Math.ceil(remainingTimeMs / 1000));
  const maxByTime = Math.max(1, Math.ceil(remainingSeconds / duration));
  return Math.max(1, Math.min(Math.floor(ownedQuantity), maxByTime));
}
