import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../context/ThemeContext';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBalance, getCurrentBalance } from '../../store/slices/balanceSlice';
import { authApi, useGetRentalHousingStatusQuery, useUnlockRentalHousingMutation, useCompleteRentalHousingMutation, useSpeedupPropertyConstructionMutation, useGetCrewStatusQuery, useGetCrewDetailsQuery, useRequestCrewBackupMutation } from '../../store/api/authApi';
import { userGuideApi } from '../../store/api/userGuideApi';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';
import { trackFirstConstruct } from '../../services/analyticsService';
import {
  DevelopmentIcon,
  DevelopmentLabel,
  DevelopmentTimer,
  BuildModal,
  LockedFeatureModal
} from './index';
import { SpeedupModal } from '../common/SpeedupModal';

type RentalHousingLocationProps = {
  propertyId: number;
  onPress?: () => void;
  onNavigateToRentalHousing?: () => void;
  onNavigateToFloorPlan?: (propertyId: number) => void;
  showTimer?: boolean;
  isIntroActive?: boolean;
};

export const RentalHousingLocation = memo(function RentalHousingLocation({ 
  onPress, 
  onNavigateToRentalHousing,
  propertyId = 1,
  onNavigateToFloorPlan,
  showTimer = true,
  isIntroActive = false
}: RentalHousingLocationProps) {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const { highlightTaskId, clearHighlight } = useTaskGuideHighlight();
  const currentBalanceState = useAppSelector((state) => state.balance);
  const userId = useAppSelector((state) => state.auth.user?._id);
  const [showPopup, setShowPopup] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showBuildStartedModal, setShowBuildStartedModal] = useState(false);
  const [showBuildErrorModal, setShowBuildErrorModal] = useState(false);
  const [buildErrorMessage, setBuildErrorMessage] = useState('');
  const [buildErrorModalTitle, setBuildErrorModalTitle] = useState<'CAN\'T START BUILD' | 'SPEEDUP ERROR'>('CAN\'T START BUILD');
  const [showCompletionErrorModal, setShowCompletionErrorModal] = useState(false);
  const [showSpeedupModal, setShowSpeedupModal] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const { data: balanceData, isLoading: balanceLoading } = useFetchBalanceQuery();
  const [isBuildingState, setIsBuildingState] = useState(false);
  const { data: rentalHousingStatus, isLoading: statusLoading, refetch } = useGetRentalHousingStatusQuery(propertyId, {
    pollingInterval: isBuildingState ? 5000 : 0,
  });
  const [unlockRentalHousing, { isLoading: isUnlocking }] = useUnlockRentalHousingMutation();
  const [completeRentalHousing, { isLoading: isCompleting }] = useCompleteRentalHousingMutation();
  const [speedupPropertyConstruction] = useSpeedupPropertyConstructionMutation();
  const [requestCrewBackup] = useRequestCrewBackupMutation();
  const { data: crewStatus } = useGetCrewStatusQuery();
  const isBuildingFromStatus = rentalHousingStatus?.isBuilding ?? false;
  const { data: crewDetails, refetch: refetchCrewDetails } = useGetCrewDetailsQuery(crewStatus?.crewId ?? '', {
    skip: !crewStatus?.crewId || !crewStatus?.isInCrew || !isBuildingFromStatus,
    pollingInterval: isBuildingFromStatus ? 5000 : 0,
  });
  const currentUserId = useAppSelector((state) => state.auth.user?._id ?? (state.auth.user as any)?.id);
  // Match rental build by jobType (same as DevelopmentZone) so we hide only when user requested for this build
  const hasRequestedBackup = Boolean(
    currentUserId &&
    crewDetails?.crew?.backupRequests?.some(
      (r) =>
        String(r.userId) === String(currentUserId) &&
        (r.jobType === 'rentalBuild' || (r.jobLabel?.includes('Investment property') ?? false))
    )
  );

  const dispatch = useAppDispatch();
  const previousIsUnlockedRef = useRef<boolean | undefined>(undefined);
  const hadBuildingRef = useRef(false);

  // When this property starts building, refetch crew details so "Request back-up" uses fresh list (not stale cache from a previous build)
  useEffect(() => {
    if (isBuildingFromStatus && crewStatus?.crewId && crewStatus?.isInCrew && !hadBuildingRef.current) {
      hadBuildingRef.current = true;
      refetchCrewDetails();
    }
    if (!isBuildingFromStatus) hadBuildingRef.current = false;
  }, [isBuildingFromStatus, crewStatus?.crewId, crewStatus?.isInCrew, refetchCrewDetails]);

  // Get balance from Redux store (always call hooks unconditionally)
  const reduxBalance = useAppSelector((state) => state.balance.total);
  
  // Use both sources to ensure we have the most up-to-date balance
  const currentBalance = balanceData?.total ?? reduxBalance;
  
  // Ensure balance is a number
  const numericBalance = typeof currentBalance === 'string' ? parseFloat(currentBalance) : currentBalance;

  // Get real data from API
  const isUnlocked = rentalHousingStatus?.isUnlocked ?? false;
  const isBuilding = rentalHousingStatus?.isBuilding ?? false;
  const buildStatus = rentalHousingStatus?.buildStatus ?? null;
  const canBuild = rentalHousingStatus?.canBuild ?? false;
  
  const propertyLevel = rentalHousingStatus?.propertyLevel ?? 0;
  const buildCost = rentalHousingStatus?.nextBuildCost ?? 100000;
  const buildTimeMinutes = rentalHousingStatus?.nextBuildTimeMinutes ?? 120;
  const buildTimeDisplay = buildTimeMinutes < 60
    ? `${buildTimeMinutes} min`
    : (() => {
        const hours = Math.floor(buildTimeMinutes / 60);
        const mins = buildTimeMinutes % 60;
        const hourPart = `${hours} hour${hours !== 1 ? 's' : ''}`;
        return mins > 0 ? `${hourPart} ${mins} min` : hourPart;
      })();
  const hasSufficientFunds = numericBalance !== null && !isNaN(numericBalance as number) && numericBalance >= buildCost;
  const showUpgradeArrow = isUnlocked && canBuild;

  const isBuildInvestmentProperty =
    (highlightTaskId === 'build-investment-property' && propertyId === 1) ||
    (highlightTaskId === 'build-investment-property-2' && propertyId === 2);
  const isHighlighted = isIntroActive || isBuildInvestmentProperty;
  
  useEffect(() => {
    setIsBuildingState(isBuilding);
  }, [isBuilding]);

  useEffect(() => {
    // Invalidate task guide when property 1 or 2 transitions to unlocked (for guided tasks)
    if (isUnlocked && previousIsUnlockedRef.current === false && (propertyId === 1 || propertyId === 2)) {
      dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
    }
    previousIsUnlockedRef.current = isUnlocked;
  }, [isUnlocked, propertyId, dispatch]);

  // Update balance when build starts
  useEffect(() => {
    if (rentalHousingStatus?.buildStatus?.startedAt && !rentalHousingStatus?.buildStatus?.completesAt) {
      // Build just started, update local balance
      // Note: Balance will be updated when the unlockRentalHousing mutation completes
    }
  }, [rentalHousingStatus, dispatch]);

  const handlePress = () => {
    if (isBuildInvestmentProperty) {
      clearHighlight();
    }
    
    if (isBuilding) {
      // Show speedup modal during build
      setShowSpeedupModal(true);
      return;
    } else if (isUnlocked) {
      if (onNavigateToFloorPlan) {
        onNavigateToFloorPlan(propertyId);
      } else if (onNavigateToRentalHousing) {
        onNavigateToRentalHousing();
      }
    } else {
      // Only show modal if we have valid balance data and can build
      if (balanceLoading || statusLoading || currentBalance === null || currentBalance === undefined) {
        setShowLoadingModal(true);
        return;
      }
      
      if (!canBuild) {
        // Property cannot be built (e.g., previous property not unlocked)
        return;
      }
      
      setShowPopup(true);
    }
  };

  const handleBuild = async () => {
    if (!hasSufficientFunds) {
      setShowInsufficientFundsModal(true);
      return;
    }

    try {
      const result = await unlockRentalHousing(propertyId).unwrap();
      
      if (result.success) {
        // Update balance whenever the server sends newBalance so we don't show success UI with stale balance (consistent with success modal)
        if (result.newBalance !== undefined) {
          dispatch(updateBalance({
            total: result.newBalance,
            ratePerSecond: currentBalanceState.ratePerSecond,
            lastUpdated: currentBalanceState.lastUpdated ? new Date(currentBalanceState.lastUpdated) : null,
            fractionalRemainder: currentBalanceState.fractionalRemainder
          }));
        }
        if (result.buildStatus) {
          // Optimistic cache update so TurfScreen/DevelopmentZone see active build immediately and "Request back-up" shows with the upgrade
          const startedAt = typeof result.buildStatus.startedAt === 'string' ? result.buildStatus.startedAt : new Date(result.buildStatus.startedAt).toISOString();
          const completesAt = typeof result.buildStatus.completesAt === 'string' ? result.buildStatus.completesAt : new Date(result.buildStatus.completesAt).toISOString();
          dispatch(authApi.util.updateQueryData('getRentalHousingStatus', propertyId, (draft) => {
            draft.isBuilding = true;
            draft.buildStatus = { startedAt, completesAt, targetLevel: result.buildStatus!.targetLevel };
          }));
        }
        refetch();
        setShowBuildStartedModal(true);
        setShowPopup(false);
      }
    } catch (error: any) {
      console.error('Error starting rental housing build:', error);
      setShowPopup(false);
      const msg = error?.data?.message || error?.data?.error;
      if (error?.data?.error === 'Insufficient funds') {
        setShowInsufficientFundsModal(true);
      } else {
        setBuildErrorModalTitle('CAN\'T START BUILD');
        setBuildErrorMessage(msg && typeof msg === 'string' ? msg : 'Failed to start build. Please try again.');
        setShowBuildErrorModal(true);
      }
    }
  };

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleTimerComplete = useCallback(async () => {
    try {
      const result = await completeRentalHousing(propertyId).unwrap();
      if (result.success) {
        if (typeof result.ratePerSecond === 'number' || typeof result.newBalance === 'number') {
          dispatch(updateBalance({
            total: typeof result.newBalance === 'number' ? result.newBalance : (currentBalanceState.total ?? 0),
            ratePerSecond: result.ratePerSecond ?? currentBalanceState.ratePerSecond,
            lastUpdated: currentBalanceState.lastUpdated ? new Date(currentBalanceState.lastUpdated) : null,
            fractionalRemainder: currentBalanceState.fractionalRemainder
          }));
        }
        setForceUpdate(prev => prev + 1);
        if (userId) {
          trackFirstConstruct('rental_property', userId, propertyId).catch((error) => {
            console.error('[Analytics] Error tracking first_construct:', error);
          });
        }
        await refetch();
      }
    } catch (error: any) {
      console.error('Error completing rental housing build:', error);
      setShowCompletionErrorModal(true);
    }
  }, [propertyId, completeRentalHousing, refetch, userId, dispatch, currentBalanceState]);

  const handleSpeedup = useCallback(async () => {
    try {
      const result = await speedupPropertyConstruction(propertyId).unwrap();
      if (result.success) {
        dispatch(updateBalance({
          total: result.newBalance,
          ratePerSecond: result.ratePerSecond ?? currentBalanceState.ratePerSecond,
          lastUpdated: currentBalanceState.lastUpdated ? new Date(currentBalanceState.lastUpdated) : null,
          fractionalRemainder: currentBalanceState.fractionalRemainder
        }));
        setForceUpdate(prev => prev + 1);
        await refetch();
        setShowSpeedupModal(false);
      }
    } catch (error: any) {
      console.error('Error speeding up property construction:', error);
      setShowSpeedupModal(false);
      if (error?.data?.error === 'Insufficient funds') {
        setShowInsufficientFundsModal(true);
      } else {
        setBuildErrorModalTitle('SPEEDUP ERROR');
        const msg = error?.data?.message || error?.data?.error;
        setBuildErrorMessage(msg && typeof msg === 'string' ? msg : 'Failed to speed up build. Please try again.');
        setShowBuildErrorModal(true);
      }
    }
  }, [propertyId, speedupPropertyConstruction, dispatch, currentBalanceState, refetch]);

  // Calculate seconds remaining for speedup modal
  const getSecondsRemaining = (): number => {
    if (!buildStatus?.completesAt) {
      return 0;
    }
    const now = new Date().getTime();
    const completesAt = new Date(buildStatus.completesAt).getTime();
    return Math.max(0, completesAt - now);
  };

  // Show loading state while fetching status
  if (statusLoading) {
    return (
      <View style={[styles.rentalHousingContainer, { zIndex: isHighlighted ? 10002 : 1 }]}>
        <View style={styles.iconWrapper}>
          <DevelopmentIcon
            isBuilding={false}
            isUnlocked={false}
            emptyImage={require('../../assets/images/emptyResidential.png')}
            completedImage={require('../../assets/images/residentialLvl1.png')}
            underConstructionImage={require('../../assets/images/residentialUnderConstruction.png')}
            onPress={() => {}}
            size={100}
            iconSize={85}
            isIntroActive={isHighlighted}
          />
          <Text style={[styles.propertyNumber, { color: themeMode === 'light' ? '#FFFFFF' : colors.matrix }]}>{propertyId}</Text>
        </View>
      </View>
    );
  }

  const zIndexValue = isHighlighted ? 10002 : 1;

  return (
    <View style={[styles.rentalHousingContainer, { zIndex: zIndexValue }]}>
      {isUnlocked && propertyLevel >= 1 && (
        <Text style={[styles.levelBadge, { color: themeMode === 'light' ? '#333' : colors.matrix }]}>
          Lv. {propertyLevel}
        </Text>
      )}
      <View style={styles.iconWrapper}>
        <DevelopmentIcon
          isBuilding={isBuilding}
          isUnlocked={isUnlocked}
          emptyImage={require('../../assets/images/emptyResidential.png')}
          completedImage={require('../../assets/images/residentialLvl1.png')}
          underConstructionImage={require('../../assets/images/residentialUnderConstruction.png')}
          onPress={handlePress}
          size={100}
          iconSize={85}
          isIntroActive={isHighlighted}
        />
        <Text style={[styles.propertyNumber, { color: themeMode === 'light' ? '#FFFFFF' : colors.matrix }]}>{propertyId}</Text>
        {showUpgradeArrow && (
          <TouchableOpacity
            style={[styles.upgradeArrow, { backgroundColor: colors.primary }]}
            onPress={() => setShowPopup(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeArrowText}>↑</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {showTimer && (
        <View>
          <DevelopmentTimer
            isBuilding={isBuilding}
            buildStatus={buildStatus}
            onComplete={handleTimerComplete}
            topOffset="120%"
            leftOffset={-50}
            width={120}
          />
          {isBuilding && crewStatus?.isInCrew && crewDetails != null && !hasRequestedBackup && (
            <TouchableOpacity
              style={[styles.requestBackupButton, { backgroundColor: colors.primary, borderColor: colors.matrix }]}
              onPress={() => {
                requestCrewBackup({ jobType: 'rentalBuild', jobKey: `property${propertyId}` });
              }}
            >
              <Text style={[styles.requestBackupText, { color: colors.background }]}>Request back-up</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <BuildModal
        visible={showPopup}
        title={propertyLevel === 0 ? 'Build Investment Property' : `Upgrade to Level ${(propertyLevel + 1)}`}
        cost={buildCost}
        buildTime={buildTimeDisplay}
        hasSufficientFunds={hasSufficientFunds}
        onBuild={handleBuild}
        onClose={handleClose}
        buildButtonText={propertyLevel === 0 ? 'Start Build' : 'Start Upgrade'}
      />
      
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
        message={`You need $${buildCost.toLocaleString()} to ${propertyLevel === 0 ? 'build' : 'upgrade'} this property.`}
        onClose={() => setShowInsufficientFundsModal(false)}
        closeButtonText="OK"
      />

      <LockedFeatureModal
        visible={showBuildStartedModal}
        title="BUILD STARTED"
        message={`Your build has begun! Check back in ${buildTimeDisplay} to see your completed upgrade.`}
        onClose={() => setShowBuildStartedModal(false)}
        closeButtonText="OK"
      />

      <LockedFeatureModal
        visible={showBuildErrorModal}
        title={buildErrorModalTitle}
        message={buildErrorMessage || (buildErrorModalTitle === 'SPEEDUP ERROR' ? 'Failed to speed up build. Please try again.' : 'Failed to start build. Please try again.')}
        onClose={() => setShowBuildErrorModal(false)}
        closeButtonText="CLOSE"
      />

      <LockedFeatureModal
        visible={showCompletionErrorModal}
        title="COMPLETION ERROR"
        message="Failed to complete build. Please try again."
        onClose={() => setShowCompletionErrorModal(false)}
        closeButtonText="CLOSE"
      />

      {isBuilding && buildStatus?.completesAt && (
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
  rentalHousingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    minHeight: 120,
  },
  levelBadge: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 0,
    letterSpacing: 0.5,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyNumber: {
    position: 'absolute',
    top: 15,
    right: 12,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    color: '#00FF00',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
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
  requestBackupButton: {
    marginTop: SIZING.spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'center',
  },
  requestBackupText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
