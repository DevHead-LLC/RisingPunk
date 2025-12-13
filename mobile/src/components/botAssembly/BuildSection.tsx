import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BotType } from '../../types/bots';
import { BuildControls } from './BuildControls';
import { BuildStatus } from './BuildStatus';
import { BuildProgressBar } from './BuildProgressBar';
import { BotDescription } from './BotDescription';
import { BuildTimer } from './BuildTimer';
import { SpeedupModal } from '../common/SpeedupModal';
import { LockedFeatureModal } from '../turf/LockedFeatureModal';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useSpeedupBotBuildMutation } from '../../store/api/botsApi';
import { updateBalance } from '../../store/slices/balanceSlice';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { setBots, setBuildState } from '../../store/slices/botsSlice';

type BuildSectionProps = {
  selectedType: BotType | null;
  buildingProgress: number | null;
  quantity: string;
  onQuantityChange: (value: string) => void;
  onBuild: () => void;
  botCost: number;
};

export const BuildSection = React.memo(function BuildSection({
  selectedType,
  buildingProgress,
  quantity,
  onQuantityChange,
  onBuild,
  botCost,
}: BuildSectionProps) {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const [showSpeedupModal, setShowSpeedupModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const buildQueue = useAppSelector((state) => state.bots.buildQueue);
  const buildStartTime = useAppSelector((state) => state.bots.buildStartTime);
  const totalBuildQuantity = useAppSelector((state) => state.bots.totalBuildQuantity);
  const currentBalanceState = useAppSelector((state) => state.balance);
  const { data: balanceData } = useFetchBalanceQuery();
  const reduxBalance = useAppSelector((state) => state.balance.total);
  const [speedupBotBuild] = useSpeedupBotBuildMutation();

  const currentBalance = balanceData?.total ?? reduxBalance;
  const numericBalance = typeof currentBalance === 'string' ? parseFloat(currentBalance) : currentBalance;

  // Calculate seconds remaining for speedup
  const getSecondsRemaining = (): number => {
    if (!buildQueue?.completesAt || !buildStartTime) {
      return 0;
    }
    const now = new Date().getTime();
    const completesAt = new Date(buildQueue.completesAt).getTime();
    return Math.max(0, completesAt - now);
  };

  const handleSpeedup = useCallback(async () => {
    try {
      const result = await speedupBotBuild().unwrap();
      
      if (result.success) {
        // Update balance if provided
        if (result.newBalance !== undefined) {
          dispatch(updateBalance({
            total: result.newBalance,
            ratePerSecond: currentBalanceState.ratePerSecond,
            lastUpdated: currentBalanceState.lastUpdated ? new Date(currentBalanceState.lastUpdated) : null,
            fractionalRemainder: currentBalanceState.fractionalRemainder
          }));
        }
        
        // Update bot counts and clear build state
        if (result.bots) {
          dispatch(setBots(result.bots));
          dispatch(setBuildState({ buildQueue: null, bots: result.bots }));
        }
        
        // Close modal
        setShowSpeedupModal(false);
      } else {
        // Handle case where API returns success: false (HTTP 200 but operation failed)
        setShowSpeedupModal(false);
        const errorMsg = result.message || result.error || 'Failed to speed up bot build. Please try again.';
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error('Error speeding up bot build:', error);
      // Close speedup modal and show error modal instead
      setShowSpeedupModal(false);
      // Note: speedup-build endpoint returns { error: '...' }
      if (error?.data?.error === 'Insufficient funds') {
        setErrorMessage('You do not have sufficient funds to speed up this bot build.');
      } else {
        const errorMsg = error?.data?.error || error?.data?.message || 'Failed to speed up bot build. Please try again.';
        setErrorMessage(errorMsg);
      }
      setShowErrorModal(true);
    }
  }, [speedupBotBuild, dispatch, currentBalanceState]);

  return (
    <View style={[styles.buildSection, { borderLeftColor: colors.matrix + '20' }]}>
      <Text style={[styles.buildTitle, { color: colors.secondary }]}>BUILD CONTROLS</Text>

      <View style={styles.selectedBotInfo}>
        <Text style={[styles.selectedBot, { color: colors.text.primary }]}>
          {selectedType ? selectedType.toUpperCase() : 'NO BOT SELECTED'}
        </Text>
        {selectedType && <BotDescription type={selectedType} />}
      </View>

      <BuildControls
        selectedType={selectedType}
        buildingProgress={buildingProgress}
        quantity={quantity}
        onQuantityChange={onQuantityChange}
        onBuild={onBuild}
        onSpeedup={buildingProgress !== null ? () => setShowSpeedupModal(true) : undefined}
      />

      <BuildStatus
        selectedType={selectedType}
        quantity={quantity}
        botCost={botCost}
      />

      {buildingProgress !== null && (
        <>
          <BuildTimer
            _quantity={parseInt(quantity) || 0}
            buildTimePerUnit={1000}
            progress={buildingProgress}
          />
          <BuildProgressBar progress={buildingProgress} />
        </>
      )}

      {buildingProgress !== null && buildQueue?.completesAt && (
        <SpeedupModal
          visible={showSpeedupModal}
          secondsRemaining={getSecondsRemaining()}
          currentBalance={numericBalance || 0}
          itemType="build"
          onSpeedup={handleSpeedup}
          onClose={() => setShowSpeedupModal(false)}
        />
      )}

      <LockedFeatureModal
        visible={showErrorModal}
        title="SPEEDUP ERROR"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        closeButtonText="CLOSE"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  buildSection: {
    flex: 1.5,
    padding: SIZING.spacing.lg,
    borderLeftWidth: 1,
  },
  buildTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  selectedBotInfo: {
    marginBottom: SIZING.spacing.sm,
  },
  selectedBot: {
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.xs,
  },
});
