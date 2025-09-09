export const formatCurrency = (amount: number): string => {
  if (amount < 0.01) {
    return `+$${amount.toFixed(3)}`;
  }
  return `+$${amount.toFixed(2)}`;
};

export const roundToFloor = (amount: number): number => {
  return Math.floor(amount);
};
