import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SlideContent } from './SlideContent';
import { ProgressIndicator } from './ProgressIndicator';
import { SkipButton } from './SkipButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlidesProps {
  onComplete: () => void;
  onSkip: () => void;
}

const SLIDE_IMAGES = [
  require('../../assets/images/onboarding/one.png'),
  require('../../assets/images/onboarding/two.png'),
  require('../../assets/images/onboarding/three.png'),
  require('../../assets/images/onboarding/four.png'),
  require('../../assets/images/onboarding/five.png'),
  require('../../assets/images/onboarding/six.png'),
  require('../../assets/images/onboarding/seven.png'),
  require('../../assets/images/onboarding/eight.png'),
  require('../../assets/images/onboarding/nine.png'),
  require('../../assets/images/onboarding/ten.png'),
  require('../../assets/images/onboarding/eleven.png'),
  require('../../assets/images/onboarding/twelve.png'),
  require('../../assets/images/onboarding/thirteen.png'),
  require('../../assets/images/onboarding/fourteen.png'),
  require('../../assets/images/onboarding/fifteen.png'),
  require('../../assets/images/onboarding/sixteen.png'),
  require('../../assets/images/onboarding/seventeen.png'),
  require('../../assets/images/onboarding/eighteen.png'),
  require('../../assets/images/onboarding/nineteen.png'),
  require('../../assets/images/onboarding/twenty.png'),
  require('../../assets/images/onboarding/twentyone.png'),
  require('../../assets/images/onboarding/twentythree.png'),
];

export const OnboardingSlides: React.FC<OnboardingSlidesProps> = ({ onComplete, onSkip }) => {
  const colors = useThemeColors();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleNextSlide = useCallback(() => {
    if (currentSlideIndex < SLIDE_IMAGES.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      onComplete();
    }
  }, [currentSlideIndex, onComplete]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const currentImage = SLIDE_IMAGES[currentSlideIndex];
  const isLastSlide = currentSlideIndex === SLIDE_IMAGES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={styles.slideContainer} 
        onPress={handleNextSlide}
        activeOpacity={0.9}
      >
        <SlideContent 
          image={currentImage}
          slideNumber={currentSlideIndex + 1}
          totalSlides={SLIDE_IMAGES.length}
        />
      </TouchableOpacity>
      
      <View style={styles.controlsContainer}>
        <ProgressIndicator 
          currentSlide={currentSlideIndex + 1}
          totalSlides={SLIDE_IMAGES.length}
        />
        <SkipButton onSkip={handleSkip} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
