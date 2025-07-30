/**
 * Converts a number to Roman numeral representation
 * @param num - The number to convert (1-4)
 * @returns Roman numeral string
 */
export const toRomanNumeral = (num: number): string => {
  const romanNumerals = ['I', 'II', 'III', 'IV'];
  return romanNumerals[num - 1] || '';
}; 