import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';
import { BotType } from '../../types/bots';

type BotDescriptionProps = {
  type: BotType;
};

const getBotDescription = (type: BotType) => ({
  breacher: 'Fast-moving assault units, specialized in penetrating network defenses',
  guardian: 'Heavy defensive units, forming the backbone of your digital army',
  phreak: 'Long-range disruption specialists, attacking from network shadows'
})[type];

export const BotDescription = React.memo(function BotDescription({ type }: BotDescriptionProps) {
  return (
    <Text style={styles.botDescription}>
      {getBotDescription(type)}
    </Text>
  );
});

const styles = StyleSheet.create({
  botDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
}); 