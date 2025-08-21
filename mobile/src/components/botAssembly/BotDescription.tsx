import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BotType } from '../../types/bots';

type BotDescriptionProps = {
  type: BotType;
  userLevel?: number;
};

const getBotDescription = (type: BotType) => ({
  breacher: 'Fast-moving assault units, specialized in penetrating network defenses',
  guardian: 'Heavy defensive units, forming the backbone of your digital army',
  phreak: 'Long-range disruption specialists, attacking from network shadows',
})[type];

export const BotDescription = React.memo(function BotDescription({ type }: BotDescriptionProps) {
  const colors = useThemeColors();

  return (
    <Text style={[styles.botDescription, { color: colors.text.placeholder }]}>{getBotDescription(type)}</Text>
  );
});

const styles = StyleSheet.create({
  botDescription: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
});
