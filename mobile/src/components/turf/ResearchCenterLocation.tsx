import React, {memo, useState, useEffect, useRef} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Modal, Animated} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';
import { useUnlockResearchCenterMutation, useGetProfileQuery, useGetResearchCenterStatusQuery, useSpeedupResearchCenterConstructionMutation } from '../../store/api/authApi';
import { userGuideApi } from '../../store/api/userGuideApi';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { trackFirstConstruct } from '../../services/analyticsService';
import { BuildCountdownTimer } from './BuildCountdownTimer';
import { LockedFeatureModal } from './index';
import { SpeedupModal } from '../common/SpeedupModal';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';

type ResearchCenterLocationProps = {
  onPress?: () => void;
  onNavigateToResearch?: () => void;
  isIntroActive?: boolean;
};

function formatBuildTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourPart = `${hours} hour${hours !== 1 ? 's' : ''}`;
  return mins > 0 ? `${hourPart} ${mins} min` : hourPart;
}

export const ResearchCenterLocation = memo(function ResearchCenterLocation({ onPress, onNavigateToResearch, isIntroActive = false }: ResearchCenterLocationProps) {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const { highlightTaskId, clearHighlight } = useTaskGuideHighlight();
  const [showPopup, setShowPopup] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingModalReason, setLoadingModalReason] = useState<'balance' | 'status' | null>(null);
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
  const token = useAppSelector((state) => state.auth.token);
  const userId = useAppSelector((state) => state.auth.user?._id);
  const [isBuildingState, setIsBuildingState] = useState(false);
  const { data: buildStatus, isLoading: buildStatusLoading, refetch: refetchBuildStatus } = useGetResearchCenterStatusQuery(undefined, {
    skip: !token, // Don't query if user isn't logged in
    pollingInterval: isBuildingState ? 5000 : 0,
  });
  const { data: balanceData, isLoading: balanceLoading } = useFetchBalanceQuery();
  const dispatch = useAppDispatch();
  const reduxBalance = useAppSelector((state) => state.balance.total);
  const currentBalanceState = useAppSelector((state) => state.balance);
  const previousIsUnlockedRef = useRef<boolean | undefined>(undefined);
  
  // Use both sources to ensure we have the most up-to-date balance
  const currentBalance = balanceData?.total ?? reduxBalance;
  
  // Ensure balance is a number
  const numericBalance = typeof currentBalance === 'string' ? parseFloat(currentBalance) : currentBalance;

  const isUnlocked = buildStatus?.isUnlocked || false;
  const level = buildStatus?.level ?? 0;
  const canBuild = buildStatus?.canBuild ?? false;
  const nextBuildCost = buildStatus?.nextBuildCost ?? 5000;
  const nextBuildTimeMinutes = buildStatus?.nextBuildTimeMinutes ?? 1;
  const buildCost = nextBuildCost;
  const buildTimeDisplay = formatBuildTime(nextBuildTimeMinutes);
  const isBuilding = buildStatus?.buildStatus != null;
  const showUpgradeArrow = isUnlocked && canBuild;
  
  useEffect(() => {
    setIsBuildingState(isBuilding);
  }, [isBuilding]);
  
  const hasSufficientFunds = numericBalance !== null && !isNaN(numericBalance as number) && numericBalance >= buildCost;
  
  useEffect(() => {
    // Only track and invalidate cache when unlock state transitions from false to true
    // AND we have valid profile data (user is logged in)
    // AND we have a token (user is authenticated)
    // AND this is actually a transition (not initial mount with cached data)
    if (
      isUnlocked && 
      previousIsUnlockedRef.current === false &&
      profile && // Ensure user is logged in
      token && // Ensure user is authenticated
      !isLoading && // Ensure we're not still loading
      buildStatus !== undefined // Ensure we have actual data (not undefined from skip)
    ) {
      dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
      // Track first construction
      if (userId) {
        trackFirstConstruct('research_center', userId);
      }
    }
    // Only update ref if we have valid data (not on initial mount with undefined)
    if (buildStatus !== undefined && token) {
      previousIsUnlockedRef.current = isUnlocked;
    }
  }, [isUnlocked, dispatch, profile, isLoading, buildStatus, token, userId]);
  
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
    if (isBuildResearchCenter) {
      clearHighlight();
    }
    
    if (isBuilding) {
      // Show speedup modal during build
      setShowSpeedupModal(true);
      return;
    } else if (isUnlocked) {
      if (onNavigateToResearch) onNavigateToResearch();
    } else {
      // Not unlocked: show build modal (or loading if balance/status not ready)
      if (balanceLoading || buildStatusLoading || currentBalance === null || currentBalance === undefined) {
        setLoadingModalReason(buildStatusLoading ? 'status' : 'balance');
        setShowLoadingModal(true);
        return;
      }
      setShowPopup(true);
    }
  };

  const handleUpgradeArrowPress = () => {
    if (buildStatusLoading) {
      setLoadingModalReason('status');
      setShowLoadingModal(true);
      return;
    }
    setShowPopup(true);
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
        {isUnlocked && level >= 1 && (
          <Text style={[styles.levelBadge, { color: themeMode === 'light' ? '#333' : colors.matrix }]}>
            Lv. {level}
          </Text>
        )}
        <View style={styles.iconWrapper}>
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
          {showUpgradeArrow && (
            <TouchableOpacity
              style={[styles.upgradeArrow, { backgroundColor: colors.primary }]}
              onPress={handleUpgradeArrowPress}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeArrowText}>↑</Text>
            </TouchableOpacity>
          )}
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
            <Text style={[styles.popupTitle, { color: colors.secondary }]}>
              {level < 1 ? 'Build Research Center' : `Upgrade to Level ${level + 1}`}
            </Text>
            <Text style={[styles.popupPrice, { color: colors.matrix }]}>${buildCost.toLocaleString()}</Text>
            <Text style={[styles.buildTime, { color: colors.secondary }]}>Time: {buildTimeDisplay}</Text>
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
                {level < 1 ? 'Start Build' : 'Start Upgrade'}
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
        title={loadingModalReason === 'status' ? 'LOADING RESEARCH CENTER' : 'LOADING BALANCE'}
        message={loadingModalReason === 'status' ? 'Please wait while we load your research center status.' : 'Please wait while we load your current balance.'}
        onClose={() => { setShowLoadingModal(false); setLoadingModalReason(null); }}
        closeButtonText="OK"
      />
      
      <LockedFeatureModal
        visible={showInsufficientFundsModal}
        title="INSUFFICIENT FUNDS"
        message={`You need $${buildCost.toLocaleString()} to ${level < 1 ? 'build' : 'upgrade'} the Research Center.`}
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
    justifyContent: 'flex-end',
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
  levelBadge: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: SIZING.spacing.sm,
    letterSpacing: 0.5,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeArrow: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  upgradeArrowText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  locationLabel: {
    fontSize: SIZING.font.body,
    letterSpacing: 2,
    textAlign: 'center',
    width: 400,
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
