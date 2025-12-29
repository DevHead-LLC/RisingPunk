import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BotTypeCard } from './BotTypeCard';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type BotType = 'breacher' | 'guardian' | 'phreak';

type LevelSectionProps = {
  level: number;
  selectedType: BotType | null;
  botCounts: Record<BotType, number>;
  userLevel: number;
  onSelectBotType: (type: BotType) => void;
  highlightGuardian?: boolean;
};

export const LevelSection = React.memo(function LevelSection({
  level,
  selectedType,
  botCounts,
  userLevel,
  onSelectBotType,
  highlightGuardian = false,
}: LevelSectionProps) {
  const isLocked = level > 1; // Marks 2-4 are locked for now
  const colors = useThemeColors();

  return (
    <View style={styles.levelSection}>
      <Text style={[styles.levelTitle, { color: colors.secondary }]}>MARK {level}</Text>
      <View style={styles.botGrid}>
        {(['breacher', 'guardian', 'phreak'] as BotType[]).map((type) => {
          const isHighlighted = highlightGuardian && type === 'guardian';
          const isOtherBotType = highlightGuardian && type !== 'guardian';
          return (
            <View key={`${type}-${level}`} style={styles.botContainer}>
              <BotTypeCard
                type={type}
                _level={level}
                isLocked={isLocked}
                isSelected={!isLocked && selectedType === type}
                count={botCounts[type]}
                onPress={() => !isLocked && onSelectBotType(type)}
                isHighlighted={isHighlighted}
                isDisabled={isOtherBotType}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  levelSection: {
    marginBottom: SIZING.spacing.lg,
  },
  levelTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  botGrid: {
    gap: SIZING.spacing.sm,
  },
  botContainer: {
    marginBottom: SIZING.spacing.sm,
  },
});
