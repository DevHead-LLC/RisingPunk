import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useSpeedupBotBuildMutation, useFetchBuildStateQuery } from '../../store/api/botsApi';
import { updateBalance } from '../../store/slices/balanceSlice';
import { useFetchBalanceQuery } from '../../store/api/balanceApi';
import { setBots, setBuildState } from '../../store/slices/botsSlice';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';
import { projectBuildQueueProgress } from '../../utils/botBuildProjection';
type BuildSectionProps = {
  selectedType: BotType | null;
  /** Header line (e.g. BRUTE, BREACHER, NO BOT SELECTED). */
  selectionLabel: string;
  /** Type row in the cost summary (matches selection or active build). */
  statusTypeLabel: string;
  selectedMarkLevel: 1 | 2;
  buildingProgress: number | null;
  quantity: string;
  onQuantityChange: (value: string) => void;
  onBuild: () => void;
  botCost: number;
  highlightQuantityInput?: boolean;
  highlightBuildButton?: boolean;
  highlightSpeedupButton?: boolean;
  isInputDisabled?: boolean;
};

export const BuildSection = React.memo(function BuildSection({
  selectedType,
  selectionLabel,
  statusTypeLabel,
  selectedMarkLevel,
  buildingProgress,
  quantity,
  onQuantityChange,
  onBuild,
  botCost,
  highlightQuantityInput = false,
  highlightBuildButton = false,
  highlightSpeedupButton = false,
  isInputDisabled = false,
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
  const { clearHighlight } = useTaskGuideHighlight();

  // Bugbot: flagged as duplicate subscription vs AppContent's polling query. Not a bug —
  // RTK Query deduplicates on cache key; this hook only provides refetch for timer-completion.
  const token = useAppSelector((state) => state.auth.token);
  const { refetch: refetchBuildState } = useFetchBuildStateQuery(undefined, {
    skip: !token,
  });

  /** Re-render often while building so wall-clock progress matches the bar and timer. */
  const [buildUiTick, setBuildUiTick] = useState(0);
  useEffect(() => {
    if (buildingProgress === null) {
      return;
    }
    const id = setInterval(() => setBuildUiTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [buildingProgress]);

  const timeRemainingMs = useMemo(() => {
    if (!buildQueue?.completesAt) {
      return 0;
    }
    return Math.max(0, new Date(buildQueue.completesAt).getTime() - Date.now());
  }, [buildQueue?.completesAt, buildUiTick]);

  const smoothBuildProgress = useMemo(() => {
    if (buildingProgress === null) {
      return 0;
    }
    if (!buildQueue?.completesAt || !buildQueue?.startedAt) {
      return buildingProgress;
    }
    const start = new Date(buildQueue.startedAt).getTime();
    const end = new Date(buildQueue.completesAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return buildingProgress;
    }
    const now = Date.now();
    if (now >= end) {
      return 100;
    }
    return Math.min(100, ((now - start) / (end - start)) * 100);
  }, [buildQueue, buildingProgress, buildUiTick]);

  const projectedBuiltCount = useMemo(() => {
    if (!buildQueue) {
      return undefined;
    }
    return projectBuildQueueProgress(buildQueue, timeRemainingMs)?.projectedBuilt ?? 0;
  }, [buildQueue, timeRemainingMs]);

  const completionRefetchFired = useRef(false);
  useEffect(() => {
    completionRefetchFired.current = false;
  }, [buildQueue?.startedAt, buildQueue?.completesAt]);

  useEffect(() => {
    if (buildingProgress === null) {
      return;
    }
    if (timeRemainingMs <= 0 && !completionRefetchFired.current) {
      completionRefetchFired.current = true;
      void refetchBuildState();
    }
  }, [timeRemainingMs, buildingProgress, refetchBuildState]);

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
        
        // Close modal and clear highlight if this was part of build-100-guardians task
        setShowSpeedupModal(false);
        if (highlightSpeedupButton) {
          clearHighlight();
        }
      } else {
        // Handle case where API returns success: false (HTTP 200 but operation failed)
        setShowSpeedupModal(false);
        const errorMsg =
          result.message || result.error || 'Failed to speed up bot build. Please try again.';
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
  }, [speedupBotBuild, dispatch, currentBalanceState, highlightSpeedupButton, clearHighlight]);

  return (
    <View style={[styles.buildSection, { borderLeftColor: colors.matrix + '20' }, isInputDisabled && { pointerEvents: 'none' }]}>
      <Text style={[styles.buildTitle, { color: colors.secondary }]}>BUILD CONTROLS</Text>

      <View style={styles.selectedBotInfo}>
        <Text style={[styles.selectedBot, { color: colors.text.primary }]}>{selectionLabel}</Text>
        {selectedType && <BotDescription type={selectedType} markLevel={selectedMarkLevel} />}
      </View>

      <BuildControls
        selectedType={selectedType}
        buildingProgress={buildingProgress}
        quantity={quantity}
        onQuantityChange={onQuantityChange}
        onBuild={onBuild}
        onSpeedup={buildingProgress !== null ? () => setShowSpeedupModal(true) : undefined}
        highlightQuantityInput={highlightQuantityInput}
        highlightBuildButton={highlightBuildButton}
        highlightSpeedupButton={highlightSpeedupButton}
      />

      <BuildStatus typeLabel={statusTypeLabel} quantity={quantity} botCost={botCost} />

      {buildingProgress !== null && (
        <>
          <BuildTimer
            progress={smoothBuildProgress}
            timeRemainingMs={timeRemainingMs}
            totalBuildQuantity={totalBuildQuantity}
            botsBuilt={projectedBuiltCount}
          />
          <BuildProgressBar progress={smoothBuildProgress} />
        </>
      )}

      {buildingProgress !== null && buildQueue?.completesAt && (
        <SpeedupModal
          visible={showSpeedupModal}
          secondsRemaining={getSecondsRemaining()}
          currentBalance={numericBalance || 0}
          itemType="build"
          onSpeedup={handleSpeedup}
          storageSpeedupDomain="bot_assembly"
          onStorageSpeedupApplied={async () => {
            await refetchBuildState();
          }}
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
