/**
 * Single source of truth for balance accrual (passive income from ratePerSecond).
 * Used by dailyHaul, research, and crew routes. 10-second bucketing + fractional remainder.
 */

export interface AccrualInput {
  lastUpdatedMs: number;
  toTimeMs: number;
  ratePerSecond: number;
  fractionalRemainder: number;
}

export interface AccrualResult {
  wholeDollarsToAdd: number;
  newFractionalRemainder: number;
  roundedSecondsElapsed: number;
  /** True if any time elapsed and accrual was applied. */
  accrued: boolean;
}

/**
 * Compute accrued balance from lastUpdated to toTime using 10s bucketing and fractional remainder.
 * When secondsElapsed <= 0, returns zero add and unchanged remainder (accrued: false).
 */
export function accrueBalanceFromTo(input: AccrualInput): AccrualResult {
  const { lastUpdatedMs, toTimeMs, ratePerSecond, fractionalRemainder } = input;
  const secondsElapsed = (toTimeMs - lastUpdatedMs) / 1000;
  if (secondsElapsed <= 0) {
    return {
      wholeDollarsToAdd: 0,
      newFractionalRemainder: fractionalRemainder ?? 0,
      roundedSecondsElapsed: 0,
      accrued: false,
    };
  }
  const roundedSecondsElapsed = Math.floor(secondsElapsed / 10) * 10;
  const fullPrecisionIncome = roundedSecondsElapsed * ratePerSecond;
  const totalWithRemainder = (fractionalRemainder ?? 0) + fullPrecisionIncome;
  const wholeDollarsToAdd = Math.floor(totalWithRemainder);
  return {
    wholeDollarsToAdd,
    newFractionalRemainder: totalWithRemainder - wholeDollarsToAdd,
    roundedSecondsElapsed,
    accrued: true,
  };
}

/**
 * Convenience: accrue from lastUpdated to toTime and return new total, fractionalRemainder, and
 * lastUpdated advanced by rounded seconds only (preserves unrounded remainder for next accrual).
 * When no time elapsed, returns unchanged state.
 */
export function accrueBalanceToTime(
  currentTotal: number,
  ratePerSecond: number,
  lastUpdated: Date,
  fractionalRemainder: number,
  toTime: Date
): { total: number; fractionalRemainder: number; lastUpdated: Date } {
  const lastMs = new Date(lastUpdated).getTime();
  const toMs = toTime.getTime();
  const result = accrueBalanceFromTo({
    lastUpdatedMs: lastMs,
    toTimeMs: toMs,
    ratePerSecond,
    fractionalRemainder: fractionalRemainder ?? 0,
  });
  return {
    total: currentTotal + result.wholeDollarsToAdd,
    fractionalRemainder: result.newFractionalRemainder,
    lastUpdated: result.accrued
      ? new Date(lastMs + result.roundedSecondsElapsed * 1000)
      : lastUpdated,
  };
}
