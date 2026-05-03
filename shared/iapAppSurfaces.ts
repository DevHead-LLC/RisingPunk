/**
 * Phase 0 — inventory of IAP-related UI and API surfaces (authoritative map for engineering).
 * @see taskItems/featuresAndBugs/iap-integration-plan.md
 */

export type IapSurfaceId =
  | 'black_hat_patch_turf'
  | 'black_hat_patch_screen'
  | 'restore_sync'
  | 'manage_subscriptions'
  | 'purchase_history'
  | 'legal_terms_privacy'
  | 'server_verify'
  | 'server_purchase_history'
  | 'server_apple_assn';

export type IapAppSurfaceRow = {
  id: IapSurfaceId;
  /** Plan phase that owns the surface. */
  phase: '0' | '0.5' | '1' | '2' | '3' | '4' | '5' | '6';
  description: string;
  /** Primary implementation location (mobile). */
  mobilePath?: string;
  /** Primary implementation location (server). */
  serverPath?: string;
};

export const IAP_APP_SURFACES: readonly IapAppSurfaceRow[] = [
  {
    id: 'black_hat_patch_turf',
    phase: '4',
    description: 'Turf entry under Daily Haul; daily unread highlight until first open per local day.',
    mobilePath: 'mobile/src/components/turf/BlackHatPatchLocation.tsx',
  },
  {
    id: 'black_hat_patch_screen',
    phase: '4',
    description: 'Developer Support storefront; catalog-driven SKUs; purchase + restore.',
    mobilePath: 'mobile/src/screens/BlackHatPatchScreen.tsx',
  },
  {
    id: 'restore_sync',
    phase: '4',
    description: 'Restore purchases (explicit control; no silent restore at launch).',
    mobilePath: 'mobile/src/screens/BlackHatPatchScreen.tsx',
  },
  {
    id: 'manage_subscriptions',
    phase: '4',
    description: 'N/A for v1 (no subscriptions). When subs ship: link from settings / paid flow.',
    mobilePath: '—',
  },
  {
    id: 'purchase_history',
    phase: '5',
    description: 'In-app purchase history / receipts (extends Black Hat Patch or linked screen).',
    mobilePath: 'mobile/src/screens/BlackHatPatchScreen.tsx',
    serverPath: 'GET /api/iap/developer-support/ledger',
  },
  {
    id: 'legal_terms_privacy',
    phase: '5',
    description: 'Terms + Privacy on or adjacent to purchase UI (store norms).',
    mobilePath: 'mobile/src/screens/BlackHatPatchScreen.tsx (modals)',
  },
  {
    id: 'server_verify',
    phase: '2',
    description: 'Authenticated verify before client finishTransaction / consume.',
    serverPath: 'POST /api/iap/developer-support/verify',
  },
  {
    id: 'server_purchase_history',
    phase: '2',
    description: 'Ledger rows for supporter badge + in-app history.',
    serverPath: 'GET /api/iap/developer-support/ledger',
  },
  {
    id: 'server_apple_assn',
    phase: '3',
    description: 'Apple App Store Server Notifications V2 (signed payload verify + refund reconciliation).',
    serverPath: 'POST /api/iap/webhooks/apple',
  },
] as const;
