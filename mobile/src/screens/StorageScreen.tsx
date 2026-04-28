import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { SIZING } from '../styles/theme';
import { bugHuntApi, useFetchBugHuntTokenStateQuery, useFetchStorageInventoryQuery, useUseStorageItemMutation } from '../store/api/bugHuntApi';
import { useAppDispatch } from '../store/hooks';
import { addToBalance } from '../store/slices/balanceSlice';
import { balanceApi } from '../store/api/balanceApi';

type Props = {
  onClose: () => void;
};

type ConsumableStorageItem = {
  itemKey: string;
  label: string;
  quantity: number;
  category: 'cash' | 'token';
  tokenAmount?: number;
};

export const StorageScreen: React.FC<Props> = ({ onClose }) => {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const {
    data: storageData,
    isLoading: storageLoading,
    refetch: refetchStorage,
  } = useFetchStorageInventoryQuery();
  const { data: tokenStateData } = useFetchBugHuntTokenStateQuery();
  const [useStorageItem, { isLoading: isUsingStorageItem }] = useUseStorageItemMutation();
  const [selectedStorageItem, setSelectedStorageItem] = useState<ConsumableStorageItem | null>(null);
  const [selectedStorageQuantity, setSelectedStorageQuantity] = useState(1);

  useEffect(() => {
    if (!selectedStorageItem) {
      return;
    }
    const latest = (storageData?.items ?? []).find((item) => item.itemKey === selectedStorageItem.itemKey);
    if (!latest || (latest.category !== 'cash' && latest.category !== 'token') || Number(latest.quantity) <= 0) {
      setSelectedStorageItem(null);
      setSelectedStorageQuantity(1);
      return;
    }
    setSelectedStorageItem({
      itemKey: latest.itemKey,
      label: latest.label,
      quantity: Math.max(0, Math.floor(latest.quantity)),
      category: latest.category,
      tokenAmount: latest.tokenAmount,
    });
    setSelectedStorageQuantity((prev) => Math.max(1, Math.min(Math.max(1, Math.floor(latest.quantity)), prev)));
  }, [storageData?.items]);

  const tokenCurrent = Math.max(0, Math.floor(Number(tokenStateData?.currentTokens ?? 0)));
  const tokenMax = Math.max(1, Math.floor(Number(tokenStateData?.maxTokens ?? 1)));
  const tokenAmountPerItem =
    selectedStorageItem?.category === 'token'
      ? Math.max(0, Math.floor(Number(selectedStorageItem.tokenAmount ?? 0)))
      : 0;
  const maxUsefulTokenQuantity =
    selectedStorageItem?.category === 'token' && tokenAmountPerItem > 0
      ? Math.max(0, Math.ceil((tokenMax - tokenCurrent) / tokenAmountPerItem))
      : Number.POSITIVE_INFINITY;
  const modalMaxSelectableQuantity = selectedStorageItem
    ? Math.max(
        0,
        Math.min(
          Math.max(0, Math.floor(selectedStorageItem.quantity)),
          Number.isFinite(maxUsefulTokenQuantity) ? Math.max(0, Math.floor(maxUsefulTokenQuantity)) : Number.MAX_SAFE_INTEGER
        )
      )
    : 0;
  const effectiveSelectedStorageQuantity = selectedStorageItem
    ? modalMaxSelectableQuantity < 1
      ? 0
      : Math.max(1, Math.min(selectedStorageQuantity, modalMaxSelectableQuantity))
    : 0;
  const projectedTokensAfterUse =
    selectedStorageItem?.category === 'token'
      ? Math.min(tokenMax, tokenCurrent + tokenAmountPerItem * Math.max(0, effectiveSelectedStorageQuantity))
      : tokenCurrent;

  useEffect(() => {
    if (!selectedStorageItem) {
      return;
    }
    if (modalMaxSelectableQuantity < 1) {
      if (selectedStorageQuantity !== 1) {
        setSelectedStorageQuantity(1);
      }
      return;
    }
    if (selectedStorageQuantity > modalMaxSelectableQuantity) {
      setSelectedStorageQuantity(modalMaxSelectableQuantity);
    }
  }, [selectedStorageItem, modalMaxSelectableQuantity, selectedStorageQuantity]);

  const handleUseStorageItem = async () => {
    if (!selectedStorageItem) {
      return;
    }
    const maxQty = Math.max(0, modalMaxSelectableQuantity);
    if (maxQty < 1) {
      Alert.alert('Item cannot be used', 'This token item would not add any tokens right now.');
      return;
    }
    const quantityToUse = effectiveSelectedStorageQuantity;
    try {
      const result = await useStorageItem({
        itemKey: selectedStorageItem.itemKey,
        quantity: quantityToUse,
      }).unwrap();
      if (result.effect === 'cash' && Number.isFinite(result.cashAdded)) {
        const roundedCash = Math.max(0, Math.floor(result.cashAdded ?? 0));
        if (roundedCash > 0) {
          dispatch(addToBalance(roundedCash));
          dispatch(balanceApi.util.invalidateTags(['Balance']));
        }
      }
      if (result.effect === 'token') {
        dispatch(bugHuntApi.util.invalidateTags(['BugHuntTokens']));
      }
      const effectDetail =
        result.effect === 'cash' && Number.isFinite(result.cashAdded)
          ? `Added $${Math.floor(result.cashAdded ?? 0).toLocaleString()}.`
          : result.effect === 'token' && Number.isFinite(result.tokenAdded)
            ? `Added ${Math.floor(result.tokenAdded ?? 0).toLocaleString()} tokens.`
          : result.effect === 'travel'
            ? 'Applied travel time reduction.'
            : 'Applied speedup to your earliest active matching timer.';
      Alert.alert('Item used', effectDetail);
      setSelectedStorageItem(null);
      setSelectedStorageQuantity(1);
      await refetchStorage();
    } catch (error: unknown) {
      const dataErr =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { error?: unknown } }).data
          : undefined;
      const message =
        dataErr && typeof dataErr.error === 'string' && dataErr.error.length > 0
          ? dataErr.error
          : 'Could not use storage item.';
      Alert.alert('Use failed', message);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.centeredFrame}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.secondary }]}>Storage</Text>
          <CloseButton onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.panel, { borderColor: colors.matrix, backgroundColor: `${colors.background}DD` }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Items</Text>
            {storageLoading ? (
              <ActivityIndicator color={colors.matrix} />
            ) : (storageData?.items ?? []).length === 0 ? (
              <Text style={[styles.meta, { color: colors.text.secondary }]}>
                No bug-hunt items in storage yet. Defeat Ant bugs to earn drops.
              </Text>
            ) : (
              <View style={styles.storageList}>
                {(storageData?.items ?? []).map((item) => (
                  <View
                    key={item.itemKey}
                    style={[styles.storageRow, { borderColor: colors.text.secondary }]}
                  >
                    <View style={styles.storageMeta}>
                      <Text style={[styles.storageName, { color: colors.text.primary }]}>{item.label}</Text>
                      <Text style={[styles.meta, { color: colors.text.secondary }]}>
                        Qty: {item.quantity}
                      </Text>
                    </View>
                    {item.category === 'cash' || item.category === 'token' ? (
                      <TouchableOpacity
                        style={[
                          styles.useButton,
                          { backgroundColor: colors.matrix, opacity: isUsingStorageItem ? 0.65 : 1 },
                        ]}
                        disabled={isUsingStorageItem}
                        onPress={() => {
                          setSelectedStorageItem({
                            itemKey: item.itemKey,
                            label: item.label,
                            quantity: Math.max(0, Math.floor(item.quantity)),
                            category: item.category,
                            tokenAmount: item.tokenAmount,
                          });
                          setSelectedStorageQuantity(1);
                        }}
                      >
                        <Text style={[styles.useButtonText, { color: colors.background }]}>Use</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
      {selectedStorageItem ? (
        <View style={styles.quantityOverlay}>
          <Pressable
            style={styles.quantityOverlayBackdrop}
            onPress={() => {
              if (!isUsingStorageItem) {
                setSelectedStorageItem(null);
                setSelectedStorageQuantity(1);
              }
            }}
          />
          <View style={[styles.quantityModalCard, { backgroundColor: colors.background, borderColor: colors.matrix }]}>
            <Text style={[styles.quantityModalTitle, { color: colors.secondary }]}>Use Item</Text>
            <Text style={[styles.quantityModalItemLabel, { color: colors.text.primary }]}>
              {selectedStorageItem.label}
            </Text>
            <Text style={[styles.meta, { color: colors.text.secondary }]}>
              Owned: {selectedStorageItem.quantity}
            </Text>
            {selectedStorageItem.category === 'token' ? (
              <>
                <Text style={[styles.meta, { color: colors.text.secondary }]}>
                  Tokens: {tokenCurrent.toLocaleString()}/{tokenMax.toLocaleString()} -> {projectedTokensAfterUse.toLocaleString()}/{tokenMax.toLocaleString()}
                </Text>
                <Text style={[styles.meta, { color: colors.text.secondary }]}>
                  Per item: +{tokenAmountPerItem.toLocaleString()} tokens
                </Text>
              </>
            ) : null}
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityButton, { borderColor: colors.primary }]}
                disabled={isUsingStorageItem || effectiveSelectedStorageQuantity <= 1}
                onPress={() => setSelectedStorageQuantity((prev) => Math.max(1, prev - 1))}
              >
                <Text style={[styles.quantityButtonText, { color: colors.primary }]}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.quantityValue, { color: colors.text.primary }]}>
                {effectiveSelectedStorageQuantity}
              </Text>
              <TouchableOpacity
                style={[styles.quantityButton, { borderColor: colors.primary }]}
                disabled={
                  isUsingStorageItem ||
                  modalMaxSelectableQuantity < 1 ||
                  selectedStorageQuantity >= modalMaxSelectableQuantity
                }
                onPress={() =>
                  setSelectedStorageQuantity((prev) => Math.min(Math.max(1, modalMaxSelectableQuantity), prev + 1))
                }
              >
                <Text style={[styles.quantityButtonText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quantityMaxButton,
                  { borderColor: colors.primary, opacity: isUsingStorageItem ? 0.65 : 1 },
                ]}
                disabled={isUsingStorageItem}
                onPress={() => setSelectedStorageQuantity(Math.max(1, modalMaxSelectableQuantity))}
              >
                <Text style={[styles.quantityMaxButtonText, { color: colors.primary }]}>MAX</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quantityModalActions}>
              <TouchableOpacity
                style={[
                  styles.quantityCancelButton,
                  { borderColor: colors.primary, opacity: isUsingStorageItem ? 0.65 : 1 },
                ]}
                disabled={isUsingStorageItem}
                onPress={() => {
                  setSelectedStorageItem(null);
                  setSelectedStorageQuantity(1);
                }}
              >
                <Text style={[styles.quantityCancelButtonText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quantityUseButton,
                  {
                    backgroundColor: colors.matrix,
                    opacity: isUsingStorageItem || modalMaxSelectableQuantity < 1 ? 0.65 : 1,
                  },
                ]}
                disabled={isUsingStorageItem || modalMaxSelectableQuantity < 1}
                onPress={handleUseStorageItem}
              >
                <Text style={[styles.quantityUseButtonText, { color: colors.background }]}>
                  {isUsingStorageItem ? 'Using...' : `Use ${effectiveSelectedStorageQuantity}`}
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
  title: { fontSize: SIZING.font.h2, fontWeight: '700' },
  content: { padding: SIZING.spacing.md },
  panel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: SIZING.spacing.md,
    gap: SIZING.spacing.sm,
  },
  sectionTitle: { fontSize: SIZING.font.body, fontWeight: '700' },
  meta: { fontSize: SIZING.font.small },
  storageList: { gap: SIZING.spacing.xs },
  storageRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZING.spacing.sm,
  },
  storageMeta: { flex: 1, gap: 2 },
  storageName: { fontSize: SIZING.font.small, fontWeight: '700' },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.xs,
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
    lineHeight: 18,
  },
  quantityMaxButton: {
    height: 26,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: SIZING.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityMaxButtonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quantityValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  useButton: {
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
  },
  useButtonText: { fontSize: SIZING.font.small, fontWeight: '700' },
  quantityOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  quantityOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  quantityModalCard: {
    width: '86%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 10,
    padding: SIZING.spacing.md,
    alignItems: 'center',
    gap: SIZING.spacing.sm,
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
  quantityUseButton: {
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
  },
  quantityUseButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
});
