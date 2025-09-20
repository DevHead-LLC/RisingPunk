import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Image, StyleSheet, Animated } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface DevelopmentIconProps {
  isBuilding: boolean;
  isUnlocked: boolean;
  emptyImage: any;
  completedImage: any;
  underConstructionImage?: any;
  onPress: () => void;
  size?: number;
  iconSize?: number;
  isIntroActive?: boolean;
}

export const DevelopmentIcon: React.FC<DevelopmentIconProps> = ({
  isBuilding,
  isUnlocked,
  emptyImage,
  completedImage,
  underConstructionImage,
  onPress,
  size = 120,
  iconSize = 100,
  isIntroActive = false
}) => {
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

  const getImageSource = () => {
    if (isBuilding) {
      return underConstructionImage || require('../../assets/images/underConstruction.png');
    } else if (isUnlocked) {
      return completedImage;
    } else {
      return emptyImage;
    }
  };

  const containerStyle = [
    styles.iconContainer,
    {
      width: size,
      height: size,
      borderColor: isIntroActive ? animatedBorderColorValue : colors.matrix,
      borderWidth: isIntroActive ? 3 : 1
    }
  ];

  const iconStyle = [
    styles.locationIcon,
    {
      width: iconSize,
      height: iconSize
    }
  ];

  return (
    <TouchableOpacity
      style={styles.location}
      onPress={onPress}
    >
      <Animated.View style={containerStyle}>
        <Image
          source={getImageSource()}
          style={iconStyle}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  location: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 3,
    paddingTop: SIZING.spacing.md,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  locationIcon: {
    resizeMode: 'contain' as const,
  },
});
