import React, { useState, useEffect, useMemo } from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SpeedupModalProps {
  visible: boolean;
  secondsRemaining: number; // in milliseconds
  currentBalance: number;
  itemType: 'research' | 'build' | 'construction';
  onSpeedup: () => Promise<void>;
  onClose: () => void;
}

export const SpeedupModal: React.FC<SpeedupModalProps> = ({
  visible,
  secondsRemaining,
  currentBalance,
  itemType,
  onSpeedup,
  onClose,
}) => {
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = useState(false);
  const [localSecondsRemaining, setLocalSecondsRemaining] = useState(secondsRemaining);

  // Update local seconds remaining when prop changes
  useEffect(() => {
    setLocalSecondsRemaining(secondsRemaining);
  }, [secondsRemaining]);

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

  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
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
      <TouchableOpacity 
        style={styles.modalOverlay} 
        onPress={onClose} 
        activeOpacity={1}
      >
        <TouchableOpacity 
          style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.matrix }]} 
          onPress={() => {}} 
          activeOpacity={1}
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
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  popup: {
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 400,
    maxWidth: 500,
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
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  infoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  timeRemainingLabel: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.xs,
  },
  timeRemaining: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  costLabel: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.xs,
    textAlign: 'center',
  },
  costAmount: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  balanceContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
    paddingTop: SIZING.spacing.md,
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
    minWidth: 200,
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
  },
  closeButtonText: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
});
