import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { SIZING } from '../styles/theme';
import { useFetchStorageInventoryQuery, useUseStorageItemMutation } from '../store/api/bugHuntApi';
import { useAppDispatch } from '../store/hooks';
import { addToBalance } from '../store/slices/balanceSlice';
import { balanceApi } from '../store/api/balanceApi';

type Props = {
  onClose: () => void;
};

type CashStorageItem = {
  itemKey: string;
  label: string;
  quantity: number;
  category: string;
};

export const StorageScreen: React.FC<Props> = ({ onClose }) => {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const {
    data: storageData,
    isLoading: storageLoading,
    refetch: refetchStorage,
  } = useFetchStorageInventoryQuery();
  const [useStorageItem, { isLoading: isUsingStorageItem }] = useUseStorageItemMutation();
  const [selectedCashItem, setSelectedCashItem] = useState<CashStorageItem | null>(null);
  const [selectedCashQuantity, setSelectedCashQuantity] = useState(1);

  useEffect(() => {
    if (!selectedCashItem) {
      return;
    }
    const latest = (storageData?.items ?? []).find((item) => item.itemKey === selectedCashItem.itemKey);
    if (!latest || latest.category !== 'cash' || Number(latest.quantity) <= 0) {
      setSelectedCashItem(null);
      setSelectedCashQuantity(1);
      return;
    }
    setSelectedCashItem({
      itemKey: latest.itemKey,
      label: latest.label,
      quantity: Math.max(0, Math.floor(latest.quantity)),
      category: latest.category,
    });
    setSelectedCashQuantity((prev) => Math.max(1, Math.min(Math.max(1, Math.floor(latest.quantity)), prev)));
  }, [storageData?.items]);

  const handleUseCashItem = async () => {
    if (!selectedCashItem) {
      return;
    }
    const maxQty = Math.max(1, Math.floor(selectedCashItem.quantity));
    const quantityToUse = Math.max(1, Math.min(maxQty, selectedCashQuantity));
    try {
      const result = await useStorageItem({
        itemKey: selectedCashItem.itemKey,
        quantity: quantityToUse,
      }).unwrap();
      if (result.effect === 'cash' && Number.isFinite(result.cashAdded)) {
        const roundedCash = Math.max(0, Math.floor(result.cashAdded ?? 0));
        if (roundedCash > 0) {
          dispatch(addToBalance(roundedCash));
          dispatch(balanceApi.util.invalidateTags(['Balance']));
        }
      }
      const effectDetail =
        result.effect === 'cash' && Number.isFinite(result.cashAdded)
          ? `Added $${Math.floor(result.cashAdded ?? 0).toLocaleString()}.`
          : result.effect === 'travel'
            ? 'Applied travel time reduction.'
            : 'Applied speedup to your earliest active matching timer.';
      Alert.alert('Item used', effectDetail);
      setSelectedCashItem(null);
      setSelectedCashQuantity(1);
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
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Bug Hunt Items</Text>
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
                    {item.category === 'cash' ? (
                      <TouchableOpacity
                        style={[
                          styles.useButton,
                          { backgroundColor: colors.matrix, opacity: isUsingStorageItem ? 0.65 : 1 },
                        ]}
                        disabled={isUsingStorageItem}
                        onPress={() => {
                          setSelectedCashItem({
                            itemKey: item.itemKey,
                            label: item.label,
                            quantity: Math.max(0, Math.floor(item.quantity)),
                            category: item.category,
                          });
                          setSelectedCashQuantity(1);
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
      {selectedCashItem ? (
        <View style={styles.quantityOverlay}>
          <Pressable
            style={styles.quantityOverlayBackdrop}
            onPress={() => {
              if (!isUsingStorageItem) {
                setSelectedCashItem(null);
                setSelectedCashQuantity(1);
              }
            }}
          />
          <View style={[styles.quantityModalCard, { backgroundColor: colors.background, borderColor: colors.matrix }]}>
            <Text style={[styles.quantityModalTitle, { color: colors.secondary }]}>Use Wallet Item</Text>
            <Text style={[styles.quantityModalItemLabel, { color: colors.text.primary }]}>
              {selectedCashItem.label}
            </Text>
            <Text style={[styles.meta, { color: colors.text.secondary }]}>
              Owned: {selectedCashItem.quantity}
            </Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.quantityButton, { borderColor: colors.primary }]}
                disabled={isUsingStorageItem || selectedCashQuantity <= 1}
                onPress={() => setSelectedCashQuantity((prev) => Math.max(1, prev - 1))}
              >
                <Text style={[styles.quantityButtonText, { color: colors.primary }]}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.quantityValue, { color: colors.text.primary }]}>
                {selectedCashQuantity}
              </Text>
              <TouchableOpacity
                style={[styles.quantityButton, { borderColor: colors.primary }]}
                disabled={isUsingStorageItem || selectedCashQuantity >= Math.max(1, selectedCashItem.quantity)}
                onPress={() =>
                  setSelectedCashQuantity((prev) => Math.min(Math.max(1, selectedCashItem.quantity), prev + 1))
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
                onPress={() => setSelectedCashQuantity(Math.max(1, selectedCashItem.quantity))}
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
                  setSelectedCashItem(null);
                  setSelectedCashQuantity(1);
                }}
              >
                <Text style={[styles.quantityCancelButtonText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.quantityUseButton,
                  { backgroundColor: colors.matrix, opacity: isUsingStorageItem ? 0.65 : 1 },
                ]}
                disabled={isUsingStorageItem}
                onPress={handleUseCashItem}
              >
                <Text style={[styles.quantityUseButtonText, { color: colors.background }]}>
                  {isUsingStorageItem ? 'Using...' : `Use ${selectedCashQuantity}`}
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
