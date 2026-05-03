/** Normalize ISO 4217 codes from store payloads (Apple/Google may send mixed case). */
export function normalizeCurrencyCode(currency: string | undefined | null): string {
  if (currency == null || typeof currency !== 'string') {
    throw new Error('IAP verify: currency is missing');
  }
  const upper = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(upper)) {
    throw new Error(`IAP verify: invalid ISO 4217 currency code: ${currency}`);
  }
  return upper;
}
