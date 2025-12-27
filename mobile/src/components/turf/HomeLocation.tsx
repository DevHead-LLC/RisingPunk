import React, {memo, useEffect, useState} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Animated, Dimensions} from 'react-native';
import {COLORS, SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useTaskGuideHighlight} from '../../contexts/TaskGuideHighlightContext';

type HomeLocationProps = {
  onPress: () => void;
  isIntroActive?: boolean;
};

export const HomeLocation = memo(function HomeLocation({ onPress, isIntroActive = false }: HomeLocationProps) {
  const colors = useThemeColors();
  const { highlightTaskId } = useTaskGuideHighlight();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  const isHighlighted = isIntroActive || highlightTaskId === 'visit-home';
  const isRenderedAtRoot = highlightTaskId === 'visit-home' && !isIntroActive;
  
  const screenDimensions = Dimensions.get('window');
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;
  
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
  
  const positionStyle = isRenderedAtRoot ? {
    top: screenHeight * 0.5 - 80,
    left: screenWidth * 0.5 - 60,
  } : styles.homePosition;
  
  return (
    <Animated.View
      style={[styles.location, positionStyle, { 
        borderColor: isHighlighted ? animatedBorderColorValue : 'transparent',
        borderWidth: isHighlighted ? 3 : 0,
        zIndex: isHighlighted ? 1000 : 3,
        elevation: isHighlighted ? 1000 : 3
      }]}
    >
      <TouchableOpacity onPress={onPress}>
        <Animated.View style={[
          styles.iconContainer, 
          { 
            borderWidth: isHighlighted ? 3 : 1,
            borderColor: isHighlighted ? animatedBorderColorValue : colors.matrix
          }
        ]}>
          <Image
            source={require('../../assets/images/home.png')}
            style={styles.locationIcon}
          />
        </Animated.View>
        <Text style={styles.locationLabel}>HOME</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  location: {
    position: 'absolute',
    alignItems: 'center',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: 4,
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
  homePosition: {
    position: 'absolute',
    top: '50%',
    left: '25%',
    transform: [{translateX: -60}, {translateY: -80}],
    zIndex: 1000,
    elevation: 1000,
  },
});
