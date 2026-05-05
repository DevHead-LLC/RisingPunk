import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getPendingTransactionsIOS,
  deepLinkToSubscriptions,
  ErrorCode,
  finishTransaction,
  getTransactionJwsIOS,
  useIAP,
  type Product,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { IAP_CATALOG_V1, listIapV1StoreProductIds } from '../../../shared/iapCatalog';
import { CloseButton } from '../components/common/CloseButton';
import { PrivacyPolicyModal } from '../components/profile/PrivacyPolicyModal';
import { TermsOfServiceModal } from '../components/profile/TermsOfServiceModal';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppSelector } from '../store/hooks';
import {
  useFetchDeveloperSupportLedgerQuery,
  useVerifyDeveloperSupportMutation,
} from '../store/api/iapApi';
import { SIZING } from '../styles/theme';
import { BlackHatPatchBackground } from '../components/blackHatPatch/BlackHatPatchBackground';

const APP_STORE_WEB_URL_FALLBACK =
  'https://apps.apple.com/app/risingpunk/id6749834469';
const GOOGLE_PLAY_WEB_URL_FALLBACK =
  'https://play.google.com/store/apps/details?id=com.devheadllc.risingpunk';
import { setBlackHatPatchAcknowledgedToToday } from '../utils/blackHatPatchAckStorage';

/** Heuristic: StoreKit signed transaction JWS is three dot-separated segments. */
function looksLikeCompactJws(token: string): boolean {
  const parts = token.split('.');
  return parts.length >= 3 && parts.every((p) => p.length > 0);
}

/** RTK Query `.unwrap()` rejects with `{ status, data }`, not `Error` — avoid `[object Object]` in alerts. */
function formatUserFacingError(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === 'string') {
    return e;
  }
  if (typeof e === 'object' && e !== null) {
    const rec = e as Record<string, unknown>;
    if (typeof rec.message === 'string' && rec.message.length > 0) {
      return rec.message;
    }
    const data = rec.data;
    if (typeof data === 'string') {
      return data;
    }
    const status = typeof rec.status === 'number' ? rec.status : null;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const inner = (data as { error: unknown }).error;
      if (typeof inner === 'string') {
        if (inner.length > 0) {
          return inner;
        }
      } else if (inner !== null && typeof inner === 'object') {
        try {
          return JSON.stringify(inner);
        } catch {
          /* fall through to status or generic */
        }
      } else if (typeof inner === 'number' || typeof inner === 'boolean') {
        return String(inner);
      }
    }
    if (status !== null) {
      return `Request failed (${status})`;
    }
  }
  if (typeof e === 'number' || typeof e === 'boolean' || typeof e === 'bigint') {
    return String(e);
  }
  if (e === undefined) {
    return String(e);
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function purchaseDedupeKey(purchase: Purchase): string {
  const tid = (purchase as { transactionId?: string }).transactionId;
  const base = tid && String(tid).length > 0 ? String(tid) : (purchase.id ?? '');
  return `${Platform.OS}:${purchase.productId ?? ''}:${base}`;
}

function isAndroidAlreadyConsumedFinishError(err: unknown): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }
  if (err instanceof Error) {
    const errWithCode = err as Error & { code?: unknown };
    const code = typeof errWithCode.code === 'string' ? errWithCode.code.toUpperCase() : '';
    const msg = err.message.toUpperCase();
    return (
      code.includes('ITEM_NOT_OWNED') ||
      msg.includes('ITEM_NOT_OWNED') ||
      msg.includes('ALREADY CONSUMED')
    );
  }
  const rec = err as { code?: unknown; message?: unknown };
  const code = typeof rec?.code === 'string' ? rec.code.toUpperCase() : '';
  const message = typeof rec?.message === 'string' ? rec.message.toUpperCase() : '';
  return code.includes('ITEM_NOT_OWNED') || message.includes('ITEM_NOT_OWNED') || message.includes('ALREADY CONSUMED');
}

function isUserCancelledPurchaseError(err: PurchaseError): boolean {
  const code = String(err.code ?? '').toLowerCase();
  return err.code === ErrorCode.UserCancelled || code === 'user-cancelled' || code === 'user_cancelled';
}

type Props = {
  onClose: () => void;
};

export const BlackHatPatchScreen: React.FC<Props> = ({ onClose }) => {
  const colors = useThemeColors();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const userId = useAppSelector((s) => s.auth.user?._id);
  const token = useAppSelector((s) => s.auth.token);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [verifyDeveloperSupport] = useVerifyDeveloperSupportMutation();
  const verifyMutRef = useRef(verifyDeveloperSupport);
  verifyMutRef.current = verifyDeveloperSupport;
  const verifyInFlightKeysRef = useRef<Set<string>>(new Set());
  const { data: ledger, refetch: refetchLedger } = useFetchDeveloperSupportLedgerQuery(undefined, {
    skip: !token,
  });

  const refetchLedgerSafe = useCallback(() => {
    if (!token) {
      return Promise.resolve();
    }
    return refetchLedger();
  }, [token, refetchLedger]);

  useEffect(() => {
    if (userId) {
      setBlackHatPatchAcknowledgedToToday(userId).catch(() => {});
    }
  }, [userId]);

  const handleVerifiedPurchase = useCallback(
    async (purchase: Purchase) => {
      const uid = userIdRef.current;
      const tok = tokenRef.current;
      if (!uid) {
        throw new Error('Not signed in');
      }
      if (!tok) {
        throw new Error('Not authenticated — sign in again to complete verification');
      }
      const dedupeKey = purchaseDedupeKey(purchase);
      if (verifyInFlightKeysRef.current.has(dedupeKey)) {
        throw new Error('This purchase is already being verified');
      }
      verifyInFlightKeysRef.current.add(dedupeKey);
      try {
      if (Platform.OS === 'ios') {
        const sku = purchase.productId;
        if (!sku) {
          throw new Error('Missing product id on purchase');
        }
        const pt = (purchase as { purchaseToken?: string }).purchaseToken;
        const jwsFromToken =
          typeof pt === 'string' && pt.trim().length > 0 && looksLikeCompactJws(pt.trim())
            ? pt.trim()
            : null;
        let jws: string;
        if (jwsFromToken) {
          jws = jwsFromToken;
        } else {
          const fromSku = await getTransactionJwsIOS(sku);
          if (!fromSku || typeof fromSku !== 'string') {
            throw new Error('Could not read StoreKit transaction JWS');
          }
          jws = fromSku;
        }
        await verifyMutRef
          .current({ platform: 'apple', signedTransactionInfo: jws })
          .unwrap();
      } else {
        const productId = purchase.productId ?? purchase.id;
        const purchaseToken = (purchase as { purchaseToken?: string }).purchaseToken;
        if (!productId || !purchaseToken) {
          throw new Error('Missing Google Play purchase fields');
        }
        await verifyMutRef
          .current({ platform: 'google', productId, purchaseToken })
          .unwrap();
      }
      try {
        await finishTransaction({ purchase, isConsumable: true });
      } catch (finishErr: unknown) {
        // Server-side Google consume can race client consume; treat already-consumed Android finish as non-fatal.
        if (!isAndroidAlreadyConsumedFinishError(finishErr)) {
          throw finishErr;
        }
      }
      refetchLedgerSafe().catch(() => {});
      } finally {
        verifyInFlightKeysRef.current.delete(dedupeKey);
      }
    },
    [refetchLedgerSafe],
  );
  const handleVerifiedPurchaseRef = useRef(handleVerifiedPurchase);
  handleVerifiedPurchaseRef.current = handleVerifiedPurchase;
  type PendingRecoveryResult = {
    recoveredCount: number;
    hadPending: boolean;
    firstError: unknown | null;
  };
  const recoverPendingPurchasesRef = useRef<() => Promise<PendingRecoveryResult>>(async () => ({
    recoveredCount: 0,
    hadPending: false,
    firstError: null,
  }));

  const { connected, products, fetchProducts, requestPurchase, restorePurchases } = useIAP({
    onPurchaseSuccess: (purchase) => {
      (async () => {
        try {
          await handleVerifiedPurchaseRef.current(purchase);
          Alert.alert('Thank you', 'Your purchase was verified. Thank you for supporting RisingPunk.');
        } catch (e: unknown) {
          Alert.alert('Purchase', formatUserFacingError(e));
        }
      })().catch(() => {});
    },
    onPurchaseError: (err: PurchaseError) => {
      if (isUserCancelledPurchaseError(err)) {
        if (Platform.OS === 'ios') {
          Alert.alert('Purchase', 'Purchase canceled.');
        }
        return;
      }
      const base = err.message ?? String(err.code ?? 'unknown error');
      const hint =
        err.code === ErrorCode.DuplicatePurchase
          ? '\n\nA prior transaction is likely still pending verification/finalization. Use Restore purchases to recover and clear pending transactions, then try again.'
          : '';
      Alert.alert('Purchase', `${base}${hint}`);
      if (err.code === ErrorCode.DuplicatePurchase) {
        recoverPendingPurchasesRef
          .current()
          .then((result) => {
            if (result.recoveredCount > 0) {
              Alert.alert('Purchase', `Recovered ${result.recoveredCount} pending purchase(s). You can try buying again.`);
              refetchLedgerSafe().catch(() => {});
            }
          })
          .catch(() => {});
      }
    },
    onError: (err) => {
      Alert.alert('Store', err.message);
    },
  });

  const recoverPendingPurchases = useCallback(async (): Promise<PendingRecoveryResult> => {
    const pendingRaw =
      Platform.OS === 'ios'
        ? ((await getPendingTransactionsIOS()) as unknown)
        : ((await restorePurchases()) as unknown);
    const pending = Array.isArray(pendingRaw) ? (pendingRaw as Purchase[]) : [];
    if (pending.length === 0) {
      return { recoveredCount: 0, hadPending: false, firstError: null };
    }
    let recoveredCount = 0;
    let firstError: unknown = null;
    for (const purchase of pending) {
      try {
        await handleVerifiedPurchaseRef.current(purchase);
        recoveredCount += 1;
      } catch (err) {
        if (firstError == null) {
          firstError = err;
        }
      }
    }
    return { recoveredCount, hadPending: true, firstError };
  }, [restorePurchases]);
  recoverPendingPurchasesRef.current = recoverPendingPurchases;

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: listIapV1StoreProductIds(), type: 'in-app' }).catch(() => {});
  }, [connected, fetchProducts]);

  const productByStoreId = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) {
      m.set(p.id, p);
    }
    return m;
  }, [products]);

  const onBuyTier = useCallback(
    async (storeProductId: string) => {
      if (!connected) {
        Alert.alert('Store', 'Billing is not connected yet. Try again in a moment.');
        return;
      }
      try {
        await requestPurchase({
          type: 'in-app',
          request: {
            apple: { sku: storeProductId },
            google: {
              skus: [storeProductId],
              obfuscatedAccountId: userId ?? undefined,
              obfuscatedProfileId: userId ?? undefined,
            },
          },
        });
      } catch (e: unknown) {
        Alert.alert('Purchase', formatUserFacingError(e));
      }
    },
    [connected, requestPurchase, userId],
  );

  const onRestore = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS restore should force a full App Store sync before pending-transaction recovery.
        await restorePurchases();
      }
      const result = await recoverPendingPurchases();
      if (!result.hadPending) {
        Alert.alert(
          'Restore',
          Platform.OS === 'ios'
            ? 'Sync complete. No pending iOS purchases were found to recover.'
            : 'Sync complete. No pending purchases were found for this signed-in store account.',
        );
        refetchLedgerSafe().catch(() => {});
        return;
      }
      if (result.recoveredCount > 0) {
        Alert.alert(
          'Restore',
          `Recovered ${result.recoveredCount} pending purchase${result.recoveredCount === 1 ? '' : 's'}.`,
        );
      } else if (result.firstError) {
        throw result.firstError;
      } else {
        Alert.alert(
          'Restore',
          'Sync complete. Pending purchases were checked, but none were eligible for recovery on this account.',
        );
      }
      refetchLedgerSafe().catch(() => {});
    } catch (e: unknown) {
      Alert.alert('Restore', formatUserFacingError(e));
    }
  }, [recoverPendingPurchases, refetchLedgerSafe, restorePurchases]);

  const onManageStore = useCallback(async () => {
    try {
      await deepLinkToSubscriptions({});
    } catch {
      const url = Platform.OS === 'ios' ? APP_STORE_WEB_URL_FALLBACK : GOOGLE_PLAY_WEB_URL_FALLBACK;
      await Linking.openURL(url);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.stack}>
        <BlackHatPatchBackground colors={colors} scrollY={scrollY} />
        <View style={styles.foreground}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>Black Hat Patch</Text>
            <CloseButton onPress={onClose} />
          </View>

          <Animated.ScrollView
            style={styles.scrollFlex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.sectionShell,
                {
                  borderColor: `${colors.primary}55`,
                  backgroundColor: `${colors.background}E8`,
                },
              ]}
            >
              <Text style={[styles.sectionEyebrow, { color: colors.matrix ?? colors.secondary }]}>Support the studio</Text>
              <View style={styles.introRow}>
                <Image
                  source={require('../assets/images/ui/developerSupport.png')}
                  style={styles.supportBadge}
                  resizeMode="contain"
                />
                <View style={styles.introTextCol}>
                  <Text style={[styles.introTitle, { color: colors.primary }]}>Developer Support</Text>
                  <Text style={[styles.subtitle, { color: colors.text?.secondary ?? colors.neutral }]}>
                    Optional tips. Purchases stay on this RisingPunk account (see Terms).
                  </Text>
                  {ledger?.supporter ? (
                    <Text style={[styles.badgeLine, { color: colors.matrix ?? colors.success }]}>
                      Supporter recognition: active
                    </Text>
                  ) : (
                    <Text style={[styles.badgeLine, { color: colors.neutral }]}>Supporter recognition: not active</Text>
                  )}
                </View>
              </View>
            </View>

            {!connected ? (
              <View
                style={[
                  styles.storeStatus,
                  { borderColor: `${colors.primary}44`, backgroundColor: `${colors.background}DD` },
                ]}
              >
                <ActivityIndicator color={colors.matrix ?? colors.primary} />
                <Text style={[styles.muted, { color: colors.neutral }]}>Connecting to the store…</Text>
              </View>
            ) : null}

            <View style={styles.sectionSpacer} />

            <Text style={[styles.sectionHeading, { color: colors.primary }]}>Support tiers</Text>
            <Text style={[styles.sectionSub, { color: colors.text?.secondary ?? colors.neutral }]}>
              One price per tap — pick the tier that fits you.
            </Text>

            {IAP_CATALOG_V1.map((row) => {
              const storeId = Platform.OS === 'ios' ? row.appleProductId : row.googleProductId;
              const prod = productByStoreId.get(storeId);
              const priceLabel = prod?.displayPrice ?? `~$${(row.referenceBaseUsdCents / 100).toFixed(2)} USD (list)`;
              return (
                <TouchableOpacity
                  key={row.key}
                  style={[
                    styles.tierCard,
                    {
                      borderColor: `${colors.primary}66`,
                      backgroundColor: `${colors.background}F0`,
                    },
                  ]}
                  onPress={() => {
                    onBuyTier(storeId).catch(() => {});
                  }}
                  activeOpacity={0.85}
                  disabled={!connected || !userId || !token}
                >
                  <Text style={[styles.tierTitle, { color: colors.primary }]}>{row.displayName}</Text>
                  <Text style={[styles.tierPrice, { color: colors.matrix ?? colors.text?.secondary ?? colors.primary }]}>
                    {priceLabel}
                  </Text>
                  <Text style={[styles.tierHint, { color: colors.neutral }]}>Consumable — repeat purchases allowed.</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.sectionSpacerLarge} />

            <View
              style={[
                styles.sectionShell,
                { borderColor: `${colors.primary}44`, backgroundColor: `${colors.background}E4` },
              ]}
            >
              <Text style={[styles.sectionHeading, { color: colors.primary, marginTop: 0 }]}>Purchase history</Text>
              <Text style={[styles.sectionSub, { color: colors.text?.secondary ?? colors.neutral, marginBottom: 14 }]}>
                Verified on this device and account.
              </Text>
              {ledger?.rows?.length ? (
                ledger.rows.map((r) => (
                  <View
                    key={r.id}
                    style={[
                      styles.ledgerRow,
                      { borderColor: `${colors.primary}55`, backgroundColor: `${colors.background}CC` },
                    ]}
                  >
                    <Text style={{ color: colors.text?.secondary ?? colors.primary }}>{r.storeProductId}</Text>
                    <Text style={{ color: colors.neutral }}>
                      {r.remainingMinorUnits}/{r.amountMinorUnits} {r.currency} remaining
                    </Text>
                    <Text style={[styles.small, { color: colors.neutral }]}>{r.createdAt}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.muted, { color: colors.neutral }]}>No verified purchases on this account yet.</Text>
              )}
            </View>

            <View style={styles.sectionSpacer} />

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              onPress={() => {
                onRestore().catch(() => {});
              }}
              disabled={!token}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Restore purchases</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              onPress={() => {
                onManageStore().catch(() => {});
              }}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                App Store / Play Store subscriptions & orders
              </Text>
            </TouchableOpacity>

            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => setShowTerms(true)}>
                <Text style={[styles.link, { color: colors.matrix ?? colors.primary }]}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.neutral }}> · </Text>
              <TouchableOpacity onPress={() => setShowPrivacy(true)}>
                <Text style={[styles.link, { color: colors.matrix ?? colors.primary }]}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </Animated.ScrollView>
        </View>
      </View>

      <PrivacyPolicyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <TermsOfServiceModal visible={showTerms} onClose={() => setShowTerms(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { flex: 1, position: 'relative' },
  foreground: { flex: 1, zIndex: 1 },
  scrollFlex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZING.spacing.lg,
    paddingTop: SIZING.spacing.sm,
    paddingBottom: SIZING.spacing.xs,
  },
  title: { fontSize: 22, fontWeight: '800' },
  scroll: { padding: SIZING.spacing.lg, paddingBottom: 44, flexGrow: 1 },
  sectionShell: {
    borderWidth: 1,
    borderRadius: 14,
    padding: SIZING.spacing.md,
    marginBottom: 4,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  supportBadge: { width: 76, height: 76, flexShrink: 0 },
  introTextCol: { flex: 1, minWidth: 0 },
  introTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  badgeLine: { fontSize: 13, fontWeight: '700' },
  storeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionSpacer: { height: 22 },
  sectionSpacerLarge: { height: 28 },
  sectionHeading: { fontSize: 18, fontWeight: '800', marginTop: 4, marginBottom: 6 },
  sectionSub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  tierCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  tierTitle: { fontSize: 17, fontWeight: '800' },
  tierPrice: { fontSize: 16, marginTop: 6, fontWeight: '700' },
  tierHint: { fontSize: 12, marginTop: 8, lineHeight: 16 },
  ledgerRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  small: { fontSize: 11 },
  muted: { fontSize: 13 },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: { fontWeight: '700' },
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 26, justifyContent: 'center', alignItems: 'center' },
  link: { fontWeight: '600', textDecorationLine: 'underline' },
});
