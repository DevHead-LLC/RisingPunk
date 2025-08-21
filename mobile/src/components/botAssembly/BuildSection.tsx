import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BotType } from '../../types/bots';
import { BuildControls } from './BuildControls';
import { BuildStatus } from './BuildStatus';
import { BuildProgressBar } from './BuildProgressBar';
import { BotDescription } from './BotDescription';
import { BuildTimer } from './BuildTimer';

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
