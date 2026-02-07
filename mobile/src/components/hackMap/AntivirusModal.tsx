import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, Image, ScrollView, Platform, Dimensions } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { CloseButton } from '../common/CloseButton';
import { useAppSelector } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { formatBalance } from '../common/Balance';
import { useAppDispatch } from '../../store/hooks';
import { useGetShieldStatusQuery, useActivateShieldMutation } from '../../store/api/antivirusApi';
import { userGuideApi } from '../../store/api/userGuideApi';
import { useGetUserFeaturesQuery } from '../../store/api/researchFeaturesApi';
import { AntivirusShieldTimer } from './AntivirusShieldTimer';
import { AntivirusCooldownTimer } from './AntivirusCooldownTimer';

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
}) => {
  const colors = useThemeColors();
  const balance = useAppSelector(getCurrentBalance);
  const styles = createStyles(colors);
  
  
  const { data: shieldData, refetch, error: shieldError, isLoading: shieldLoading } = useGetShieldStatusQuery(undefined, {
    pollingInterval: 1000,
  });
  const dispatch = useAppDispatch();
  const [activateShield, { isLoading: isActivating }] = useActivateShieldMutation();

  // Get research features data (same as HackMapScreen and ResearchFeaturesList)
  const { data: researchFeatures } = useGetUserFeaturesQuery('home-defense');
  
  const antivirusFeature = researchFeatures?.find(f => f.id === 'antivirus');
  
  const now = new Date().getTime();
  const researchCompletesAt = antivirusFeature?.researchCompletesAt ? new Date(antivirusFeature.researchCompletesAt).getTime() : 0;
  const remaining = Math.max(0, researchCompletesAt - now);
  const isActuallyUnlocked = antivirusFeature?.isUnlocked || 
    (antivirusFeature?.isResearching && remaining === 0);


  const isActive = shieldData?.isActive || false;
  const shieldStatus = shieldData?.shieldStatus;
  const cooldownStatus = shieldData?.cooldownStatus;
  const isInCooldown = !!cooldownStatus;

  const handleActivate = async (option: ShieldOption) => {
    if (isActive || isInCooldown) {
      return;
    }
    
    if (balance < option.price) {
      return;
    }
    
    try {
      await activateShield({ optionId: option.id }).unwrap();
      refetch();
      // Invalidate task guide so "Use a shield" moves to Collect
      dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
    } catch (error) {
      console.error('Failed to activate shield:', error);
    }
  };

  const handleShieldComplete = () => {
    refetch();
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleClosePressOut = useCallback(() => {
    if (Platform.OS === 'android') {
      onClose();
    }
  }, [onClose]);

  // Modal visibility is controlled by parent component (HackMapScreen)
  // No need to double-check unlock status here


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      supportedOrientations={['landscape']}
      hardwareAccelerated={true}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Balance - positioned on the border line */}
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>WALLET:</Text>
            <Text style={styles.balanceAmount}>${formatBalance(balance)}</Text>
          </View>
          {/* Header - Fixed height, not in flex */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Image
                source={isActive 
                  ? require('../../assets/images/hackMap/activatedShield.png')
                  : require('../../assets/images/hackMap/antivirusShield.png')
                }
                style={styles.headerIcon}
                resizeMode="contain"
              />
              <Text style={styles.title}>Antivirus Shield</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && { opacity: 0.7 }
              ]}
              onPress={handleClose}
              onPressOut={handleClosePressOut}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          {/* Content - ScrollView with pointerEvents to capture touches */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false} // Hide scrollbar - scrolling works now!
            nestedScrollEnabled={true} // Re-enabled - needed for Android
            bounces={false} // Disabled - may interfere
            alwaysBounceVertical={false}
            scrollEventThrottle={16}
            removeClippedSubviews={false} // Ensure all content is rendered
            pointerEvents="auto" // Explicitly enable touch events
            scrollEnabled={true} // Explicitly enable scrolling
            keyboardShouldPersistTaps="handled" // Prevent keyboard from interfering
          >
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
              <View style={styles.statusContainer}>
                <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[
                  styles.statusValue,
                  isActive ? styles.activeStatus : isInCooldown ? styles.cooldownStatus : styles.inactiveStatus
                ]}>
                  {isActive ? 'ACTIVE' : isInCooldown ? 'COOLDOWN' : 'INACTIVE'}
                </Text>
              </View>
              {isActive && shieldStatus && (
                <AntivirusShieldTimer
                  completesAt={shieldStatus.completesAt}
                  onComplete={handleShieldComplete}
                />
              )}
              {isInCooldown && cooldownStatus && (
                <AntivirusCooldownTimer
                  cooldownUntil={cooldownStatus.cooldownUntil}
                  onComplete={handleShieldComplete}
                />
              )}
            </View>
            <View style={styles.optionsContainer}>
              <Text style={styles.optionsTitle}>Shield Options:</Text>
              {SHIELD_OPTIONS.map((option) => {
                const handleOptionPress = () => {
                  if (!isActive && !isInCooldown && !isActivating) {
                    handleActivate(option);
                  }
                };

                const handleOptionPressOut = () => {
                  if (Platform.OS === 'android' && !isActive && !isInCooldown && !isActivating) {
                    handleActivate(option);
                  }
                };

                return (
                  <Pressable
                    key={option.id}
                    style={({ pressed }) => [
                      styles.optionButton,
                      (isActive || isInCooldown) && styles.disabledOptionButton,
                      pressed && !isActive && !isInCooldown && !isActivating && { opacity: 0.7 }
                    ]}
                    onPress={handleOptionPress}
                    onPressOut={handleOptionPressOut}
                    disabled={isActive || isInCooldown || isActivating}
                  >
                  <View style={styles.optionContent}>
                    <View style={styles.optionHeader}>
                      <Text style={[
                        styles.optionDuration,
                        (isActive || isInCooldown) && styles.disabledOptionText
                      ]}>
                        {option.duration}
                      </Text>
                      <Text style={[
                        styles.optionPrice,
                        (isActive || isInCooldown) && styles.disabledOptionText
                      ]}>
                        ${option.price.toLocaleString()}
                      </Text>
                    </View>
                    <Text style={[
                      styles.optionDescription,
                      (isActive || isInCooldown) && styles.disabledOptionText
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                  </Pressable>
                );
              })}
            </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
    maxHeight: SCREEN_HEIGHT * 0.75, // Use maxHeight instead of height for better flex behavior
    height: '75%',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'visible', // Reverted - keep visible for close button and wallet positioning
    position: 'relative', // Ensure close button positioning works
    flexDirection: 'column', // Ensure flex layout
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
    flexShrink: 0, // Prevent header from shrinking
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
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1, // Use flex to take remaining space after header
    padding: SIZING.spacing.lg,
  },
  scrollContent: {
    paddingBottom: SIZING.spacing.lg,
    // Remove flexGrow - let content determine natural height
  },
  statusContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: SIZING.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
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
  cooldownStatus: {
    color: colors.error,
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

