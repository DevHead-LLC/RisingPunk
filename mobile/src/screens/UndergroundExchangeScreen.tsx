import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { SIZING } from '../styles/theme';
import {
  useFetchUndergroundExchangeCatalogQuery,
  useFetchUndergroundExchangePacksQuery,
  useFetchStorageInventoryQuery,
  usePurchaseUndergroundExchangePackMutation,
  usePurchaseUndergroundExchangeItemMutation,
  type UndergroundExchangeCatalogItemDto,
  type UndergroundExchangePackDto,
} from '../store/api/bugHuntApi';
import { useAppDispatch } from '../store/hooks';
import { balanceApi } from '../store/api/balanceApi';
import { useFetchBalanceQuery } from '../store/api/balanceApi';
import { subtractFromBalance } from '../store/slices/balanceSlice';

type Props = {
  onClose: () => void;
};

type ExchangeTabId = 'hunting' | 'travel' | 'research' | 'construction' | 'botAssembly' | 'packs';

type TabConfig = {
  id: ExchangeTabId;
  title: string;
  emptyMessage?: string;
};

type Section = TabConfig & {
  items: UndergroundExchangeCatalogItemDto[];
};

type PurchaseTarget =
  | { kind: 'item'; item: UndergroundExchangeCatalogItemDto }
  | { kind: 'pack'; pack: UndergroundExchangePackDto };

const TAB_CONFIGS: readonly TabConfig[] = [
  { id: 'hunting', title: 'Hunting' },
  { id: 'travel', title: 'Travel' },
  { id: 'research', title: 'Research' },
  { id: 'construction', title: 'Construction' },
  { id: 'botAssembly', title: 'Bot Assembly' },
  { id: 'packs', title: 'Packs', emptyMessage: 'Packs are coming soon.' },
];

function formatPrice(value: number): string {
  return `$${Math.floor(value).toLocaleString()}`;
}

function formatDuration(seconds: number): string {
  if (seconds % 604800 === 0) {
    return `${seconds / 604800} week${seconds / 604800 === 1 ? '' : 's'}`;
  }
  if (seconds % 86400 === 0) {
    return `${seconds / 86400} day${seconds / 86400 === 1 ? '' : 's'}`;
  }
  if (seconds % 3600 === 0) {
    return `${seconds / 3600} hour${seconds / 3600 === 1 ? '' : 's'}`;
  }
  if (seconds % 60 === 0) {
    return `${seconds / 60} minute${seconds / 60 === 1 ? '' : 's'}`;
  }
  return `${seconds} seconds`;
}

function resolveTabId(item: UndergroundExchangeCatalogItemDto): Exclude<ExchangeTabId, 'packs'> {
  if (item.category === 'token') {
    return 'hunting';
  }
  if (item.category === 'travel') {
    return 'travel';
  }
  if (item.speedupDomain === 'research') {
    return 'research';
  }
  if (item.speedupDomain === 'construction') {
    return 'construction';
  }
  return 'botAssembly';
}

function describeItem(item: UndergroundExchangeCatalogItemDto): string {
  if (item.category === 'token') {
    return `${Math.floor(item.tokenAmount ?? 0).toLocaleString()}`;
  }
  if (item.category === 'travel') {
    return `${Math.floor(item.travelSpeedPercent ?? 0)}%`;
  }
  if (Number.isFinite(item.durationSeconds)) {
    return formatDuration(Math.floor(item.durationSeconds ?? 0));
  }
  return item.label;
}

export const UndergroundExchangeScreen: React.FC<Props> = ({ onClose }) => {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const { data, isLoading, refetch } = useFetchUndergroundExchangeCatalogQuery();
  const { data: packsData, isLoading: packsLoading, refetch: refetchPacks } = useFetchUndergroundExchangePacksQuery();
  const { data: storageInventoryData, refetch: refetchStorageInventory } = useFetchStorageInventoryQuery();
  const { data: balanceData, refetch: refetchBalance } = useFetchBalanceQuery();
  const [purchaseItem, { isLoading: isPurchasing }] = usePurchaseUndergroundExchangeItemMutation();
  const [purchasePack, { isLoading: isPurchasingPack }] = usePurchaseUndergroundExchangePackMutation();
  const [activeTab, setActiveTab] = useState<ExchangeTabId>('hunting');
  const [selectedPurchaseTarget, setSelectedPurchaseTarget] = useState<PurchaseTarget | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const sectionsByTab = useMemo<Map<ExchangeTabId, Section>>(() => {
    const grouped = new Map<ExchangeTabId, UndergroundExchangeCatalogItemDto[]>();
    for (const tab of TAB_CONFIGS) {
      grouped.set(tab.id, []);
    }
    for (const item of data?.items ?? []) {
      const key = resolveTabId(item);
      const rows = grouped.get(key);
      if (!rows) {
        throw new Error(`Missing Underground Exchange tab '${key}'`);
      }
      rows.push(item);
    }
    return new Map<ExchangeTabId, Section>(
      TAB_CONFIGS.map((tab) => [
        tab.id,
        {
          ...tab,
          items: grouped.get(tab.id) ?? [],
        },
      ])
    );
  }, [data?.items]);

  const activeSection = sectionsByTab.get(activeTab) ?? {
    id: 'packs',
    title: 'Packs',
    emptyMessage: 'Packs are coming soon.',
    items: [],
  };
  const ownedQuantityByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of storageInventoryData?.items ?? []) {
      map.set(item.itemKey, Math.max(0, Math.floor(Number(item.quantity ?? 0))));
    }
    return map;
  }, [storageInventoryData?.items]);

  const currentBalance = Math.max(0, Math.floor(Number(balanceData?.total ?? 0)));
  const selectedUnitPrice =
    selectedPurchaseTarget == null
      ? 0
      : selectedPurchaseTarget.kind === 'item'
        ? selectedPurchaseTarget.item.shopPrice
        : selectedPurchaseTarget.pack.discountedPrice;
  const selectedItemMaxAffordableQuantity =
    selectedPurchaseTarget == null
      ? 1
      : Math.max(0, Math.floor(currentBalance / Math.max(1, Math.floor(selectedUnitPrice))));
  const effectiveSelectedQuantity =
    selectedPurchaseTarget == null
      ? 0
      : selectedItemMaxAffordableQuantity < 1
        ? 0
        : Math.max(1, Math.min(selectedQuantity, selectedItemMaxAffordableQuantity));
  const selectedItemTotalCost =
    selectedPurchaseTarget == null ? 0 : Math.floor(selectedUnitPrice) * effectiveSelectedQuantity;
  const isAnyPurchaseInFlight = isPurchasing || isPurchasingPack;

  useEffect(() => {
    if (!selectedPurchaseTarget) {
      return;
    }
    if (selectedItemMaxAffordableQuantity < 1) {
      if (selectedQuantity !== 1) {
        setSelectedQuantity(1);
      }
      return;
    }
    if (selectedQuantity > selectedItemMaxAffordableQuantity) {
      setSelectedQuantity(selectedItemMaxAffordableQuantity);
    }
  }, [selectedPurchaseTarget, selectedItemMaxAffordableQuantity, selectedQuantity]);

  const openQuantityModal = (item: UndergroundExchangeCatalogItemDto) => {
    const maxQty = Math.max(0, Math.floor(currentBalance / Math.max(1, Math.floor(item.shopPrice))));
    if (maxQty < 1) {
      return;
    }
    setSelectedPurchaseTarget({ kind: 'item', item });
    setSelectedQuantity(1);
  };
  const openQuantityModalForPack = (pack: UndergroundExchangePackDto) => {
    const maxQty = Math.max(0, Math.floor(currentBalance / Math.max(1, Math.floor(pack.discountedPrice))));
    if (maxQty < 1) {
      return;
    }
    setSelectedPurchaseTarget({ kind: 'pack', pack });
    setSelectedQuantity(1);
  };

  const handleConfirmQuantityPurchase = async () => {
    if (!selectedPurchaseTarget) {
      return;
    }
    const maxQty = selectedItemMaxAffordableQuantity;
    if (maxQty < 1) {
      Alert.alert('Purchase unavailable', 'You no longer have enough funds for this purchase.');
      return;
    }
    const quantityToBuy = effectiveSelectedQuantity;
    try {
      const result =
        selectedPurchaseTarget.kind === 'item'
          ? await purchaseItem({
              itemKey: selectedPurchaseTarget.item.itemKey,
              quantity: quantityToBuy,
            }).unwrap()
          : await purchasePack({
              packId: selectedPurchaseTarget.pack.packId,
              quantity: quantityToBuy,
            }).unwrap();
      const totalCost = Math.max(0, Math.floor(Number(result.totalCost ?? 0)));
      if (totalCost > 0) {
        dispatch(subtractFromBalance(totalCost));
      }
      dispatch(balanceApi.util.invalidateTags(['Balance']));
      Alert.alert(
        'Purchased',
        `${
          selectedPurchaseTarget.kind === 'item'
            ? selectedPurchaseTarget.item.label
            : selectedPurchaseTarget.pack.displayName
        } x${quantityToBuy} added to Items for ${formatPrice(result.totalCost)}.`
      );
      setSelectedPurchaseTarget(null);
      setSelectedQuantity(1);
      await Promise.all([refetch(), refetchPacks(), refetchBalance(), refetchStorageInventory()]);
    } catch (error: unknown) {
      const dataErr =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { error?: unknown } }).data
          : undefined;
      const message =
        dataErr && typeof dataErr.error === 'string' && dataErr.error.length > 0
          ? dataErr.error
          : 'Could not complete this purchase.';
      Alert.alert('Purchase failed', message);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.patternLayer} pointerEvents="none">
        <View style={[styles.patternBeam, styles.patternBeamA, { backgroundColor: `${colors.matrix}26` }]} />
        <View style={[styles.patternBeam, styles.patternBeamB, { backgroundColor: `${colors.secondary}20` }]} />
        <View style={[styles.patternBeam, styles.patternBeamC, { backgroundColor: `${colors.text.secondary}18` }]} />
        <View style={[styles.patternDisc, styles.patternDiscA, { borderColor: `${colors.matrix}45` }]} />
        <View style={[styles.patternDisc, styles.patternDiscB, { borderColor: `${colors.secondary}30` }]} />
      </View>
      <View style={styles.centeredFrame}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/images/ui/undergroundExchange.png')}
              style={styles.headerIcon}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.secondary }]}>Underground Exchange</Text>
          </View>
          <CloseButton onPress={onClose} />
        </View>

        <View style={styles.body}>
          <View style={[styles.tabsRail, { borderColor: `${colors.matrix}80`, backgroundColor: `${colors.background}D4` }]}>
            {TAB_CONFIGS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabButton,
                    {
                      borderColor: isActive ? colors.matrix : `${colors.text.secondary}66`,
                      backgroundColor: isActive ? `${colors.matrix}26` : `${colors.background}A6`,
                    },
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: isActive ? colors.secondary : colors.text.secondary },
                    ]}
                  >
                    {tab.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.catalogPanel, { borderColor: `${colors.matrix}80`, backgroundColor: `${colors.background}D8` }]}>
            <View style={[styles.panelHeader, { borderBottomColor: `${colors.matrix}40` }]}>
              <Text style={[styles.panelTitle, { color: colors.text.primary }]}>{activeSection.title}</Text>
              <Text style={[styles.panelSubTitle, { color: colors.text.secondary }]}>
                {activeSection.id === 'hunting' ? 'Token credit inventory' : 'Underground inventory access'}
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
              {isLoading || packsLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.matrix} />
                </View>
              ) : activeSection.id === 'packs' ? (
                <>
                  <View style={[styles.packGroupCard, { borderColor: `${colors.matrix}55`, backgroundColor: `${colors.background}BE` }]}>
                    <Text style={[styles.packGroupTitle, { color: colors.text.primary }]}>Mainstay Packs</Text>
                    {(packsData?.staplePacks ?? []).map((pack) => {
                      const maxAffordable = Math.max(
                        0,
                        Math.floor(currentBalance / Math.max(1, Math.floor(pack.discountedPrice)))
                      );
                      return (
                        <View key={pack.packId} style={[styles.row, { borderColor: `${colors.text.secondary}66`, backgroundColor: `${colors.background}C7` }]}>
                          <View style={styles.rowMeta}>
                            <Text style={[styles.itemDescription, { color: colors.text.primary }]}>{pack.displayName}</Text>
                            <Text style={[styles.itemLabel, { color: colors.text.secondary }]}>
                              {pack.items.map((row) => `${row.label} x${row.quantity}`).join(' • ')}
                            </Text>
                            <Text style={[styles.packDiscount, { color: colors.matrix }]}>
                              Save {pack.discountPercent}% ({formatPrice(pack.savings)})
                            </Text>
                          </View>
                          <View style={styles.rowRight}>
                            <Text style={[styles.packBasePrice, { color: colors.text.secondary }]}>
                              {formatPrice(pack.basePrice)}
                            </Text>
                            <Text style={[styles.itemPrice, { color: colors.matrix }]}>
                              {formatPrice(pack.discountedPrice)}
                            </Text>
                            <Text style={[styles.itemAffordability, { color: colors.text.secondary }]}>Max: {maxAffordable}</Text>
                            <TouchableOpacity
                              style={[
                                styles.buyButton,
                                {
                                  backgroundColor: colors.matrix,
                                  opacity: isAnyPurchaseInFlight || maxAffordable < 1 ? 0.45 : 1,
                                },
                              ]}
                              disabled={isAnyPurchaseInFlight || maxAffordable < 1}
                              onPress={() => openQuantityModalForPack(pack)}
                            >
                              <Text style={[styles.buyButtonText, { color: colors.background }]}>Buy</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View style={[styles.packGroupCard, { borderColor: `${colors.secondary}55`, backgroundColor: `${colors.background}BE` }]}>
                    <Text style={[styles.packGroupTitle, { color: colors.text.primary }]}>Pack of the Week Deals</Text>
                    <Text style={[styles.weekWindow, { color: colors.text.secondary }]}>
                      {packsData?.weekStartUtc && packsData?.weekEndUtc
                        ? `UTC Week: ${packsData.weekStartUtc} - ${packsData.weekEndUtc}`
                        : 'UTC week window loading...'}
                    </Text>
                    {(packsData?.weeklyPacks ?? []).length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No weekly deals active right now.</Text>
                    ) : (
                      (packsData?.weeklyPacks ?? []).map((pack) => {
                        const maxAffordable = Math.max(
                          0,
                          Math.floor(currentBalance / Math.max(1, Math.floor(pack.discountedPrice)))
                        );
                        return (
                          <View key={pack.packId} style={[styles.row, { borderColor: `${colors.text.secondary}66`, backgroundColor: `${colors.background}C7` }]}>
                            <View style={styles.rowMeta}>
                              <Text style={[styles.itemDescription, { color: colors.text.primary }]}>Pack of the Week</Text>
                              <Text style={[styles.itemLabel, { color: colors.text.secondary }]}>
                                {pack.items.map((row) => `${row.label} x${row.quantity}`).join(' • ')}
                              </Text>
                              <Text style={[styles.packDiscount, { color: colors.matrix }]}>
                                Save {pack.discountPercent}% ({formatPrice(pack.savings)})
                              </Text>
                            </View>
                            <View style={styles.rowRight}>
                              <Text style={[styles.packBasePrice, { color: colors.text.secondary }]}>
                                {formatPrice(pack.basePrice)}
                              </Text>
                              <Text style={[styles.itemPrice, { color: colors.matrix }]}>
                                {formatPrice(pack.discountedPrice)}
                              </Text>
                              <Text style={[styles.itemAffordability, { color: colors.text.secondary }]}>Max: {maxAffordable}</Text>
                              <TouchableOpacity
                                style={[
                                  styles.buyButton,
                                  {
                                    backgroundColor: colors.matrix,
                                    opacity: isAnyPurchaseInFlight || maxAffordable < 1 ? 0.45 : 1,
                                  },
                                ]}
                                disabled={isAnyPurchaseInFlight || maxAffordable < 1}
                                onPress={() => openQuantityModalForPack(pack)}
                              >
                                <Text style={[styles.buyButtonText, { color: colors.background }]}>Buy</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </>
              ) : activeSection.items.length === 0 ? (
                <View style={[styles.emptyState, { borderColor: `${colors.text.secondary}55` }]}>
                  <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                    {activeSection.emptyMessage ?? 'No exchange items available in this tab yet.'}
                  </Text>
                </View>
              ) : (
                activeSection.items.map((item) => (
                  <View key={item.itemKey} style={[styles.row, { borderColor: `${colors.text.secondary}66`, backgroundColor: `${colors.background}C7` }]}>
                    <View style={styles.rowMeta}>
                      <Text style={[styles.itemDescription, { color: colors.text.primary }]}>{describeItem(item)}</Text>
                      <Text style={[styles.itemLabel, { color: colors.text.secondary }]}>{item.label}</Text>
                      <Text style={[styles.itemOwned, { color: colors.text.secondary }]}>
                        Owned: {ownedQuantityByKey.get(item.itemKey) ?? 0}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.itemPrice, { color: colors.matrix }]}>{formatPrice(item.shopPrice)}</Text>
                      <Text style={[styles.itemAffordability, { color: colors.text.secondary }]}>
                        Max: {Math.max(0, Math.floor(currentBalance / Math.max(1, Math.floor(item.shopPrice))))}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.buyButton,
                          {
                            backgroundColor: colors.matrix,
                            opacity:
                              isAnyPurchaseInFlight ||
                              Math.floor(currentBalance / Math.max(1, Math.floor(item.shopPrice))) < 1
                                ? 0.45
                                : 1,
                          },
                        ]}
                        disabled={
                          isAnyPurchaseInFlight ||
                          Math.floor(currentBalance / Math.max(1, Math.floor(item.shopPrice))) < 1
                        }
                        onPress={() => openQuantityModal(item)}
                      >
                        <Text style={[styles.buyButtonText, { color: colors.background }]}>Buy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </View>
      {selectedPurchaseTarget ? (
        <View style={styles.quantityOverlay}>
          <Pressable
            style={styles.quantityOverlayBackdrop}
            onPress={() => {
              if (!isAnyPurchaseInFlight) {
                setSelectedPurchaseTarget(null);
                setSelectedQuantity(1);
              }
            }}
          />
          <View style={[styles.quantityModalCard, { backgroundColor: colors.background, borderColor: colors.matrix }]}>
            <Text style={[styles.quantityModalTitle, { color: colors.secondary }]}>Select Quantity</Text>
            <Text style={[styles.quantityModalItemLabel, { color: colors.text.primary }]}>
              {selectedPurchaseTarget.kind === 'item'
                ? selectedPurchaseTarget.item.label
                : selectedPurchaseTarget.pack.displayName}
            </Text>
            <Text style={[styles.quantityModalMeta, { color: colors.text.secondary }]}>
              Unit price: {formatPrice(selectedUnitPrice)} | Balance: {formatPrice(currentBalance)}
            </Text>
            <Text style={[styles.quantityModalMeta, { color: colors.text.secondary }]}>
              Max affordable: {selectedItemMaxAffordableQuantity}
            </Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityButton, { borderColor: colors.primary }]}
                disabled={isAnyPurchaseInFlight || effectiveSelectedQuantity <= 1}
                onPress={() => setSelectedQuantity((prev) => Math.max(1, prev - 1))}
              >
                <Text style={[styles.quantityButtonText, { color: colors.primary }]}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.quantityValue, { color: colors.text.primary }]}>{effectiveSelectedQuantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, { borderColor: colors.primary }]}
                disabled={isAnyPurchaseInFlight || selectedQuantity >= selectedItemMaxAffordableQuantity}
                onPress={() =>
                  setSelectedQuantity((prev) =>
                    Math.min(Math.max(1, selectedItemMaxAffordableQuantity), prev + 1)
                  )
                }
              >
                <Text style={[styles.quantityButtonText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quantityMaxButton, { borderColor: colors.primary, opacity: isAnyPurchaseInFlight ? 0.65 : 1 }]}
                disabled={isAnyPurchaseInFlight}
                onPress={() => setSelectedQuantity(Math.max(1, selectedItemMaxAffordableQuantity))}
              >
                <Text style={[styles.quantityMaxButtonText, { color: colors.primary }]}>MAX</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.quantityModalTotal, { color: colors.matrix }]}>
              Total: {formatPrice(selectedItemTotalCost)}
            </Text>
            <View style={styles.quantityModalActions}>
              <TouchableOpacity
                style={[styles.quantityCancelButton, { borderColor: colors.primary, opacity: isAnyPurchaseInFlight ? 0.65 : 1 }]}
                disabled={isAnyPurchaseInFlight}
                onPress={() => {
                  setSelectedPurchaseTarget(null);
                  setSelectedQuantity(1);
                }}
              >
                <Text style={[styles.quantityCancelButtonText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quantityConfirmButton,
                  {
                    backgroundColor: colors.matrix,
                    opacity: isAnyPurchaseInFlight || selectedItemMaxAffordableQuantity < 1 ? 0.55 : 1,
                  },
                ]}
                disabled={isAnyPurchaseInFlight || selectedItemMaxAffordableQuantity < 1}
                onPress={handleConfirmQuantityPurchase}
              >
                <Text style={[styles.quantityConfirmButtonText, { color: colors.background }]}>
                  {isAnyPurchaseInFlight ? 'Purchasing...' : 'Confirm Purchase'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternBeam: {
    position: 'absolute',
    width: '190%',
    height: 2,
  },
  patternBeamA: {
    top: '22%',
    left: '-35%',
    transform: [{ rotate: '11deg' }],
  },
  patternBeamB: {
    top: '54%',
    left: '-45%',
    transform: [{ rotate: '-14deg' }],
  },
  patternBeamC: {
    top: '82%',
    left: '-25%',
    transform: [{ rotate: '7deg' }],
  },
  patternDisc: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  patternDiscA: {
    width: 220,
    height: 220,
    top: 84,
    right: 42,
  },
  patternDiscB: {
    width: 170,
    height: 170,
    bottom: 64,
    left: 62,
  },
  centeredFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.md,
    paddingTop: SIZING.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  headerIcon: {
    width: 42,
    height: 42,
  },
  title: { fontSize: SIZING.font.h2, fontWeight: '700' },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    paddingTop: SIZING.spacing.xs,
    paddingBottom: SIZING.spacing.md,
  },
  tabsRail: {
    width: 170,
    borderWidth: 1,
    borderRadius: 12,
    padding: SIZING.spacing.xs,
    gap: SIZING.spacing.xs,
  },
  tabButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.sm,
  },
  tabButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  catalogPanel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  panelHeader: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderBottomWidth: 1,
  },
  panelTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  panelSubTitle: {
    fontSize: SIZING.font.small,
    marginTop: 2,
  },
  content: {
    padding: SIZING.spacing.md,
    gap: SIZING.spacing.sm,
  },
  loadingRow: {
    marginTop: SIZING.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: SIZING.font.small,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: SIZING.spacing.lg,
    paddingHorizontal: SIZING.spacing.md,
    marginTop: SIZING.spacing.sm,
  },
  row: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  rowMeta: {
    flex: 1,
    gap: 3,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: SIZING.spacing.xs,
  },
  itemDescription: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  itemLabel: {
    fontSize: SIZING.font.small,
  },
  itemOwned: {
    fontSize: 11,
    fontWeight: '600',
  },
  packDiscount: {
    fontSize: 11,
    fontWeight: '700',
  },
  packBasePrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  packGroupCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: SIZING.spacing.sm,
    gap: SIZING.spacing.xs,
  },
  packGroupTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  weekWindow: {
    fontSize: 11,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  itemAffordability: {
    fontSize: 11,
    fontWeight: '600',
  },
  buyButton: {
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
  },
  buyButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  quantityOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  quantityOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  quantityModalCard: {
    width: '86%',
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 12,
    padding: SIZING.spacing.md,
    alignItems: 'center',
    gap: SIZING.spacing.xs,
  },
  quantityModalTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  quantityModalItemLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
    textAlign: 'center',
  },
  quantityModalMeta: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.xs,
    marginTop: SIZING.spacing.xs,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
    lineHeight: 18,
  },
  quantityValue: {
    minWidth: 34,
    textAlign: 'center',
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  quantityMaxButton: {
    height: 30,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: SIZING.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityMaxButtonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  quantityModalTotal: {
    marginTop: SIZING.spacing.xs,
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  quantityModalActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZING.spacing.sm,
    marginTop: SIZING.spacing.xs,
  },
  quantityCancelButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
  },
  quantityCancelButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  quantityConfirmButton: {
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
  },
  quantityConfirmButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
});
