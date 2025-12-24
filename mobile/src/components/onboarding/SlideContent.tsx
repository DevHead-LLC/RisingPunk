import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { SlideTextOverlay } from './SlideTextOverlay';
import { SLIDE_TEXT_CONTENT } from './slideTextContent';
import { useThemeColors } from '../../hooks/useThemeColors';
import { TouchableOpacity, Text } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideContentProps {
  image: any;
  slideNumber: number;
  totalSlides: number;
  onComplete?: () => void;
}

export const SlideContent: React.FC<SlideContentProps> = ({ 
  image, 
  slideNumber, 
  totalSlides,
  onComplete
}) => {
  const colors = useThemeColors();
  const isLogoSlide = slideNumber === totalSlides;
  const textConfig = !isLogoSlide ? SLIDE_TEXT_CONTENT[slideNumber] : null;

  return (
    <View style={styles.container}>
      <Image 
        source={image} 
        style={isLogoSlide ? styles.logoImage : styles.slideImage}
        resizeMode="contain"
      />
      {textConfig && textConfig.narrative && (
        <SlideTextOverlay
          narrative={textConfig.narrative}
          message={textConfig.message}
          style={textConfig.style}
          position={textConfig.position}
          slideNumber={slideNumber}
        />
      )}
      {isLogoSlide && onComplete && (
        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: colors.matrix, borderColor: colors.matrix }]}
          onPress={onComplete}
          activeOpacity={0.8}
        >
          <Text style={[styles.completeButtonText, { color: colors.background }]}>
            Complete
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  slideImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  logoImage: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_HEIGHT * 0.5,
    maxWidth: 500,
    maxHeight: 400,
  },
  completeButton: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.12,
    paddingVertical: 12,
    paddingHorizontal: SCREEN_WIDTH * 0.12,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: SCREEN_WIDTH * 0.25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
