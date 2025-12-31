import React, {memo, useEffect, useState} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Animated} from 'react-native';
import {COLORS, SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useTaskGuideHighlight} from '../../contexts/TaskGuideHighlightContext';

type DigitalBarracksLocationProps = {
  onPress: () => void;
  isIntroActive?: boolean;
};

export const DigitalBarracksLocation = memo(function DigitalBarracksLocation({ onPress, isIntroActive = false }: DigitalBarracksLocationProps) {
  const colors = useThemeColors();
  const { highlightTaskId, clearHighlight } = useTaskGuideHighlight();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  const isVisitDigitalBarracks = highlightTaskId === 'visit-digital-barracks';
  const isHighlighted = isIntroActive || isVisitDigitalBarracks;
  
  const handlePress = () => {
    if (isVisitDigitalBarracks) {
      clearHighlight();
    }
    onPress();
  };
  
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
  
  
  const locationStyle = isVisitDigitalBarracks
    ? [styles.location, { top: 0, right: 0, transform: [] }] // Remove positioning when in elevated wrapper
    : [styles.location, styles.barracksPosition];
  
  return (
    <View style={[...locationStyle, { zIndex: isHighlighted ? 10002 : 3 }]} pointerEvents="box-none">
      <TouchableOpacity 
        onPress={handlePress} 
        style={{ zIndex: isHighlighted ? 10002 : 3, pointerEvents: 'auto' }}
      >
        <Animated.View style={[
          styles.iconContainer, 
          { 
            borderWidth: isHighlighted ? 3 : 1,
            borderColor: isHighlighted ? animatedBorderColorValue : colors.matrix
          }
        ]}>
          <Image
            source={require('../../assets/images/digital-barracks.png')}
            style={styles.locationIcon}
          />
        </Animated.View>
        <Text style={styles.locationLabel}>DIGITAL BARRACKS</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  location: {
    position: 'absolute',
    alignItems: 'center',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
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
  },
});
