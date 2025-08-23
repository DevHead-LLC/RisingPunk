import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { 
  DevelopmentIcon, 
  DevelopmentLabel, 
  DevelopmentTimer, 
  BuildModal 
} from './index';

type RentalHousingLocationProps = {
  onPress?: () => void;
  onNavigateToRentalHousing?: () => void;
};

export const RentalHousingLocation = memo(function RentalHousingLocation({ 
  onPress, 
  onNavigateToRentalHousing 
}: RentalHousingLocationProps) {
  const colors = useThemeColors();
  const [showPopup, setShowPopup] = useState(false);
  const { data: balanceData, isLoading: balanceLoading } = useFetchBalanceQuery();
  const dispatch = useAppDispatch();
  
  // Use both sources to ensure we have the most up-to-date balance
  const currentBalance = balanceData?.total ?? useAppSelector((state) => state.balance.total);
  
  // Ensure balance is a number
  const numericBalance = typeof currentBalance === 'string' ? parseFloat(currentBalance) : currentBalance;

  // TODO: Replace with actual API calls when implemented
  const isUnlocked = false; // Will come from API
  const isBuilding = false; // Will come from API
  const buildStatus = null; // Will come from API
  const RENTAL_HOUSING_COST = 100000;
  
  const hasSufficientFunds = numericBalance !== null && !isNaN(numericBalance as number) && numericBalance >= RENTAL_HOUSING_COST;

  const handlePress = () => {
    if (isBuilding) {
      // Do nothing during build - disabled
      return;
    } else if (isUnlocked) {
      if (onNavigateToRentalHousing) onNavigateToRentalHousing();
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
        'You need $100,000 to build the Rental Housing.',
        [{ text: 'OK' }]
      );
      return;
    }

    // TODO: Implement actual build logic when API is ready
    Alert.alert(
      'Build Started',
      'Rental Housing build will be implemented in Phase 4.',
      [{ text: 'OK' }]
    );
    setShowPopup(false);
  };

  const handleClose = () => {
    setShowPopup(false);
  };

  const handleTimerComplete = () => {
    // TODO: Implement timer completion logic when API is ready
    console.log('Rental Housing build completed');
  };

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
        <Text style={styles.propertyNumber}>1</Text>
      </View>
      

      
      <DevelopmentTimer
        isBuilding={isBuilding}
        buildStatus={buildStatus}
        onComplete={handleTimerComplete}
        topOffset="120%"
        leftOffset={-50}
        width={120}
      />

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
