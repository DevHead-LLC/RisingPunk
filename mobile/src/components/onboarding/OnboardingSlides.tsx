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
  require('../../assets/images/onboarding/slide1.png'),
  require('../../assets/images/onboarding/slide2.png'),
  require('../../assets/images/onboarding/slide3.png'),
  require('../../assets/images/onboarding/slide4.png'),
  require('../../assets/images/onboarding/slide5.png'),
  require('../../assets/images/onboarding/slide6.png'),
  require('../../assets/images/onboarding/slide7.png'),
  require('../../assets/images/onboarding/slide8.png'),
  require('../../assets/images/onboarding/slide9.png'),
  require('../../assets/images/onboarding/slide10.png'),
  require('../../assets/images/onboarding/slide11.png'),
  require('../../assets/images/onboarding/slide12.png'),
  require('../../assets/images/onboarding/slide13.png'),
  require('../../assets/images/onboarding/slide14.png'),
  require('../../assets/images/RisingPunkLogo.png'),
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
  const isLogoSlide = currentSlideIndex === SLIDE_IMAGES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={styles.slideContainer} 
        onPress={isLogoSlide ? undefined : handleNextSlide}
        activeOpacity={0.9}
        disabled={isLogoSlide}
      >
        <SlideContent 
          image={currentImage}
          slideNumber={currentSlideIndex + 1}
          totalSlides={SLIDE_IMAGES.length}
          onComplete={isLogoSlide ? onComplete : undefined}
        />
      </TouchableOpacity>
      
      <View style={styles.controlsContainer}>
        <ProgressIndicator 
          currentSlide={currentSlideIndex + 1}
          totalSlides={SLIDE_IMAGES.length}
        />
        {!isLogoSlide && <SkipButton onSkip={handleSkip} />}
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
