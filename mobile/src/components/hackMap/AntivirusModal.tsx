import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { CloseButton } from '../common/CloseButton';
import { useAppSelector } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { formatBalance } from '../common/Balance';

interface ShieldOption {
  id: string;
  duration: string;
  hours: number;
  price: number;
  description: string;
}

interface AntivirusModalProps {
  visible: boolean;
  onClose: () => void;
  onActivate: (option: ShieldOption) => void;
  isActive?: boolean;
  cooldownTime?: number;
}

const SHIELD_OPTIONS: ShieldOption[] = [
  {
    id: '4h',
    duration: '4 Hours',
    hours: 4,
    price: 10000,
    description: 'Quick protection for short sessions'
  },
  {
    id: '8h',
    duration: '8 Hours',
    hours: 8,
    price: 20000,
    description: 'Extended protection for active periods'
  },
  {
    id: '12h',
    duration: '12 Hours',
    hours: 12,
    price: 40000,
    description: 'Full day coverage with premium defense'
  },
  {
    id: '24h',
    duration: '24 Hours',
    hours: 24,
    price: 75000,
    description: 'Complete daily protection package'
  },
  {
    id: '1w',
    duration: '1 Week',
    hours: 168,
    price: 500000,
    description: 'Maximum security for extended operations'
  }
];

export const AntivirusModal: React.FC<AntivirusModalProps> = ({
  visible,
  onClose,
  onActivate,
  isActive = false,
  cooldownTime = 0,
}) => {
  const colors = useThemeColors();
  const balance = useAppSelector(getCurrentBalance);
  const styles = createStyles(colors);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Balance - positioned on the border line */}
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>WALLET:</Text>
            <Text style={styles.balanceAmount}>${formatBalance(balance)}</Text>
          </View>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Image
                source={require('../../assets/images/hackMap/antivirusShield.png')}
                style={styles.headerIcon}
                resizeMode="contain"
              />
              <Text style={styles.title}>Antivirus Shield</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={[
                styles.statusValue,
                isActive ? styles.activeStatus : styles.inactiveStatus
              ]}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>

            {cooldownTime > 0 && (
              <View style={styles.cooldownContainer}>
                <Text style={styles.cooldownLabel}>Cooldown:</Text>
                <Text style={styles.cooldownValue}>{formatTime(cooldownTime)}</Text>
              </View>
            )}


            <View style={styles.optionsContainer}>
              <Text style={styles.optionsTitle}>Shield Options:</Text>
              {SHIELD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    (isActive || cooldownTime > 0) && styles.disabledOptionButton
                  ]}
                  onPress={isActive || cooldownTime > 0 ? undefined : () => onActivate(option)}
                  activeOpacity={isActive || cooldownTime > 0 ? 1 : 0.7}
                  disabled={isActive || cooldownTime > 0}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <Text style={[
                        styles.optionDuration,
                        (isActive || cooldownTime > 0) && styles.disabledOptionText
                      ]}>
                        {option.duration}
                      </Text>
                      <Text style={[
                        styles.optionPrice,
                        (isActive || cooldownTime > 0) && styles.disabledOptionText
                      ]}>
                        ${option.price.toLocaleString()}
                      </Text>
                    </View>
                    <Text style={[
                      styles.optionDescription,
                      (isActive || cooldownTime > 0) && styles.disabledOptionText
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderColor: colors.secondary,
    borderWidth: 2,
    height: '75%',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  balanceContainer: {
    position: 'absolute',
    top: -12, // Half above the border line
    left: '53%',
    transform: [{ translateX: -90 }], // Center the balance component (180px maxWidth / 2)
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    maxWidth: 180,
    backgroundColor: colors.accent,
    borderColor: colors.primary,
  },
  balanceLabel: {
    marginRight: SIZING.spacing.xs,
    fontSize: SIZING.font.small,
    color: colors.text.secondary,
  },
  balanceAmount: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    color: colors.matrix,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.md,
    marginTop: SIZING.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: SIZING.spacing.lg,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZING.spacing.md,
  },
  statusLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginRight: SIZING.spacing.sm,
  },
  statusValue: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  activeStatus: {
    color: colors.success,
  },
  inactiveStatus: {
    color: colors.text.secondary,
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZING.spacing.md,
  },
  cooldownLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginRight: SIZING.spacing.sm,
  },
  cooldownValue: {
    color: colors.warning,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  descriptionContainer: {
    marginBottom: SIZING.spacing.lg,
  },
  description: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: SIZING.spacing.lg,
  },
  optionsTitle: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  optionButton: {
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
  },
  disabledOptionButton: {
    opacity: 0.5,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  optionDuration: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  optionPrice: {
    color: colors.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  optionDescription: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
    lineHeight: 18,
  },
  disabledOptionText: {
    color: colors.text.secondary,
  },
});

