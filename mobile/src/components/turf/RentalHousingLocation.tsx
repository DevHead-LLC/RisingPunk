import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../context/ThemeContext';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { useGetRentalHousingStatusQuery, useUnlockRentalHousingMutation, useCompleteRentalHousingMutation } from '../../store/api/authApi';
import {
  DevelopmentIcon,
  DevelopmentLabel,
  DevelopmentTimer,
  BuildModal,
  LockedFeatureModal
} from './index';

type RentalHousingLocationProps = {
  propertyId: number;
  onPress?: () => void;
  onNavigateToRentalHousing?: () => void;
  onNavigateToFloorPlan?: (propertyId: number) => void;
  showTimer?: boolean;
};

export const RentalHousingLocation = memo(function RentalHousingLocation({ 
  onPress, 
  onNavigateToRentalHousing,
  propertyId = 1,
  onNavigateToFloorPlan,
  showTimer = true
}: RentalHousingLocationProps) {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const [showPopup, setShowPopup] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showBuildStartedModal, setShowBuildStartedModal] = useState(false);
  const [showBuildErrorModal, setShowBuildErrorModal] = useState(false);
  const [showCompletionErrorModal, setShowCompletionErrorModal] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const { data: balanceData, isLoading: balanceLoading } = useFetchBalanceQuery();
  const { data: rentalHousingStatus, isLoading: statusLoading, refetch } = useGetRentalHousingStatusQuery(propertyId);
  const [unlockRentalHousing, { isLoading: isUnlocking }] = useUnlockRentalHousingMutation();
  const [completeRentalHousing, { isLoading: isCompleting }] = useCompleteRentalHousingMutation();
  
  const dispatch = useAppDispatch();
  
  // Use both sources to ensure we have the most up-to-date balance
  const currentBalance = balanceData?.total ?? useAppSelector((state) => state.balance.total);
  
  // Ensure balance is a number
  const numericBalance = typeof currentBalance === 'string' ? parseFloat(currentBalance) : currentBalance;

  // Get real data from API
  const isUnlocked = rentalHousingStatus?.isUnlocked ?? false;
  const isBuilding = rentalHousingStatus?.isBuilding ?? false;
  const buildStatus = rentalHousingStatus?.buildStatus ?? null;
  const canBuild = rentalHousingStatus?.canBuild ?? false;
  
  const RENTAL_HOUSING_COST = 100000;
  
  const hasSufficientFunds = numericBalance !== null && !isNaN(numericBalance as number) && numericBalance >= RENTAL_HOUSING_COST;

  // Update balance when build starts
  useEffect(() => {
    if (rentalHousingStatus?.buildStatus?.startedAt && !rentalHousingStatus?.buildStatus?.completesAt) {
      // Build just started, update local balance
      // Note: Balance will be updated when the unlockRentalHousing mutation completes
    }
  }, [rentalHousingStatus, dispatch]);

  const handlePress = () => {
    if (isBuilding) {
      // Do nothing during build - disabled
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
        // Update local balance
        dispatch(updateBalance({ 
          total: result.newBalance, 
          ratePerSecond: 1, 
          lastUpdated: new Date() 
        }));
        
        // Show success modal
        setShowBuildStartedModal(true);
        setShowPopup(false);
      }
    } catch (error: any) {
      console.error('Error starting rental housing build:', error);
      
      if (error?.data?.error === 'Insufficient funds') {
        setShowInsufficientFundsModal(true);
      } else if (error?.data?.error === 'Only one property can be built at a time') {
        setShowBuildErrorModal(true);
      } else {
        setShowBuildErrorModal(true);
      }
    }
  };

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleTimerComplete = useCallback(async () => {
    try {
      // Mark the build as complete in the database
      const result = await completeRentalHousing(propertyId).unwrap();
      
      if (result.success) {
        // Force a re-render to update the UI
        setForceUpdate(prev => prev + 1);
        const refetchResult = await refetch();
      }
    } catch (error: any) {
      console.error('Error completing rental housing build:', error);
      setShowCompletionErrorModal(true);
    }
  }, [propertyId, completeRentalHousing, refetch]);

  // Show loading state while fetching status
  if (statusLoading) {
    return (
      <View style={styles.rentalHousingContainer}>
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
          />
          <Text style={[styles.propertyNumber, { color: themeMode === 'light' ? '#FFFFFF' : colors.matrix }]}>{propertyId}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rentalHousingContainer}>
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
        />
        <Text style={[styles.propertyNumber, { color: themeMode === 'light' ? '#FFFFFF' : colors.matrix }]}>{propertyId}</Text>
      </View>
      
      {showTimer && (
        <DevelopmentTimer
          isBuilding={isBuilding}
          buildStatus={buildStatus}
          onComplete={handleTimerComplete}
          topOffset="120%"
          leftOffset={-50}
          width={120}
        />
      )}

      <BuildModal
        visible={showPopup}
        title="Build Rental Housing"
        cost={RENTAL_HOUSING_COST}
        buildTime="2 hours"
        hasSufficientFunds={hasSufficientFunds}
        onBuild={handleBuild}
        onClose={handleClose}
        buildButtonText="Build Rental Housing"
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
        message="You need $100,000 to build the Rental Housing."
        onClose={() => setShowInsufficientFundsModal(false)}
        closeButtonText="OK"
      />

      <LockedFeatureModal
        visible={showBuildStartedModal}
        title="BUILD STARTED"
        message="Your rental housing build has begun! Check back in 2 hours to see your completed property."
        onClose={() => setShowBuildStartedModal(false)}
        closeButtonText="OK"
      />

      <LockedFeatureModal
        visible={showBuildErrorModal}
        title="BUILD ERROR"
        message="Failed to start build. Please try again."
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
    </View>
  );
});

const styles = StyleSheet.create({
  rentalHousingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
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
});
