import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useAppSelector } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_GIFT = 10000;
const MAX_GIFT = 1000000;
const INCREMENT = 10000;
const TRANSACTION_FEE_PERCENT = 0.1;

interface GiftAllMembersModalProps {
  visible: boolean;
  onClose: () => void;
  onGift: (giftAmount: number) => Promise<void>;
  memberCount: number;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

export const GiftAllMembersModal: React.FC<GiftAllMembersModalProps> = ({
  visible,
  onClose,
  onGift,
  memberCount,
}) => {
  const colors = useThemeColors();
  const currentBalance = useAppSelector(getCurrentBalance);
  const [giftAmount, setGiftAmount] = useState(MIN_GIFT);
  const [isGifting, setIsGifting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setGiftAmount(MIN_GIFT);
      setError('');
      setIsGifting(false);
    }
  }, [visible]);

  const transactionFee = Math.floor(giftAmount * TRANSACTION_FEE_PERCENT);
  const totalCost = giftAmount + transactionFee;
  const amountPerMember = memberCount > 0 ? Math.floor(giftAmount / memberCount) : 0;

  const canDecrement = giftAmount > MIN_GIFT;
  const canIncrement = giftAmount < MAX_GIFT;
  const hasEnoughBalance = currentBalance >= totalCost;
  const canGift = hasEnoughBalance && memberCount > 0 && !isGifting;

  const handleDecrement = () => {
    if (canDecrement) {
      const newAmount = Math.max(MIN_GIFT, giftAmount - INCREMENT);
      setGiftAmount(newAmount);
      setError('');
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      const newAmount = Math.min(MAX_GIFT, giftAmount + INCREMENT);
      setGiftAmount(newAmount);
      setError('');
    }
  };

  const handleGift = async () => {
    if (!canGift) return;

    setError('');
    setIsGifting(true);
    try {
      await onGift(giftAmount);
      onClose();
    } catch (error: any) {
      setError(error?.message || error?.data?.error || 'Failed to gift members. Please try again.');
    } finally {
      setIsGifting(false);
    }
  };

  const handleClose = () => {
    setGiftAmount(MIN_GIFT);
    setError('');
    setIsGifting(false);
    onClose();
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['landscape']}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>GIFT ALL MEMBERS</Text>
            
            <Text style={styles.descriptionText}>
              Gift money to all crew members (excluding yourself). The gift amount will be distributed evenly among all {memberCount} member{memberCount !== 1 ? 's' : ''}.
            </Text>

            {memberCount === 0 && (
              <Text style={styles.warningText}>
                No members to gift. You must have at least one member in your crew.
              </Text>
            )}

            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Gift Amount</Text>
              <View style={styles.amountSelector}>
                <TouchableOpacity
                  style={[
                    styles.amountButton,
                    !canDecrement && styles.amountButtonDisabled
                  ]}
                  onPress={handleDecrement}
                  disabled={!canDecrement || isGifting}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.amountButtonText,
                    !canDecrement && styles.amountButtonTextDisabled
                  ]}>−</Text>
                </TouchableOpacity>
                
                <View style={styles.amountDisplay}>
                  <Text style={styles.amountValue}>{formatCurrency(giftAmount)}</Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.amountButton,
                    !canIncrement && styles.amountButtonDisabled
                  ]}
                  onPress={handleIncrement}
                  disabled={!canIncrement || isGifting}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.amountButtonText,
                    !canIncrement && styles.amountButtonTextDisabled
                  ]}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.amountHint}>
                Min: {formatCurrency(MIN_GIFT)} • Max: {formatCurrency(MAX_GIFT)} • Increments: {formatCurrency(INCREMENT)}
              </Text>
            </View>

            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gift Amount:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(giftAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Transaction Fee (10%):</Text>
                <Text style={styles.summaryValue}>{formatCurrency(transactionFee)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                <Text style={styles.summaryLabelTotal}>Total Cost:</Text>
                <Text style={[
                  styles.summaryValueTotal,
                  !hasEnoughBalance && styles.summaryValueInsufficient
                ]}>
                  {formatCurrency(totalCost)}
                </Text>
              </View>
              {memberCount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Per Member:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(amountPerMember)}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Your Balance:</Text>
                <Text style={[
                  styles.summaryValue,
                  !hasEnoughBalance && styles.summaryValueInsufficient
                ]}>
                  {formatCurrency(currentBalance)}
                </Text>
              </View>
            </View>

            {!hasEnoughBalance && (
              <Text style={styles.errorText}>
                Insufficient balance. You need {formatCurrency(totalCost)} but only have {formatCurrency(currentBalance)}.
              </Text>
            )}

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isGifting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.giftButton,
                (!canGift || isGifting) && styles.giftButtonDisabled
              ]}
              onPress={handleGift}
              disabled={!canGift || isGifting}
              activeOpacity={0.7}
            >
              {isGifting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.giftButtonText}>GIFT MEMBERS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: SIZING.spacing.lg,
    margin: SIZING.spacing.lg,
    borderWidth: 2,
    borderColor: colors.secondary,
    minWidth: 500,
    maxWidth: 700,
    maxHeight: SCREEN_HEIGHT - (SIZING.spacing.lg * 2),
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZING.spacing.sm,
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  descriptionText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'left',
    marginBottom: SIZING.spacing.lg,
    lineHeight: SIZING.font.body + 4,
  },
  warningText: {
    color: colors.error,
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
    fontWeight: '600',
  },
  amountContainer: {
    marginBottom: SIZING.spacing.lg,
  },
  amountLabel: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.sm,
  },
  amountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  amountButton: {
    width: 50,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  amountButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.buttonDisabled,
  },
  amountButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  amountButtonTextDisabled: {
    color: colors.text.placeholder,
  },
  amountDisplay: {
    minWidth: 200,
    paddingHorizontal: SIZING.spacing.md,
    alignItems: 'center',
  },
  amountValue: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  amountHint: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
    textAlign: 'center',
    marginTop: SIZING.spacing.xs,
  },
  summaryContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  summaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
    paddingTop: SIZING.spacing.sm,
    marginTop: SIZING.spacing.xs,
    marginBottom: SIZING.spacing.sm,
  },
  summaryLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
  },
  summaryValue: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  summaryLabelTotal: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  summaryValueTotal: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  summaryValueInsufficient: {
    color: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  giftButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  giftButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  giftButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.buttonDisabled,
  },
});

