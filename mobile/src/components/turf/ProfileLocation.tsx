import React, {memo, useEffect, useState} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Animated} from 'react-native';
import {SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useAppSelector} from '../../store/hooks';
import {useTaskGuideHighlight} from '../../contexts/TaskGuideHighlightContext';

type ProfileLocationProps = {
  onPress: () => void;
  isIntroActive?: boolean;
};

export const ProfileLocation = memo(function ProfileLocation({ onPress, isIntroActive = false }: ProfileLocationProps) {
  const colors = useThemeColors();
  const profileGender = useAppSelector((state) => state.preferences.profileGender);
  const { highlightTaskId, highlightStep, advanceHighlightStep } = useTaskGuideHighlight();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  const isThemeTask = highlightTaskId === 'use-hacker-mode' || highlightTaskId === 'use-business-mode';
  const isAvatarTask = highlightTaskId === 'change-avatar';
  const isHighlighted = isIntroActive || highlightTaskId === 'view-profile' || (isThemeTask && highlightStep === null) || (isAvatarTask && highlightStep === null);
  
  const handlePress = () => {
    if ((isThemeTask || isAvatarTask) && highlightStep === null) {
      advanceHighlightStep();
    }
    onPress();
  };

  const profileImageSource = profileGender === 'female' 
    ? require('../../assets/images/profile-female.png')
    : require('../../assets/images/profile.png');
  
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
    <Animated.View
      style={[styles.location, styles.profilePosition, { 
        borderColor: isHighlighted ? animatedBorderColorValue : colors.primary,
        borderWidth: isHighlighted ? 3 : 1
      }]}
    >
      <TouchableOpacity onPress={handlePress}>
        <View style={styles.profileContainer}>
          <Image
            source={profileImageSource}
            style={styles.locationIcon}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  location: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1000, // Higher than overlay (999) so profile is visible above it
  },
  profileContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  locationIcon: {
    width: 60,
    height: 60,
  },
  profilePosition: {
    top: SIZING.spacing.lg,
    right: SIZING.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
  },
});
