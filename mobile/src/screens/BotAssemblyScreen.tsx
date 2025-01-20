import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
} from 'react-native';
import { Balance } from '../components/common/Balance';
import { CloseButton } from '../components/common/CloseButton';
import { BotTypeCard } from '../components/botAssembly/BotTypeCard';
import { useBots } from '../context/BotsContext';
import { useBalance } from '../context/BalanceContext';
import { COLORS, SIZING } from '../styles/theme';
import { LevelSection } from '../components/botAssembly/LevelSection';
import { BuildProgressBar } from '../components/botAssembly/BuildProgressBar';
import { BuildStatus } from '../components/botAssembly/BuildStatus';
import { BuildControls } from '../components/botAssembly/BuildControls';
import { BuildSection } from '../components/botAssembly/BuildSection';
import { BotAssemblyHeader } from '../components/botAssembly/BotAssemblyHeader';

type BotType = 'breacher' | 'guardian' | 'phreak';
type BotLevel = 1 | 2 | 3 | 4;

interface BotTypeCard {
  type: BotType;
  level: BotLevel;
  available: boolean;
}

const LEVELS = [1, 2, 3, 4];

export function BotAssemblyScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { botCounts, buildingProgress, selectedType, selectBotType, startBuilding } = useBots();
  const [quantity, setQuantity] = useState('1');
  const BOT_COST = 1;

  const handleBuild = useCallback(() => {
    if (!selectedType) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return;
    startBuilding(selectedType, qty);
  }, [selectedType, quantity, startBuilding]);

  const handleQuantityChange = useCallback((value: string) => {
    setQuantity(value);
  }, []);

  const levelSections = useMemo(() => (
    LEVELS.map((level) => (
      <LevelSection
        key={level}
        level={level}
        selectedType={selectedType}
        botCounts={botCounts}
        onSelectBotType={selectBotType}
      />
    ))
  ), [selectedType, botCounts, selectBotType]);

  return (
    <SafeAreaView style={styles.container}>
      <BotAssemblyHeader onClose={onClose} />
      <View style={styles.content}>
        <ScrollView style={styles.botSelection}>
          {levelSections}
        </ScrollView>
        <BuildSection
          selectedType={selectedType}
          buildingProgress={buildingProgress}
          quantity={quantity}
          onQuantityChange={handleQuantityChange}
          onBuild={handleBuild}
          botCost={BOT_COST}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  title: {
    color: COLORS.text.primary,
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
  levelSection: {
    marginVertical: SIZING.spacing.md,
  },
  levelTitle: {
    color: '#4717F6',
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
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  botCardLocked: {
    opacity: 0.5,
    backgroundColor: 'rgba(26, 77, 51, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  botCardSelected: {
    backgroundColor: 'rgba(26, 77, 51, 0.6)',
    borderColor: 'rgba(0, 255, 65, 0.8)',
  },
  botType: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  botDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
  botCount: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
  },
  buildSection: {
    flex: 1.5,
    padding: SIZING.spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0, 255, 65, 0.2)',
  },
  buildInfo: {
    gap: SIZING.spacing.md,
  },
  buildTitle: {
    color: '#4717F6',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  selectedBot: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.xs,
  },
  quantityInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
    color: COLORS.text.primary,
    textAlign: 'center',
    fontSize: SIZING.font.body,
  },
  buildButton: {
    width: 80,
    height: 40,
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
  },
  buildButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(26, 77, 51, 0.4)',
  },
  buildButtonText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressTitle: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    letterSpacing: 1,
  },
  progressDetails: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: SIZING.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(0, 255, 65, 0.6)',
  },
  progressText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  estimatedTime: {
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(26, 77, 51, 0.2)',
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
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZING.spacing.xs,
  },
  statusLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
  },
  statusValue: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  buildStatus: {
    backgroundColor: 'rgba(26, 77, 51, 0.1)',
    borderRadius: 4,
    padding: SIZING.spacing.sm,
  },
  fixedControls: {
    padding: SIZING.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 65, 0.1)',
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
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  botCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}); 