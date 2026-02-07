export const formatCurrency = (amount: number): string => {
  if (amount < 0.01) {
    return `+$${amount.toFixed(3)}`;
  }
  return `+$${amount.toFixed(2)}`;
};

/** For investment property room display: show tenth-of-cent (thousandths). */
export const formatCurrencyThousandths = (amount: number): string => {
  return `+$${Number(amount).toFixed(3)}`;
};

/** Round to hundredths (for UI display only; keep full precision in state). Trunc (not floor) so negative values (e.g. net loss) are not inflated. */
export const floorToHundredths = (amount: number): number => {
  // Round to 10000ths first to avoid IEEE 754 errors (e.g. 0.29 * 100 → 28.999…), then truncate to cents.
  return Math.trunc(Math.round(amount * 10000) / 100) / 100;
};

export const roundToFloor = (amount: number): number => {
  return Math.floor(amount);
};
