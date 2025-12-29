import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectBotType } from '../store/slices/botsSlice';
import { useStartBuildMutation } from '../store/api/botsApi';
import { SIZING } from '../styles/theme';
import { useResponsiveDimensions } from '../hooks/useResponsiveDimensions';
import { useThemeColors } from '../hooks/useThemeColors';
import { LevelSection } from '../components/botAssembly/LevelSection';
import { BuildSection } from '../components/botAssembly/BuildSection';
import { BotAssemblyHeader } from '../components/botAssembly/BotAssemblyHeader';
import { TaskGuideHighlightOverlay } from '../components/turf/TaskGuideHighlightOverlay';
import { useTaskGuideHighlight } from '../contexts/TaskGuideHighlightContext';

type BotType = 'breacher' | 'guardian' | 'phreak';

const LEVELS = [1, 2, 3, 4];

export function BotAssemblyScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const dispatch = useAppDispatch();
  const bots = useAppSelector((state) => state.bots);
  const [quantity, setQuantity] = useState('1');
  const [startBuild] = useStartBuildMutation();
  const BOT_COST = 1;
  const { isSmallDevice, scaleFactor } = useResponsiveDimensions();
  const colors = useThemeColors();
  const { highlightTaskId, highlightStep, clearHighlight, advanceHighlightStep } = useTaskGuideHighlight();
  
  const isBuildGuardians = highlightTaskId === 'build-100-guardians';
  const isGuardianSelectionHighlight = isBuildGuardians && highlightStep === 'guardian-selection';
  const isQuantityInputHighlight = isBuildGuardians && highlightStep === 'quantity-input';
  const isBuildButtonHighlight = isBuildGuardians && highlightStep === 'build-button';
  const isSpeedupButtonHighlight = isBuildGuardians && highlightStep === 'speedup-button';

  const handleBuild = useCallback(() => {
    if (!bots.selectedType) {return;}
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {return;}
    startBuild({ type: bots.selectedType, quantity: qty, totalCost: qty });
    if (isBuildButtonHighlight) {
      clearHighlight();
    }
  }, [bots.selectedType, quantity, startBuild, isBuildButtonHighlight, clearHighlight]);

  const handleQuantityChange = useCallback((value: string) => {
    setQuantity(value);
    if (isQuantityInputHighlight && value === '100') {
      advanceHighlightStep();
    }
  }, [isQuantityInputHighlight, advanceHighlightStep]);

  useEffect(() => {
    if (isQuantityInputHighlight && quantity !== '100') {
      setQuantity('100');
      const timer = setTimeout(() => {
        advanceHighlightStep();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isQuantityInputHighlight, quantity, advanceHighlightStep]);
  
  const handleSelectBotType = useCallback((type: BotType) => {
    dispatch(selectBotType(type));
    if (isGuardianSelectionHighlight && type === 'guardian') {
      advanceHighlightStep();
    }
  }, [dispatch, isGuardianSelectionHighlight, advanceHighlightStep]);

  const userLevel = 1;

  const levelSections = useMemo(() => (
    LEVELS.map((level) => (
      <LevelSection
        key={level}
        level={level}
        selectedType={bots.selectedType}
        botCounts={bots.botCounts}
        userLevel={userLevel}
        onSelectBotType={handleSelectBotType}
        highlightGuardian={isGuardianSelectionHighlight && level === 1}
      />
    ))
  ), [bots.selectedType, bots.botCounts, userLevel, handleSelectBotType, isGuardianSelectionHighlight]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ zIndex: isBuildGuardians ? 3 : 1000, pointerEvents: isBuildGuardians ? 'none' : 'auto' }}>
        <BotAssemblyHeader onClose={onClose} />
      </View>
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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={isGuardianSelectionHighlight || isBuildButtonHighlight}>
            <BuildSection
              selectedType={bots.buildingProgress !== null ? bots.buildQueue?.type || bots.selectedType : bots.selectedType}
              buildingProgress={bots.buildingProgress}
              quantity={quantity}
              onQuantityChange={handleQuantityChange}
              onBuild={handleBuild}
              botCost={BOT_COST}
              highlightQuantityInput={isQuantityInputHighlight}
              highlightBuildButton={isBuildButtonHighlight}
              highlightSpeedupButton={isSpeedupButtonHighlight}
              isInputDisabled={isGuardianSelectionHighlight}
            />
          </TouchableWithoutFeedback>
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
