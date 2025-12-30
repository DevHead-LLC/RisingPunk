import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { SIZING } from '../../../styles/theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useTheme } from '../../../context/ThemeContext';
import { BotType } from '../../../types/bots';

type Props = {
  type: BotType;
  count: number;
  isSelected: boolean;
  onSelect: (type: BotType) => void;
  isHighlighted?: boolean;
  disabled?: boolean;
};

export const BotTypeCard = React.memo(({ type, count, isSelected, onSelect, isHighlighted = false, disabled = false }: Props) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useRef(new Animated.Value(0)).current;
  
  const highlightColors = [colors.primary, colors.secondary, colors.matrix];

  useEffect(() => {
    if (isHighlighted) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % highlightColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isHighlighted, highlightColors.length]);

  useEffect(() => {
    if (isHighlighted) {
      Animated.timing(animatedBorderColor, {
        toValue: currentColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentColorIndex, isHighlighted, animatedBorderColor]);

  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: highlightColors,
  });
  
  const cardStyle = React.useMemo(() => {
    return [
      styles.card, 
      {
        backgroundColor: themeMode === 'light' ? 'rgba(245, 245, 220, 0.95)' : 'rgba(10, 10, 10, 0.95)',
        borderColor: isHighlighted ? undefined : (themeMode === 'light' ? 'rgba(71, 23, 246, 0.4)' : 'rgba(71, 23, 246, 0.3)'),
        borderWidth: isHighlighted ? 3 : 1,
        zIndex: isHighlighted ? 1001 : 1,
        elevation: isHighlighted ? 1001 : 1,
      },
      isSelected && !isHighlighted && {
        borderColor: colors.secondary,
        backgroundColor: themeMode === 'light' ? 'rgba(71, 23, 246, 0.12)' : 'rgba(71, 23, 246, 0.1)',
        shadowColor: colors.secondary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
      }
    ];
  }, [isSelected, isHighlighted, colors, themeMode, type]);

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
      disabled={disabled}
    >
      {isHighlighted && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            {
              borderWidth: 3,
              borderColor: animatedBorderColorValue,
              borderRadius: 8,
            }
          ]} 
          pointerEvents="none"
        />
      )}
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
