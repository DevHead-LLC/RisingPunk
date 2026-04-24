import React, { useState, useEffect, useMemo } from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, Pressable } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useFetchStorageInventoryQuery, useUseStorageItemMutation } from '../../store/api/bugHuntApi';
import type { BugHuntConstructionSpeedupTarget } from '../../store/api/bugHuntApi';

interface SpeedupModalProps {
  visible: boolean;
  secondsRemaining: number; // in milliseconds
  currentBalance: number;
  itemType: 'research' | 'build' | 'construction';
  onSpeedup: () => Promise<void>;
  onClose: () => void;
  storageSpeedupDomain?: 'research' | 'construction' | 'bot_assembly';
  storageSpeedupTarget?: BugHuntConstructionSpeedupTarget;
  researchSpeedupTarget?: { categoryId: string; featureId: string };
  onStorageSpeedupApplied?: () => Promise<void> | void;
}

export const SpeedupModal: React.FC<SpeedupModalProps> = ({
  visible,
  secondsRemaining,
  currentBalance,
  itemType,
  onSpeedup,
  onClose,
  storageSpeedupDomain,
  storageSpeedupTarget,
  researchSpeedupTarget,
  onStorageSpeedupApplied,
}) => {
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = useState(false);
  const [localSecondsRemaining, setLocalSecondsRemaining] = useState(secondsRemaining);
  const [selectedStorageItemKey, setSelectedStorageItemKey] = useState<string | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [useStorageItem, { isLoading: isUsingStorageItem }] = useUseStorageItemMutation();
  const { data: storageData, refetch: refetchStorage } = useFetchStorageInventoryQuery(undefined, {
    skip: !visible || !storageSpeedupDomain,
  });

  // Update local seconds remaining when prop changes
  useEffect(() => {
    setLocalSecondsRemaining(secondsRemaining);
  }, [secondsRemaining]);

  useEffect(() => {
    if (!visible) {
      setSelectedStorageItemKey(null);
      setSelectedQuantity(1);
    }
  }, [visible]);

  // Update timer every second while modal is visible
  useEffect(() => {
    if (!visible || localSecondsRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setLocalSecondsRemaining((prev) => {
        const newValue = Math.max(0, prev - 1000);
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, localSecondsRemaining]);

  // Close modal when timer expires to prevent stale state
  useEffect(() => {
    if (visible && localSecondsRemaining <= 0) {
      onClose();
    }
  }, [visible, localSecondsRemaining, onClose]);

  // Calculate cost: seconds * 5
  const cost = useMemo(() => {
    const seconds = Math.ceil(localSecondsRemaining / 1000);
    return seconds * 5;
  }, [localSecondsRemaining]);

  const hasSufficientFunds = currentBalance >= cost;
  const canSpeedup = hasSufficientFunds && localSecondsRemaining > 0 && !isLoading;
  const storageSpeedupItems = useMemo(() => {
    if (!storageSpeedupDomain) {
      return [];
    }
    return (storageData?.items ?? [])
      .filter(
        (item) =>
          item.category === 'speedup' &&
          item.speedupDomain === storageSpeedupDomain &&
          Number.isFinite(item.durationSeconds) &&
          Number(item.quantity) > 0
      )
      .sort((a, b) => {
        const durationA = Math.max(0, Math.floor(a.durationSeconds ?? 0));
        const durationB = Math.max(0, Math.floor(b.durationSeconds ?? 0));
        if (durationA !== durationB) {
          return durationB - durationA;
        }
        return a.label.localeCompare(b.label);
      });
  }, [storageData?.items, storageSpeedupDomain]);

  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const years = Math.floor(totalSeconds / (365 * 24 * 60 * 60));
    const days = Math.floor((totalSeconds % (365 * 24 * 60 * 60)) / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];
    if (years > 0) {parts.push(`${years}y`);}
    if (days > 0) {parts.push(`${days}d`);}
    if (hours > 0 || parts.length > 0) {parts.push(`${hours}h`);}
    if (minutes > 0 || parts.length > 0) {parts.push(`${minutes}m`);}
    parts.push(`${seconds}s`);
    return parts.join(' ');
  };

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'research':
        return 'research';
      case 'build':
        return 'build';
      case 'construction':
        return 'construction';
      default:
        return 'item';
    }
  };

  const formatDurationForButton = (durationSeconds: number): string => {
    const seconds = Math.max(0, Math.floor(durationSeconds));
    if (seconds % 3600 === 0 && seconds >= 3600) {
      const hours = seconds / 3600;
      return `${hours}h`;
    }
    if (seconds % 60 === 0 && seconds >= 60) {
      const minutes = seconds / 60;
      return `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const handleSpeedup = async () => {
    if (!canSpeedup) {
      return;
    }

    setIsLoading(true);
    try {
      await onSpeedup();
      onClose();
    } catch (error) {
      console.error('Error speeding up:', error);
      // Keep modal open on error so user can try again
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxUsableQuantity = (durationSeconds: number, ownedQuantity: number): number => {
    const duration = Math.max(1, Math.floor(durationSeconds));
    const remainingSeconds = Math.max(0, Math.ceil(localSecondsRemaining / 1000));
    const maxByTime = Math.max(1, Math.ceil(remainingSeconds / duration));
    return Math.max(1, Math.min(Math.floor(ownedQuantity), maxByTime));
  };

  const selectedStorageItem =
    selectedStorageItemKey == null
      ? null
      : storageSpeedupItems.find((item) => item.itemKey === selectedStorageItemKey) ?? null;

  const selectedMaxQuantity =
    selectedStorageItem && Number.isFinite(selectedStorageItem.durationSeconds)
      ? getMaxUsableQuantity(selectedStorageItem.durationSeconds ?? 0, selectedStorageItem.quantity)
      : 1;

  useEffect(() => {
    if (selectedQuantity > selectedMaxQuantity) {
      setSelectedQuantity(selectedMaxQuantity);
    }
  }, [selectedQuantity, selectedMaxQuantity]);

  const handleUseStorageSpeedup = async (itemKey: string, quantityToUse: number, durationSeconds: number) => {
    try {
      const result = await useStorageItem({
        itemKey,
        speedupTarget: storageSpeedupDomain === 'construction' ? storageSpeedupTarget : undefined,
        researchCategoryId: storageSpeedupDomain === 'research' ? researchSpeedupTarget?.categoryId : undefined,
        researchFeatureId: storageSpeedupDomain === 'research' ? researchSpeedupTarget?.featureId : undefined,
        quantity: quantityToUse,
      }).unwrap();
      await refetchStorage();
      await onStorageSpeedupApplied?.();
      const appliedQuantity =
        typeof result.quantityUsed === 'number' && Number.isFinite(result.quantityUsed)
          ? Math.max(1, Math.floor(result.quantityUsed))
          : Math.max(1, quantityToUse);
      const durationMs = Math.max(1, Math.floor(durationSeconds)) * 1000 * appliedQuantity;
      setLocalSecondsRemaining((prev) => Math.max(0, prev - durationMs));
    } catch (error: unknown) {
      const dataErr =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { error?: unknown } }).data
          : undefined;
      const message =
        dataErr && typeof dataErr.error === 'string' && dataErr.error.length > 0
          ? dataErr.error
          : 'Could not use speedup item.';
      Alert.alert('Use failed', message);
    }
  };

  // If timer has completed, don't show modal
  if (localSecondsRemaining <= 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.matrix }]}>
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentBody}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <Text style={[styles.popupTitle, { color: colors.secondary }]}>
              Speed Up {getItemTypeLabel().charAt(0).toUpperCase() + getItemTypeLabel().slice(1)}
            </Text>
            
            <View style={styles.infoContainer}>
              <Text style={[styles.timeRemainingLabel, { color: colors.text.secondary }]}>
                Time Remaining:
              </Text>
              <Text style={[styles.timeRemaining, { color: colors.matrix }]}>
                {formatTime(localSecondsRemaining)}
              </Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={[styles.costLabel, { color: colors.text.secondary }]}>
                Finish this {getItemTypeLabel()} now for:
              </Text>
              <Text style={[styles.costAmount, { color: colors.matrix }]}>
                {formatCost(cost)}
              </Text>
            </View>

            <View style={styles.balanceContainer}>
              <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>
                Your Balance:
              </Text>
              <Text style={[styles.balanceAmount, { color: hasSufficientFunds ? colors.success : colors.error }]}>
                {formatCost(currentBalance)}
              </Text>
            </View>

            {!hasSufficientFunds && (
              <Text style={[styles.insufficientFunds, { color: colors.error }]}>
                Insufficient funds
              </Text>
            )}

            {storageSpeedupItems.length > 0 ? (
              <View style={styles.storageSpeedupSection}>
                <Text style={[styles.storageSpeedupTitle, { color: colors.secondary }]}>Use Speedup Item</Text>
                <ScrollView
                  style={styles.storageSpeedupScroll}
                  contentContainerStyle={styles.storageSpeedupList}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled
                >
                  {storageSpeedupItems.map((item) => {
                    const durationLabel = Number.isFinite(item.durationSeconds)
                      ? formatDurationForButton(item.durationSeconds ?? 0)
                      : item.label;
                    const maxUsable = Number.isFinite(item.durationSeconds)
                      ? getMaxUsableQuantity(item.durationSeconds ?? 0, item.quantity)
                      : item.quantity;
                    const isSelected = selectedStorageItemKey === item.itemKey;
                    return (
                      <TouchableOpacity
                        key={item.itemKey}
                        style={[
                          styles.storageSpeedupButton,
                          {
                            borderColor: isSelected ? colors.matrix : colors.primary,
                            backgroundColor: isSelected ? colors.primary + '33' : colors.accent + '33',
                            opacity: isUsingStorageItem ? 0.65 : 1,
                          },
                        ]}
                        disabled={isUsingStorageItem}
                        onPress={() => {
                          setSelectedStorageItemKey(item.itemKey);
                          setSelectedQuantity(1);
                        }}
                      >
                        <Text style={[styles.storageSpeedupButtonText, { color: colors.text.primary }]}>
                          {durationLabel} x{item.quantity} (max {maxUsable})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {selectedStorageItem && Number.isFinite(selectedStorageItem.durationSeconds) ? (
                  <View style={styles.quantityPickerContainer}>
                    <Text style={[styles.quantityPickerLabel, { color: colors.text.secondary }]}>
                      Quantity
                    </Text>
                    <View style={styles.quantityPickerRow}>
                      <TouchableOpacity
                        style={[styles.quantityAdjustButton, { borderColor: colors.primary }]}
                        onPress={() => setSelectedQuantity((prev) => Math.max(1, prev - 1))}
                        disabled={isUsingStorageItem || selectedQuantity <= 1}
                      >
                        <Text style={[styles.quantityAdjustButtonText, { color: colors.primary }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.quantityValueText, { color: colors.text.primary }]}>
                        {selectedQuantity}
                      </Text>
                      <TouchableOpacity
                        style={[styles.quantityAdjustButton, { borderColor: colors.primary }]}
                        onPress={() => setSelectedQuantity((prev) => Math.min(selectedMaxQuantity, prev + 1))}
                        disabled={isUsingStorageItem || selectedQuantity >= selectedMaxQuantity}
                      >
                        <Text style={[styles.quantityAdjustButtonText, { color: colors.primary }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.applyQuantityButton,
                        {
                          borderColor: colors.matrix,
                          backgroundColor: colors.primary + '22',
                          opacity: isUsingStorageItem ? 0.65 : 1,
                        },
                      ]}
                      disabled={isUsingStorageItem}
                      onPress={() =>
                        handleUseStorageSpeedup(
                          selectedStorageItem.itemKey,
                          selectedQuantity,
                          Math.floor(selectedStorageItem.durationSeconds ?? 0)
                        )
                      }
                    >
                      <Text style={[styles.applyQuantityButtonText, { color: colors.text.primary }]}>
                        {isUsingStorageItem ? 'Applying...' : `Use ${selectedQuantity}`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity 
              style={[
                styles.speedupButton, 
                { 
                  backgroundColor: canSpeedup ? colors.matrix : colors.buttonDisabled,
                  opacity: canSpeedup ? 1 : 0.6
                }
              ]} 
              onPress={handleSpeedup}
              disabled={!canSpeedup}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[
                  styles.speedupButtonText, 
                  { 
                    color: canSpeedup ? colors.background : colors.text.secondary 
                  }
                ]}>
                  Finish {getItemTypeLabel().charAt(0).toUpperCase() + getItemTypeLabel().slice(1)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.closeButton, { borderColor: colors.matrix }]} 
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.closeButtonText, { color: colors.secondary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popup: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'stretch',
    width: '94%',
    maxWidth: 920,
    maxHeight: '78%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  contentScroll: {
    width: '100%',
  },
  contentBody: {
    width: '100%',
    alignItems: 'stretch',
    paddingHorizontal: SIZING.spacing.sm,
    paddingTop: SIZING.spacing.sm,
    paddingBottom: SIZING.spacing.md,
  },
  infoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  timeRemainingLabel: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.xs,
  },
  timeRemaining: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  costLabel: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.xs,
    textAlign: 'center',
  },
  costAmount: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
  },
  balanceContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.xs,
    paddingTop: SIZING.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceLabel: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.xs,
  },
  balanceAmount: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  insufficientFunds: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  speedupButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 6,
    marginBottom: SIZING.spacing.md,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  speedupButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: 'center',
  },
  closeButtonText: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  storageSpeedupSection: {
    width: '100%',
    marginBottom: SIZING.spacing.sm,
  },
  storageSpeedupTitle: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  storageSpeedupList: {
    gap: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.xs,
  },
  storageSpeedupScroll: {
    maxHeight: 96,
    width: '100%',
  },
  storageSpeedupButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  storageSpeedupButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  quantityPickerContainer: {
    width: '100%',
    marginTop: SIZING.spacing.xs,
    alignItems: 'center',
    gap: SIZING.spacing.xs,
  },
  quantityPickerLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
  },
  quantityPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  quantityAdjustButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityAdjustButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  quantityValueText: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  applyQuantityButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
    alignSelf: 'center',
  },
  applyQuantityButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
});
