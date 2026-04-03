import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectBotSlot } from '../store/slices/botsSlice';
import { useStartBuildMutation } from '../store/api/botsApi';
import { useGetUserFeaturesQuery } from '../store/api/researchFeaturesApi';
import { MARK2_DISPLAY_NAMES, costPerBotForMark } from '../utils/botInventory';
import type { BotType } from '../types/bots';
import { SIZING } from '../styles/theme';
import { useResponsiveDimensions } from '../hooks/useResponsiveDimensions';
import { useThemeColors } from '../hooks/useThemeColors';
import { LevelSection } from '../components/botAssembly/LevelSection';
import { BuildSection } from '../components/botAssembly/BuildSection';
import { BotAssemblyHeader } from '../components/botAssembly/BotAssemblyHeader';
import { TaskGuideHighlightOverlay } from '../components/turf/TaskGuideHighlightOverlay';
import { useTaskGuideHighlight } from '../contexts/TaskGuideHighlightContext';
import { HackExpeditionCommitmentBanner } from '../components/common/HackExpeditionCommitmentBanner';

const LEVELS = [1, 2, 3, 4];

/** M3/M4 columns are locked placeholders — no inventory keys yet; must not reuse Mark I counts. */
const ZERO_BOT_COUNTS: Record<BotType, number> = { breacher: 0, guardian: 0, phreak: 0 };

export function BotAssemblyScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const dispatch = useAppDispatch();
  const bots = useAppSelector((state) => state.bots);
  const [quantity, setQuantity] = useState('1');
  const [startBuild] = useStartBuildMutation();
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability');
  const mark2ResearchUnlocked =
    hackAbilityFeatures?.some((f: { id?: string; isUnlocked?: boolean }) => f.id === 'mark-2-bots' && f.isUnlocked) ??
    false;
  const { isSmallDevice } = useResponsiveDimensions();
  const colors = useThemeColors();
  const { highlightTaskId, highlightStep, clearHighlight, advanceHighlightStep } = useTaskGuideHighlight();
  
  const isBuildGuardians = highlightTaskId === 'build-100-guardians';
  const isGuardianSelectionHighlight = isBuildGuardians && highlightStep === 'guardian-selection';
  const isQuantityInputHighlight = isBuildGuardians && highlightStep === 'quantity-input';
  const isBuildButtonHighlight = isBuildGuardians && highlightStep === 'build-button';
  const isSpeedupButtonHighlight = isBuildGuardians && highlightStep === 'speedup-button';

  const handleBuild = useCallback(() => {
    if (!bots.selectedType) {
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return;
    }
    const ml: 1 | 2 = bots.selectedMarkLevel === 2 ? 2 : 1;
    const unit = costPerBotForMark(ml);
    const totalCost = qty * unit;
    startBuild({
      type: bots.selectedType,
      quantity: qty,
      totalCost,
      markLevel: ml,
    });
    if (isBuildButtonHighlight) {
      clearHighlight();
    }
  }, [bots.selectedType, bots.selectedMarkLevel, quantity, startBuild, isBuildButtonHighlight, clearHighlight]);

  const handleQuantityChange = useCallback((value: string) => {
    setQuantity(value);
    if (isQuantityInputHighlight && value === '100') {
      advanceHighlightStep();
    }
  }, [isQuantityInputHighlight, advanceHighlightStep]);

  const advanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isQuantityInputHighlight && quantity !== '100') {
      setQuantity('100');
    }
  }, [isQuantityInputHighlight, quantity]);

  useEffect(() => {
    if (isQuantityInputHighlight && quantity === '100') {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
      advanceTimerRef.current = setTimeout(() => {
        advanceHighlightStep();
        advanceTimerRef.current = null;
      }, 100);
    }
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [isQuantityInputHighlight, quantity, advanceHighlightStep]);
  
  const handleSelectBotType = useCallback(
    (type: BotType, markLevel: 1 | 2) => {
      dispatch(selectBotSlot({ type, markLevel }));
      if (isGuardianSelectionHighlight && type === 'guardian' && markLevel === 1) {
        advanceHighlightStep();
      }
    },
    [dispatch, isGuardianSelectionHighlight, advanceHighlightStep]
  );

  const effectiveType =
    bots.buildingProgress !== null ? bots.buildQueue?.type ?? bots.selectedType : bots.selectedType;
  const effectiveMark: 1 | 2 =
    bots.buildingProgress !== null ? (bots.buildQueue?.markLevel === 2 ? 2 : 1) : bots.selectedMarkLevel;

  const selectionLabel =
    !effectiveType
      ? 'NO BOT SELECTED'
      : effectiveMark === 2
        ? MARK2_DISPLAY_NAMES[effectiveType].toUpperCase()
        : effectiveType.toUpperCase();

  const statusTypeLabel =
    !effectiveType ? 'N/A' : effectiveMark === 2
      ? MARK2_DISPLAY_NAMES[effectiveType].toUpperCase()
      : effectiveType.toUpperCase();

  const botCost = costPerBotForMark(effectiveMark);

  const levelSections = useMemo(
    () =>
      LEVELS.map((level) => (
        <LevelSection
          key={level}
          markColumnLevel={level}
          selectedType={bots.selectedType}
          selectedMarkLevel={bots.selectedMarkLevel}
          botCounts={level === 2 ? bots.botCountsM2 : level === 1 ? bots.botCounts : ZERO_BOT_COUNTS}
          onSelectBotType={handleSelectBotType}
          highlightGuardian={isGuardianSelectionHighlight && level === 1}
          mark2ResearchUnlocked={mark2ResearchUnlocked}
        />
      )),
    [
      bots.selectedType,
      bots.selectedMarkLevel,
      bots.botCounts,
      bots.botCountsM2,
      handleSelectBotType,
      isGuardianSelectionHighlight,
      mark2ResearchUnlocked,
    ]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ zIndex: isBuildGuardians ? 3 : 1000, pointerEvents: isBuildGuardians ? 'none' : 'auto' }}>
        <BotAssemblyHeader onClose={onClose} />
      </View>
      <HackExpeditionCommitmentBanner />
      <KeyboardAvoidingView 
        style={[styles.keyboardAvoidingView, (isGuardianSelectionHighlight || isBuildButtonHighlight) && { zIndex: 1001 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (isSmallDevice ? 40 : 60) : 20}
      >
        <View style={styles.content}>
          <ScrollView 
            style={styles.botSelection}
            contentContainerStyle={isSmallDevice ? styles.smallDeviceContent : undefined}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isGuardianSelectionHighlight && !isBuildButtonHighlight}
            pointerEvents={isBuildButtonHighlight ? 'none' : 'auto'}
          >
            {levelSections}
          </ScrollView>
          <View style={styles.buildSectionWrap}>
            <BuildSection
              selectedType={
                bots.buildingProgress !== null ? bots.buildQueue?.type || bots.selectedType : bots.selectedType
              }
              selectionLabel={selectionLabel}
              statusTypeLabel={statusTypeLabel}
              selectedMarkLevel={effectiveMark}
              buildingProgress={bots.buildingProgress}
              quantity={quantity}
              onQuantityChange={handleQuantityChange}
              onBuild={handleBuild}
              botCost={botCost}
              highlightQuantityInput={isQuantityInputHighlight}
              highlightBuildButton={isBuildButtonHighlight}
              highlightSpeedupButton={isSpeedupButtonHighlight}
              isInputDisabled={isGuardianSelectionHighlight}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      {isBuildGuardians && (
        <TaskGuideHighlightOverlay 
          forGuardianSelection={isGuardianSelectionHighlight}
          forQuantityInput={isQuantityInputHighlight}
          forBuildButton={isBuildButtonHighlight}
          forSpeedupButton={isSpeedupButtonHighlight}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  buildSectionWrap: {
    flex: 1,
  },
  botSelection: {
    flex: 0.35,
    padding: SIZING.spacing.lg,
  },
  smallDeviceContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  levelSection: {
    marginVertical: SIZING.spacing.md,
  },
  levelTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    letterSpacing: 1,
  },
  botGrid: {
    flexDirection: 'column',
    gap: SIZING.spacing.sm,
  },
  botCard: {
    width: '100%',
    padding: SIZING.spacing.md,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  botCardLocked: {
    opacity: 0.5,
  },
  botCardSelected: {
    borderWidth: 2,
  },
  botType: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  botDescription: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
  botCount: {
    fontSize: SIZING.font.small,
  },
  buildInfo: {
    gap: SIZING.spacing.md,
  },
  progressTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    letterSpacing: 1,
  },
  progressDetails: {
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.sm,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: SIZING.spacing.xs,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  estimatedTime: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
    marginTop: SIZING.spacing.xs,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  buildProgress: {
    marginTop: SIZING.spacing.md,
    padding: SIZING.spacing.sm,
    borderRadius: 4,
  },
  selectedBotInfo: {
    marginBottom: SIZING.spacing.sm,
  },
  buildControlsRow: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.xs,
  },
  costText: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZING.spacing.xs,
  },
  statusLabel: {
    fontSize: SIZING.font.small,
  },
  statusValue: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  buildStatus: {
    borderRadius: 4,
    padding: SIZING.spacing.sm,
  },
  fixedControls: {
    padding: SIZING.spacing.md,
    borderBottomWidth: 1,
  },
  statusScroll: {
    flex: 1,
    padding: SIZING.spacing.md,
  },
  buildScroll: {
    flex: 1,
    padding: SIZING.spacing.lg,
  },
  lockedText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  botCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});
