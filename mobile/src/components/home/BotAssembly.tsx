import React, {memo, useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Image, Text, Animated} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type BotAssemblyProps = {
  onPress: () => void;
  isHighlighted?: boolean;
};

export const BotAssembly = memo(function BotAssembly({ onPress, isHighlighted = false }: BotAssemblyProps) {
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
  
  return (
    <TouchableOpacity style={[styles.moduleContainer, { 
        backgroundColor: colors.accent + 'E6',
        borderColor: isHighlighted ? undefined : colors.secondary,
        borderWidth: isHighlighted ? 3 : 2,
        overflow: 'hidden',
      }]} onPress={onPress}>
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
        <View style={[styles.imageContainer, { 
          backgroundColor: colors.inputBg + '4D',
          borderColor: colors.matrix 
        }]}>
          <Image
            source={require('../../assets/images/bot-making.png')}
            style={styles.moduleImage}
          />
        </View>
        <View style={styles.moduleTextContainer}>
          <Text style={[styles.moduleTitle, { color: colors.primary }]}>BOT ASSEMBLY</Text>
          <Text style={[styles.moduleDescription, { color: colors.text.secondary }]}>Build your army</Text>
        </View>
      </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  moduleContainer: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    borderWidth: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 4,
    marginBottom: SIZING.spacing.sm,
    borderWidth: 1,
    padding: SIZING.spacing.xs,
  },
  moduleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  moduleTextContainer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  moduleTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  moduleDescription: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
});
