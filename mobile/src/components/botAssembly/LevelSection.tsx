import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BotTypeCard } from './BotTypeCard';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BotType } from '../../types/bots';
import { BOT_FAMILY_ORDER, MARK2_DISPLAY_NAMES } from '../../utils/botInventory';

type LevelSectionProps = {
  /** 1 = Mark I column, 2 = Mark II, 3–4 = future marks (locked). */
  markColumnLevel: number;
  selectedType: BotType | null;
  selectedMarkLevel: 1 | 2;
  botCounts: Record<BotType, number>;
  onSelectBotType: (type: BotType, markLevel: 1 | 2) => void;
  highlightGuardian?: boolean;
  mark2ResearchUnlocked: boolean;
};

export const LevelSection = React.memo(function LevelSection({
  markColumnLevel,
  selectedType,
  selectedMarkLevel,
  botCounts,
  onSelectBotType,
  highlightGuardian = false,
  mark2ResearchUnlocked,
}: LevelSectionProps) {
  const isMark2Column = markColumnLevel === 2;
  const isLocked =
    markColumnLevel > 2 || (isMark2Column && !mark2ResearchUnlocked);
  const colors = useThemeColors();

  return (
    <View style={styles.levelSection}>
      <Text style={[styles.levelTitle, { color: colors.secondary }]}>MARK {markColumnLevel}</Text>
      <View style={styles.botGrid}>
        {BOT_FAMILY_ORDER.map((type) => {
          const isHighlighted = highlightGuardian && type === 'guardian' && markColumnLevel === 1;
          const isOtherBotType = highlightGuardian && type !== 'guardian' && markColumnLevel === 1;
          const displayLabel = isMark2Column ? MARK2_DISPLAY_NAMES[type] : undefined;
          return (
            <View key={`${type}-${markColumnLevel}`} style={styles.botContainer}>
              <BotTypeCard
                type={type}
                displayLabel={displayLabel}
                _level={markColumnLevel}
                isLocked={isLocked}
                isSelected={
                  !isLocked && selectedType === type && selectedMarkLevel === (isMark2Column ? 2 : 1)
                }
                count={botCounts[type]}
                onPress={() => !isLocked && onSelectBotType(type, isMark2Column ? 2 : 1)}
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
