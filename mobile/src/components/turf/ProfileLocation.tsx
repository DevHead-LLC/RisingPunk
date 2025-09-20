import React, {memo, useEffect, useState} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Animated} from 'react-native';
import {SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useAppSelector} from '../../store/hooks';

type ProfileLocationProps = {
  onPress: () => void;
  isIntroActive?: boolean;
};

export const ProfileLocation = memo(function ProfileLocation({ onPress, isIntroActive = false }: ProfileLocationProps) {
  const colors = useThemeColors();
  const profileGender = useAppSelector((state) => state.preferences.profileGender);
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];

  const profileImageSource = profileGender === 'female' 
    ? require('../../assets/images/profile-female.png')
    : require('../../assets/images/profile.png');
  
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
    <Animated.View
      style={[styles.location, styles.profilePosition, { 
        borderColor: isIntroActive ? animatedBorderColorValue : colors.primary,
        borderWidth: isIntroActive ? 3 : 1
      }]}
    >
      <TouchableOpacity onPress={onPress}>
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
    zIndex: 3,
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
