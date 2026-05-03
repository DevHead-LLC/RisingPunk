/**
 * v1 IAP catalog — single source of truth for store product id strings and metadata.
 * @see taskItems/featuresAndBugs/iap-integration-plan.md (v1 Developer Support table)
 */

import { IAP_APP_SURFACES } from './iapAppSurfaces';

export type IapProductKind = 'consumable';

/** Per-plan audit keys (spreadsheet “Suggested per-SKU record key”). */
export type IapCatalogKey = 'dev_support_tier_1' | 'dev_support_tier_2' | 'dev_support_tier_3';

/** Ledger / badge entitlement for all v1 Developer Support consumables. */
export const IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER = 'developer_support_supporter' as const;

export type IapEntitlementKey = typeof IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER;

export type IapCatalogEntry = {
  key: IapCatalogKey;
  appleProductId: string;
  googleProductId: string;
  type: IapProductKind;
  entitlementKey: IapEntitlementKey;
  displayName: string;
  /** Reference list price in US cents; live UI must use store-reported price. */
  referenceBaseUsdCents: number;
};

export const IAP_CATALOG_V1: readonly IapCatalogEntry[] = [
  {
    key: 'dev_support_tier_1',
    appleProductId: 'com.devheadllc.risingpunk.iap.dev_support_1',
    googleProductId: 'com.devheadllc.risingpunk.iap.dev_support_1',
    type: 'consumable',
    entitlementKey: IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER,
    displayName: 'Developer Support 1',
    referenceBaseUsdCents: 99,
  },
  {
    key: 'dev_support_tier_2',
    appleProductId: 'com.devheadllc.risingpunk.iap.dev_support',
    googleProductId: 'com.devheadllc.risingpunk.iap.dev_support',
    type: 'consumable',
    entitlementKey: IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER,
    displayName: 'Developer Support 2',
    referenceBaseUsdCents: 499,
  },
  {
    key: 'dev_support_tier_3',
    appleProductId: 'com.devheadllc.risingpunk.iap.dev_support_3',
    googleProductId: 'com.devheadllc.risingpunk.iap.dev_support_3',
    type: 'consumable',
    entitlementKey: IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER,
    displayName: 'Developer Support 3',
    referenceBaseUsdCents: 999,
  },
] as const;

const catalogByStoreProductId = new Map<string, IapCatalogEntry>();
for (const row of IAP_CATALOG_V1) {
  if (row.appleProductId !== row.googleProductId) {
    throw new Error(
      `IAP catalog invariant: apple and google product ids must match for key ${row.key}`,
    );
  }
  if (catalogByStoreProductId.has(row.appleProductId)) {
    throw new Error(`IAP catalog invariant: duplicate store product id ${row.appleProductId}`);
  }
  catalogByStoreProductId.set(row.appleProductId, row);
}

const requiredIapSurfaceIds = ['black_hat_patch_screen', 'server_verify', 'server_purchase_history'] as const;
const iapSurfaceIds = new Set(IAP_APP_SURFACES.map((row) => row.id));
for (const surfaceId of requiredIapSurfaceIds) {
  if (!iapSurfaceIds.has(surfaceId)) {
    throw new Error(`IAP surfaces invariant: missing required surface ${surfaceId}`);
  }
}

/** Every distinct store product id (Apple and Google use the same string for v1). */
export function listIapV1StoreProductIds(): string[] {
  return IAP_CATALOG_V1.map((row) => row.appleProductId);
}

export function findIapCatalogEntryByStoreProductId(
  storeProductId: string,
): IapCatalogEntry | undefined {
  return catalogByStoreProductId.get(storeProductId);
}
