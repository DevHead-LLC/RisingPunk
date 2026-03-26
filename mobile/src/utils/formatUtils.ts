/**
 * Converts a number to Roman numeral representation
 * @param num - The number to convert (1-4)
 * @returns Roman numeral string
 */
export const toRomanNumeral = (num: number): string => {
  const romanNumerals = ['I', 'II', 'III', 'IV'];
  return romanNumerals[num - 1] || '';
};

/**
 * Formats a number with comma separators for better readability
 * @param num - The number to format
 * @returns Formatted number string with commas
 */
export const formatNumber = (num: number): string => {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  return num.toLocaleString();
};

/** Bot stat quick view: same defense % rules as Profile > Stats (API defense is 0–1). */
export function formatBotStatValue(statKey: string, value: number): string {
  if (statKey === 'defense') {
    return `${(Number(value) * 100).toFixed(1)}%`;
  }
  return String(value);
} 