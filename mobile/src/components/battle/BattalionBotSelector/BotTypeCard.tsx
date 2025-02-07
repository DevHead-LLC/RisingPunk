import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../../styles/theme';
import { BotType } from '../../../types/bots';

type Props = {
  type: BotType;
  count: number;
  isSelected: boolean;
  onSelect: (type: BotType) => void;
};

export const BotTypeCard = React.memo(({ type, count, isSelected, onSelect }: Props) => {
  return (
    <TouchableOpacity 
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={() => onSelect(type)}
    >
      <Text style={[styles.typeText, isSelected && styles.selectedText]}>
        {type.toUpperCase()}
      </Text>
      <Text style={[styles.countText, isSelected && styles.selectedCount]}>
        ({count})
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 120,
    padding: SIZING.spacing.sm,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(71, 23, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCard: {
    borderColor: '#4717F6',
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    shadowColor: '#4717F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  typeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  selectedText: {
    color: '#4717F6',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  countText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  selectedCount: {
    color: 'rgba(71, 23, 246, 0.7)',
  },
}); 