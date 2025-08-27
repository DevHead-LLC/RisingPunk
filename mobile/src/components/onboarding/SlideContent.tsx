import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideContentProps {
  image: any;
  slideNumber: number;
  totalSlides: number;
}

export const SlideContent: React.FC<SlideContentProps> = ({ 
  image, 
  slideNumber, 
  totalSlides 
}) => {
  return (
    <View style={styles.container}>
      <Image 
        source={image} 
        style={styles.slideImage}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  slideImage: {
    width: SCREEN_WIDTH * 1.125, // Increased from 0.9 to 1.125 (25% larger)
    height: SCREEN_HEIGHT * 0.875, // Increased from 0.7 to 0.875 (25% larger)
    maxWidth: 1000, // Increased from 800 to 1000 (25% larger)
    maxHeight: 750, // Increased from 600 to 750 (25% larger)
  },
});
