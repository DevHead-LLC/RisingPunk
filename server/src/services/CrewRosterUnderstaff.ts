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
