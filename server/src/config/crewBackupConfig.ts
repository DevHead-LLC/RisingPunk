/**
 * Crew backup time-reduction formula constants.
 * See taskItems/ios/turf/crew-backup-request.md (formula summary) and CrewBackupService.
 */

/** Jobs with total time T ≤ this (seconds) can have 100% of time helped away. */
export const SHORT_BUILD_THRESHOLD_SECONDS = 3600;

/** Per-helper reduction = max(1, floor(T / HELP_DIVISOR)) (1% of T). */
export const HELP_DIVISOR = 100;

/** For jobs longer than threshold, crew can remove at most this many seconds total. */
export const MAX_HELP_LONG_BUILD_SECONDS = 3600;

export function getRMax(totalSeconds: number): number {
  if (totalSeconds <= SHORT_BUILD_THRESHOLD_SECONDS) return totalSeconds;
  return MAX_HELP_LONG_BUILD_SECONDS;
}

export function getPerHelperReduction(totalSeconds: number): number {
  const d = Math.floor(totalSeconds / HELP_DIVISOR);
  return Math.max(1, d);
}
