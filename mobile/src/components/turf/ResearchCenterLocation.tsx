import React, {memo, useState, useEffect, useRef} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Modal, Animated} from 'react-native';
import {SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';
import { useUnlockResearchCenterMutation, useGetProfileQuery, useGetResearchCenterStatusQuery, useSpeedupResearchCenterConstructionMutation } from '../../store/api/authApi';
import { userGuideApi } from '../../store/api/userGuideApi';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { BuildCountdownTimer } from './BuildCountdownTimer';
import { LockedFeatureModal } from './index';
import { SpeedupModal } from '../common/SpeedupModal';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';

type ResearchCenterLocationProps = {
  onPress?: () => void;
  onNavigateToResearch?: () => void;
  isIntroActive?: boolean;
};

export const ResearchCenterLocation = memo(function ResearchCenterLocation({ onPress, onNavigateToResearch, isIntroActive = false }: ResearchCenterLocationProps) {
  const colors = useThemeColors();
  const { highlightTaskId, clearHighlight } = useTaskGuideHighlight();
  const [showPopup, setShowPopup] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSpeedupModal, setShowSpeedupModal] = useState(false);
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  const isBuildResearchCenter = highlightTaskId === 'build-research-center';
  const isHighlighted = isIntroActive || isBuildResearchCenter;
  const [unlockResearchCenter] = useUnlockResearchCenterMutation();
  const [speedupResearchCenterConstruction] = useSpeedupResearchCenterConstructionMutation();
  const { data: profile, isLoading } = useGetProfileQuery();
  const { data: buildStatus, isLoading: buildStatusLoading, refetch: refetchBuildStatus } = useGetResearchCenterStatusQuery(undefined, {
    pollingInterval: (latestResult) => {
      return latestResult?.buildStatus != null ? 5000 : 0;
    },
  });
  const { data: balanceData, isLoading: balanceLoading } = useFetchBalanceQuery();
  const dispatch = useAppDispatch();
  const reduxBalance = useAppSelector((state) => state.balance.total);
  const currentBalanceState = useAppSelector((state) => state.balance);
  const previousIsUnlockedRef = useRef<boolean>(false);
  
  // Use both sources to ensure we have the most up-to-date balance
  const currentBalance = balanceData?.total ?? reduxBalance;
  
  // Ensure balance is a number
  const numericBalance = typeof currentBalance === 'string' ? parseFloat(currentBalance) : currentBalance;

  const isUnlocked = buildStatus?.isUnlocked || false;
  const isBuilding = buildStatus?.buildStatus != null;
  const RESEARCH_CENTER_COST = 50000;
  
  const hasSufficientFunds = numericBalance !== null && !isNaN(numericBalance as number) && numericBalance >= RESEARCH_CENTER_COST;
  
  useEffect(() => {
    if (isUnlocked && !previousIsUnlockedRef.current) {
      dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
    }
    previousIsUnlockedRef.current = isUnlocked;
  }, [isUnlocked, dispatch]);
  
  useEffect(() => {
    if (isHighlighted) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % introColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isHighlighted, introColors.length]);
  
  useEffect(() => {
    if (isHighlighted) {
      Animated.timing(animatedBorderColor, {
        toValue: currentColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentColorIndex, isHighlighted, animatedBorderColor]);
  
  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: introColors,
  });

  const handlePress = () => {
    if (isBuilding) {
      // Show speedup modal during build
      setShowSpeedupModal(true);
      return;
    } else if (isUnlocked) {
      if (onNavigateToResearch) onNavigateToResearch();
    } else {
      // Only show modal if we have valid balance data
      if (balanceLoading || currentBalance === null || currentBalance === undefined) {
        setShowLoadingModal(true);
        return;
      }
      setShowPopup(true);
    }
    if (isBuildResearchCenter) {
      clearHighlight();
    }
  };

  const handleBuild = async () => {
    if (!hasSufficientFunds) {
      setShowInsufficientFundsModal(true);
      return;
    }

    try {
      const result = await unlockResearchCenter().unwrap();
      
      // Update balance in Redux store - preserve existing fractionalRemainder
      if (result.balance) {
        dispatch(updateBalance({
          total: result.balance.total,
          ratePerSecond: result.balance.ratePerSecond,
          lastUpdated: result.balance.lastUpdated ? new Date(result.balance.lastUpdated) : null,
          fractionalRemainder: currentBalanceState.fractionalRemainder
        }));
      }
      
      setShowPopup(false);
      // Don't call onPress here since we're now building, not navigating
    } catch (error: any) {
      console.error('Failed to start research center build:', error);
      const errorMsg = error?.data?.message || 'Failed to start research center build';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    }
  };

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleSpeedup = async () => {
    try {
      const result = await speedupResearchCenterConstruction().unwrap();
      
      if (result.success) {
        // Update balance in Redux store - preserve existing ratePerSecond, lastUpdated, and fractionalRemainder
        if (result.balance) {
          dispatch(updateBalance({
            total: result.balance.total,
            ratePerSecond: currentBalanceState.ratePerSecond,
            lastUpdated: result.balance.lastUpdated ? new Date(result.balance.lastUpdated) : null,
            fractionalRemainder: currentBalanceState.fractionalRemainder
          }));
        }
        
        // Refetch build status to update UI
        await refetchBuildStatus();
        // Close speedup modal on success
        setShowSpeedupModal(false);
      }
    } catch (error: any) {
      console.error('Error speeding up research center construction:', error);
      // Close speedup modal and show error modal instead
      setShowSpeedupModal(false);
      const errorMsg = error?.data?.message || error?.data?.error || 'Failed to speed up research center construction';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    }
  };

  // Calculate seconds remaining for speedup modal
  const getSecondsRemaining = (): number => {
    if (!buildStatus?.buildStatus?.completesAt) {
      return 0;
    }
    const now = new Date().getTime();
    const completesAt = new Date(buildStatus.buildStatus.completesAt).getTime();
    return Math.max(0, completesAt - now);
  };

  const zIndexValue = isHighlighted ? 10002 : 1;
  
  return (
    <View 
      style={[styles.researchCenterContainer, { 
        backgroundColor: colors.matrix + '0D', 
        borderColor: colors.matrix + '33', 
        zIndex: zIndexValue,
        elevation: isHighlighted ? 10002 : 1
      }]}
      collapsable={false}
    >
      <TouchableOpacity
        style={styles.location}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Animated.View style={[
          styles.iconContainer, 
          { 
            borderColor: isHighlighted ? animatedBorderColorValue : colors.matrix,
            borderWidth: isHighlighted ? 3 : 1
          }
        ]}>
          <Image
            source={isBuilding 
              ? require('../../assets/images/underConstruction.png')
              : isUnlocked 
                ? require('../../assets/images/ResearchLvl1.png')
                : require('../../assets/images/dirt.png')
            }
            style={styles.locationIcon}
          />
        </Animated.View>
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
      
      <LockedFeatureModal
        visible={showLoadingModal}
        title="LOADING BALANCE"
        message="Please wait while we load your current balance."
        onClose={() => setShowLoadingModal(false)}
        closeButtonText="OK"
      />
      
      <LockedFeatureModal
        visible={showInsufficientFundsModal}
        title="INSUFFICIENT FUNDS"
        message="You need $50,000 to build the Research Center."
        onClose={() => setShowInsufficientFundsModal(false)}
        closeButtonText="UNDERSTOOD"
      />
      
      <LockedFeatureModal
        visible={showErrorModal}
        title="BUILD ERROR"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        closeButtonText="CLOSE"
      />

      {isBuilding && buildStatus?.buildStatus?.completesAt && (
        <SpeedupModal
          visible={showSpeedupModal}
          secondsRemaining={getSecondsRemaining()}
          currentBalance={numericBalance || 0}
          itemType="construction"
          onSpeedup={handleSpeedup}
          onClose={() => setShowSpeedupModal(false)}
        />
      )}
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
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZING.spacing.md,
    width: '95%',
    marginLeft: '2.5%',
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
