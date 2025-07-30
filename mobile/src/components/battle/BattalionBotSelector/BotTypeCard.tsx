import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../../styles/theme';
import { BotType } from '../../../types/bots';

type Props = {
  type: BotType;
  count: number;
  isSelected: boolean;
  onSelect: (type: BotType) => void;
};

export const BotTypeCard = React.memo(({ type, count, isSelected, onSelect }: Props) => {
  const cardStyle = React.useMemo(() => [
    styles.card, 
    isSelected && styles.selectedCard
  ], [isSelected]);

  const typeTextStyle = React.useMemo(() => [
    styles.typeText, 
    isSelected && styles.selectedText
  ], [isSelected]);

  const countTextStyle = React.useMemo(() => [
    styles.countText, 
    isSelected && styles.selectedCount
  ], [isSelected]);

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={() => onSelect(type)}
    >
      <Text style={typeTextStyle}>
        {type.toUpperCase()}
      </Text>
      <Text style={countTextStyle}>
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
