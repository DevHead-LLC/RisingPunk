/**
 * Daily Haul (7-day claim) — reward config and week boundaries.
 * Universal week: Monday 00:00 UTC through Sunday 23:59:59 UTC.
 * Resets at Monday 00:00 UTC.
 */

export const DAILY_HAUL_REWARDS = {
  day1: { min: 10_000, max: 50_000 },
  day2: { min: 50_000, max: 100_000 },
  day3: { min: 100_000, max: 200_000 },
  day4: { min: 200_000, max: 300_000 },
  day5: { min: 300_000, max: 400_000 },
  day6: { flat: 600_000 },
  day7: { flat: 750_000 },
} as const;

export type DailyHaulDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Get Monday 00:00:00.000 UTC for the week containing `date`. */
export function getWeekStartUtc(date: Date): Date {
  const d = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
  const dayOfWeek = d.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d;
}

/** Get the next Monday 00:00:00.000 UTC (resets at). */
export function getNextResetUtc(date: Date): Date {
  const weekStart = getWeekStartUtc(date);
  const next = new Date(weekStart);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

/** Day of week 1–7 (Monday = 1, Sunday = 7). */
export function getDayOfWeekUtc(date: Date): number {
  const d = date.getUTCDay();
  return d === 0 ? 7 : d;
}
