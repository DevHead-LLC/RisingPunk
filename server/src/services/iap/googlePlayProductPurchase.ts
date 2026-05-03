import { GoogleAuth } from 'google-auth-library';

export type GoogleProductPurchaseResource = {
  purchaseState?: number;
  consumptionState?: number;
  acknowledgementState?: number;
  orderId?: string;
  purchaseTimeMillis?: string;
  regionCode?: string;
  quantity?: number;
  priceAmountMicros?: string;
  priceCurrencyCode?: string;
};

/**
 * Calls Play Developer API `purchases.products.get` using a service account JSON in
 * `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (raw JSON string).
 */
export async function getGooglePlayProductPurchase(params: {
  packageName: string;
  productId: string;
  purchaseToken: string;
}): Promise<GoogleProductPurchaseResource> {
  const json = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!json || !json.trim()) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set');
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must be valid JSON');
  }
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const client = await auth.getClient();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(params.packageName)}/purchases/products/` +
    `${encodeURIComponent(params.productId)}/tokens/${encodeURIComponent(params.purchaseToken)}`;
  const res = await client.request<GoogleProductPurchaseResource>({ url });
  const data = (res as { data?: GoogleProductPurchaseResource }).data;
  if (!data || typeof data !== 'object') {
    throw new Error('Google Play API returned an empty product purchase payload');
  }
  return data;
}
