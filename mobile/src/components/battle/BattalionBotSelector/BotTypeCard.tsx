import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../../styles/theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useTheme } from '../../../context/ThemeContext';
import { BotType } from '../../../types/bots';

type Props = {
  type: BotType;
  count: number;
  isSelected: boolean;
  onSelect: (type: BotType) => void;
};

export const BotTypeCard = React.memo(({ type, count, isSelected, onSelect }: Props) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  
  const cardStyle = React.useMemo(() => [
    styles.card, 
    {
      backgroundColor: themeMode === 'light' ? 'rgba(245, 245, 220, 0.95)' : 'rgba(10, 10, 10, 0.95)',
      borderColor: themeMode === 'light' ? 'rgba(71, 23, 246, 0.4)' : 'rgba(71, 23, 246, 0.3)',
    },
    isSelected && {
      borderColor: colors.secondary,
      backgroundColor: themeMode === 'light' ? 'rgba(71, 23, 246, 0.12)' : 'rgba(71, 23, 246, 0.1)',
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    }
  ], [isSelected, colors, themeMode]);

  const typeTextStyle = React.useMemo(() => [
    styles.typeText, 
    {
      color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
    },
    isSelected && {
      color: colors.secondary,
    }
  ], [isSelected, colors, themeMode]);

  const countTextStyle = React.useMemo(() => [
    styles.countText, 
    {
      color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
    },
    isSelected && {
      color: themeMode === 'light' ? 'rgba(71, 23, 246, 0.7)' : 'rgba(71, 23, 246, 0.7)',
    }
  ], [isSelected, themeMode]);

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
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  countText: {
    fontSize: 14,
  },
});
