import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BotTypeCard } from './BotTypeCard';
import { COLORS, SIZING } from '../../styles/theme';

type BotType = 'breacher' | 'guardian' | 'phreak';

type LevelSectionProps = {
  level: number;
  selectedType: BotType | null;
  botCounts: Record<BotType, number>;
  onSelectBotType: (type: BotType) => void;
};

export const LevelSection = React.memo(function LevelSection({
  level,
  selectedType,
  botCounts,
  onSelectBotType
}: LevelSectionProps) {
  return (
    <View style={styles.levelSection}>
      <Text style={styles.levelTitle}>MARK {level}</Text>
      <View style={styles.botGrid}>
        {(['breacher', 'guardian', 'phreak'] as BotType[]).map((type) => (
          <BotTypeCard
            key={`${type}-${level}`}
            type={type}
            level={level}
            isLocked={level > 1}
            isSelected={selectedType === type && level === 1}
            count={botCounts[type]}
            onPress={() => level === 1 && onSelectBotType(type)}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  levelSection: {
    marginBottom: SIZING.spacing.lg,
  },
  levelTitle: {
    color: '#4717F6',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  botGrid: {
    gap: SIZING.spacing.sm,
  }
}); 