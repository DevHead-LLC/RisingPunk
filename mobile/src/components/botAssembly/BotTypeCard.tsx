import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type BotTypeCardProps = {
  type: string;
  _level: number;
  isLocked: boolean;
  isSelected: boolean;
  count?: number;
  onPress: () => void;
};

export const BotTypeCard = React.memo(function BotTypeCard({
  type,
  _level,
  isLocked,
  isSelected,
  count,
  onPress,
}: BotTypeCardProps) {
  const colors = useThemeColors();

  const cardContent = (
    <View style={styles.botCardContent}>
      <Text style={[styles.botType, { color: colors.text.primary }]}>{type.toUpperCase()}</Text>
      {!isLocked ? (
        <Text style={[styles.botCount, { color: colors.text.placeholder }]}>
          Owned: {count}
        </Text>
      ) : (
        <Text style={[styles.lockedText, { color: colors.text.placeholder }]}>🔒 LOCKED</Text>
      )}
    </View>
  );

  if (isLocked) {
    return (
      <View
        style={[
          styles.botCard,
          styles.botCardLocked,
          {
            backgroundColor: colors.accent + '20',
            borderColor: colors.text.placeholder + '40',
          }
        ]}
      >
        {cardContent}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.botCard,
        isSelected && styles.botCardSelected,
        {
          backgroundColor: colors.accent + '30',
          borderColor: colors.matrix + '40',
        },
        isSelected && {
          backgroundColor: colors.accent + '60',
          borderColor: colors.matrix + '80',
        }
      ]}
      onPress={onPress}
    >
      {cardContent}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
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
  botCount: {
    fontSize: SIZING.font.small,
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
});
