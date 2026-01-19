import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type BotTypeCardProps = {
  type: string;
  _level: number;
  isLocked: boolean;
  isSelected: boolean;
  count?: number;
  onPress: () => void;
  isHighlighted?: boolean;
  isDisabled?: boolean;
};

export const BotTypeCard = React.memo(function BotTypeCard({
  type,
  _level,
  isLocked,
  isSelected,
  count,
  onPress,
  isHighlighted = false,
  isDisabled = false,
}: BotTypeCardProps) {
  const colors = useThemeColors();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  
  useEffect(() => {
    if (isHighlighted) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % introColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isHighlighted, introColors.length]);
  
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
    outputRange: introColors,
  });

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
    <View style={{ zIndex: isHighlighted ? 1000 : 3, pointerEvents: isDisabled ? 'none' : 'auto' }}>
      <TouchableOpacity
        style={[
          styles.botCard,
          isSelected && !isHighlighted && styles.botCardSelected,
          {
            backgroundColor: colors.accent + '30',
            borderColor: isHighlighted ? undefined : (isSelected ? colors.matrix + '80' : colors.matrix + '40'),
          },
          isSelected && !isHighlighted && {
            backgroundColor: colors.accent + '60',
          },
          isHighlighted && {
            borderWidth: 3,
            overflow: 'hidden',
          }
        ]}
        onPress={isDisabled ? () => {} : onPress}
        disabled={isDisabled || isLocked}
      >
        {isHighlighted && (
          <Animated.View 
            style={[
              StyleSheet.absoluteFill,
              {
                borderWidth: 3,
                borderColor: animatedBorderColorValue,
                borderRadius: 4,
              }
            ]} 
            pointerEvents="none"
          />
        )}
        {cardContent}
      </TouchableOpacity>
    </View>
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
