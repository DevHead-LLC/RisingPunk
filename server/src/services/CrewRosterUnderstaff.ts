import type { ICrew } from '../models/Crew';

/** President + executives + members must be at least this many for a crew to stay active. */
export const MIN_CREW_ROSTER = 3;

export function getCrewRosterCount(crew: {
  presidentId?: unknown;
  executives?: unknown[] | null;
  members?: unknown[] | null;
}): number {
  return 1 + (crew.executives?.length ?? 0) + (crew.members?.length ?? 0);
}

/**
 * Updates `understaffNotifiedAt` / `understaffLastReminderAt` when roster size crosses the minimum threshold.
 * @param previousRosterCount — roster count before the mutation (use `0` for brand-new crew).
 *
 * Bugbot: Call this when total roster (1 + executives + members) changes. Role-only moves
 * (promote/demote, resign, choose-successor) keep the same count and do not need this.
 * If a mutation omits this helper, `CrewUnderstaffSweepService` still sets `understaffNotifiedAt`
 * on the next sweep while understaffed (default 24h interval), so the 7-day disband window
 * applies—only the exact start time may defer to that tick.
 */
export function applyUnderstaffClockAfterRosterChange(
  crew: ICrew,
  previousRosterCount: number | null
): void {
  const n = getCrewRosterCount(crew);
  if (n >= MIN_CREW_ROSTER) {
    crew.understaffNotifiedAt = null;
    crew.understaffLastReminderAt = null;
    return;
  }
  const prev = previousRosterCount ?? n;
  if (prev >= MIN_CREW_ROSTER && n < MIN_CREW_ROSTER) {
    crew.understaffNotifiedAt = new Date();
    crew.understaffLastReminderAt = null;
    return;
  }
  if (crew.understaffNotifiedAt == null) {
    // Bugbot: use "now", not createdAt — legacy understaffed crews need a fresh grace window when the clock is first set.
    crew.understaffNotifiedAt = new Date();
    crew.understaffLastReminderAt = null;
  }
}
