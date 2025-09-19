import React, {memo, useEffect, useState} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Animated} from 'react-native';
import {COLORS, SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';

type DigitalBarracksLocationProps = {
  onPress: () => void;
  isIntroActive?: boolean;
};

export const DigitalBarracksLocation = memo(function DigitalBarracksLocation({ onPress, isIntroActive = false }: DigitalBarracksLocationProps) {
  const colors = useThemeColors();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  
  useEffect(() => {
    if (isIntroActive) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % introColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isIntroActive, introColors.length]);
  
  useEffect(() => {
    if (isIntroActive) {
      Animated.timing(animatedBorderColor, {
        toValue: currentColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentColorIndex, isIntroActive, animatedBorderColor]);
  
  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: introColors,
  });
  
  return (
    <TouchableOpacity
      style={[styles.location, styles.barracksPosition]}
      onPress={onPress}
    >
      <Animated.View style={[
        styles.iconContainer, 
        { 
          borderWidth: isIntroActive ? 3 : 1,
          borderColor: isIntroActive ? animatedBorderColorValue : colors.matrix
        }
      ]}>
        <Image
          source={require('../../assets/images/digital-barracks.png')}
          style={styles.locationIcon}
        />
      </Animated.View>
      <Text style={styles.locationLabel}>DIGITAL BARRACKS</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  location: {
    position: 'absolute',
    alignItems: 'center',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 3,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.matrix,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  locationIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain' as const,
  },
  locationLabel: {
    color: COLORS.secondary,
    fontSize: SIZING.font.body,
    letterSpacing: 2,
    textAlign: 'center',
    position: 'absolute',
    top: '100%',
    marginTop: 20,
    width: 200,
    left: -40,
  },
  barracksPosition: {
    position: 'absolute',
    top: '50%',
    right: '25%',
    transform: [{translateX: 60}, {translateY: -80}],
    zIndex: 3,
  },
});
