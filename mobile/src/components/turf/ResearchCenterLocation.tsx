import React, {memo, useState, useEffect} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Modal, Alert} from 'react-native';
import {COLORS, SIZING} from '../../styles/theme';
import { useUnlockResearchCenterMutation, useGetProfileQuery, useGetResearchCenterStatusQuery } from '../../store/api/authApi';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { BuildCountdownTimer } from './BuildCountdownTimer';

type ResearchCenterLocationProps = {
  onPress?: () => void;
  onNavigateToResearch?: () => void;
};

export const ResearchCenterLocation = memo(function ResearchCenterLocation({ onPress, onNavigateToResearch }: ResearchCenterLocationProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [unlockResearchCenter] = useUnlockResearchCenterMutation();
  const { data: profile, isLoading } = useGetProfileQuery();
  const { data: buildStatus, isLoading: buildStatusLoading, refetch: refetchBuildStatus } = useGetResearchCenterStatusQuery();
  const dispatch = useAppDispatch();
  const currentBalance = useAppSelector((state) => state.balance.total);

  const isUnlocked = buildStatus?.isUnlocked || false;
  const isBuilding = buildStatus?.buildStatus !== null;
  const RESEARCH_CENTER_COST = 50000;
  const hasSufficientFunds = currentBalance !== null && currentBalance >= RESEARCH_CENTER_COST;

  const handlePress = () => {
    if (isBuilding) {
      // Do nothing during build - disabled
      return;
    } else if (isUnlocked) {
      if (onNavigateToResearch) onNavigateToResearch();
    } else {
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
    <View style={styles.researchCenterContainer}>
      <TouchableOpacity
        style={styles.location}
        onPress={handlePress}
      >
        <View style={styles.iconContainer}>
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
      
      {/* Label positioned inside the green opaque area, under the card image */}
              <Text style={styles.locationLabel}>
          {isBuilding ? 'UNDER CONSTRUCTION' : 'RESEARCH CENTER'}
        </Text>
      
      {/* Timer positioned below the entire green opaque area */}
      {isBuilding && buildStatus?.buildStatus && (
        <View style={styles.timerContainer}>
          <BuildCountdownTimer
            completesAt={buildStatus.buildStatus.completesAt}
            onComplete={() => {
              // Refetch build status when timer completes
              // This will trigger the auto-completion check on the server
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
            style={styles.popup} 
            onPress={() => {}} 
            activeOpacity={1}
          >
            <Text style={styles.popupTitle}>Build Research Center</Text>
            <Text style={styles.popupPrice}>$50,000</Text>
            <Text style={styles.buildTime}>Time to build: 1 hour</Text>
            <TouchableOpacity 
              style={[styles.buildButton, !hasSufficientFunds && styles.buildButtonDisabled]} 
              onPress={handleBuild}
              disabled={!hasSufficientFunds}
            >
              <Text style={[styles.buildButtonText, !hasSufficientFunds && styles.buildButtonTextDisabled]}>
                Build Research Center
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: 'rgba(0, 255, 65, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.2)',
    borderRadius: 8,
    zIndex: 1,
    justifyContent: 'flex-start', // Align to top
    alignItems: 'center',
    paddingBottom: SIZING.spacing.lg, // Responsive bottom padding
    paddingTop: SIZING.spacing.md, // Responsive top padding
  },
  location: {
    alignItems: 'center',
    justifyContent: 'flex-start', // Stack items from top
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 3,
    // height: '100%', // Remove fixed height
    paddingTop: SIZING.spacing.md, // Add top padding
  },
  iconContainer: {
    width: 120,
    height: 120, // Back to original height
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.matrix,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  locationIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain' as const,
  },
  locationLabel: {
    color: COLORS.secondary,
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
    top: '115%', // Below the entire green opaque area
    left: '50%',
    transform: [{ translateX: -70 }], // Center the timer
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZING.spacing.md, // Space below the green area
    width: 140, // Match timer minWidth
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
    backgroundColor: COLORS.background,
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.matrix,
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
    color: COLORS.secondary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  popupPrice: {
    color: COLORS.matrix,
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  buildTime: {
    color: COLORS.secondary,
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  buildButton: {
    backgroundColor: COLORS.matrix,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 6,
    marginBottom: SIZING.spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  buildButtonDisabled: {
    backgroundColor: COLORS.buttonDisabled,
    opacity: 0.6,
  },
  buildButtonText: {
    color: COLORS.background,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buildButtonTextDisabled: {
    color: COLORS.text.secondary,
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.matrix,
    borderRadius: 4,
  },
  closeButtonText: {
    color: COLORS.secondary,
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
});
