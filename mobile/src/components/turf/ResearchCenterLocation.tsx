import React, {memo, useState, useEffect} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Modal, Alert} from 'react-native';
import {SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';
import { useUnlockResearchCenterMutation, useGetProfileQuery, useGetResearchCenterStatusQuery } from '../../store/api/authApi';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { BuildCountdownTimer } from './BuildCountdownTimer';

type ResearchCenterLocationProps = {
  onPress?: () => void;
  onNavigateToResearch?: () => void;
};

export const ResearchCenterLocation = memo(function ResearchCenterLocation({ onPress, onNavigateToResearch }: ResearchCenterLocationProps) {
  const colors = useThemeColors();
  const [showPopup, setShowPopup] = useState(false);
  const [unlockResearchCenter] = useUnlockResearchCenterMutation();
  const { data: profile, isLoading } = useGetProfileQuery();
  const { data: buildStatus, isLoading: buildStatusLoading, refetch: refetchBuildStatus } = useGetResearchCenterStatusQuery();
  const { data: balanceData, isLoading: balanceLoading } = useFetchBalanceQuery();
  const dispatch = useAppDispatch();
  
  // Use both sources to ensure we have the most up-to-date balance
  const currentBalance = balanceData?.total || useAppSelector((state) => state.balance.total);
  
  // Ensure balance is a number
  const numericBalance = typeof currentBalance === 'string' ? parseFloat(currentBalance) : currentBalance;

  const isUnlocked = buildStatus?.isUnlocked || false;
  const isBuilding = buildStatus?.buildStatus !== null;
  const RESEARCH_CENTER_COST = 50000;
  
  const hasSufficientFunds = numericBalance !== null && !isNaN(numericBalance as number) && numericBalance >= RESEARCH_CENTER_COST;

  const handlePress = () => {
    if (isBuilding) {
      // Do nothing during build - disabled
      return;
    } else if (isUnlocked) {
      if (onNavigateToResearch) onNavigateToResearch();
    } else {
      // Only show modal if we have valid balance data
      if (balanceLoading || currentBalance === null || currentBalance === undefined) {
        Alert.alert(
          'Loading Balance',
          'Please wait while we load your current balance.',
          [{ text: 'OK' }]
        );
        return;
      }
      setShowPopup(true);
    }
  };

  const handleBuild = async () => {
    if (!hasSufficientFunds) {
      Alert.alert(
        'Insufficient Funds',
        'You need $50,000 to build the Research Center.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await unlockResearchCenter().unwrap();
      console.log('Research center build started successfully');
      
      // Update balance in Redux store
      if (result.balance) {
        dispatch(updateBalance({
          total: result.balance.total,
          ratePerSecond: result.balance.ratePerSecond,
          lastUpdated: result.balance.lastUpdated
        }));
      }
      
      setShowPopup(false);
      // Don't call onPress here since we're now building, not navigating
    } catch (error: any) {
      console.error('Failed to start research center build:', error);
      const errorMessage = error?.data?.message || 'Failed to start research center build';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    }
  };

  const handleClose = () => {
    setShowPopup(false);
  };

  return (
    <View style={[styles.researchCenterContainer, { backgroundColor: colors.matrix + '0D', borderColor: colors.matrix + '33' }]}>
      <TouchableOpacity
        style={styles.location}
        onPress={handlePress}
      >
        <View style={[styles.iconContainer, { borderColor: colors.matrix }]}>
          <Image
            source={isBuilding 
              ? require('../../assets/images/underConstruction.png')
              : isUnlocked 
                ? require('../../assets/images/ResearchLvl1.png')
                : require('../../assets/images/dirt.png')
            }
            style={styles.locationIcon}
          />
        </View>
      </TouchableOpacity>
      
      <Text style={[styles.locationLabel, { color: colors.secondary }]}>
        {isBuilding ? 'UNDER CONSTRUCTION' : 'RESEARCH CENTER'}
      </Text>
      
      {isBuilding && buildStatus?.buildStatus && (
        <View style={styles.timerContainer}>
          <BuildCountdownTimer
            completesAt={buildStatus.buildStatus.completesAt}
            onComplete={() => {
              refetchBuildStatus();
            }}
          />
        </View>
      )}

      <Modal
        visible={showPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
        supportedOrientations={['landscape']}
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={handleClose} 
          activeOpacity={1}
        >
          <TouchableOpacity 
            style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.matrix }]} 
            onPress={() => {}} 
            activeOpacity={1}
          >
            <Text style={[styles.popupTitle, { color: colors.secondary }]}>Build Research Center</Text>
            <Text style={[styles.popupPrice, { color: colors.matrix }]}>$50,000</Text>
            <Text style={[styles.buildTime, { color: colors.secondary }]}>Time to build: 1 hour</Text>
            <TouchableOpacity 
              style={[
                styles.buildButton, 
                { 
                  backgroundColor: hasSufficientFunds ? colors.matrix : colors.buttonDisabled,
                  opacity: hasSufficientFunds ? 1 : 0.6
                }
              ]} 
              onPress={handleBuild}
              disabled={!hasSufficientFunds}
            >
              <Text style={[
                styles.buildButtonText, 
                { 
                  color: hasSufficientFunds ? colors.background : colors.text.secondary 
                }
              ]}>
                Build Research Center
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.closeButton, { borderColor: colors.matrix }]} onPress={handleClose}>
              <Text style={[styles.closeButtonText, { color: colors.secondary }]}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  researchCenterContainer: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: [{translateX: -150}],
    width: 300,
    height: '11%',
    borderRadius: 8,
    zIndex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: SIZING.spacing.lg,
    paddingTop: SIZING.spacing.md,
  },
  location: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 3,
    paddingTop: SIZING.spacing.md,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  locationIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain' as const,
  },
  locationLabel: {
    fontSize: SIZING.font.body,
    letterSpacing: 2,
    textAlign: 'center',
    position: 'absolute',
    bottom: '20%',
    width: 400,
    left: -50,
  },
  timerContainer: {
    position: 'absolute',
    top: '115%',
    left: '50%',
    transform: [{ translateX: -70 }],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZING.spacing.md,
    width: 140,
  },
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
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  popupPrice: {
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  buildTime: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  buildButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 6,
    marginBottom: SIZING.spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  buildButtonText: {
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
