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

/** Floor to hundredths (for UI display only; keep full precision in state). */
export const floorToHundredths = (amount: number): number => {
  return Math.floor(amount * 100) / 100;
};

export const roundToFloor = (amount: number): number => {
  return Math.floor(amount);
};
