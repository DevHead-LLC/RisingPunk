import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BotType } from '../../types/bots';

type BotDescriptionProps = {
  type: BotType;
  userLevel?: number;
  markLevel?: 1 | 2;
};

const getBotDescription = (type: BotType) => ({
  breacher:
    'Brute-role units: high attack power and pressure, built to smash through defenses and win front-line exchanges.',
  guardian:
    'Sprint-role units: fast movement and rapid redeploy, hitting targets and repositioning before the enemy can react.',
  phreak:
    'Remote-role units: long attack distance and standoff pressure, striking from beyond typical retaliation range.',
})[type];

export const BotDescription = React.memo(function BotDescription({ type, markLevel }: BotDescriptionProps) {
  const colors = useThemeColors();
  const base = getBotDescription(type);
  const text = markLevel === 2 ? `${base} Mark II units are stronger than Mark I.` : base;

  return (
    <Text style={[styles.botDescription, { color: colors.text.placeholder }]}>{text}</Text>
  );
});

const styles = StyleSheet.create({
  botDescription: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
});
