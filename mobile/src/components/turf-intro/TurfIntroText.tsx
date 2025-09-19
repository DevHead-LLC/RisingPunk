import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

type TurfIntroTextProps = {
  text: string;
  onComplete: () => void;
  onSkip: () => void;
  buttonText?: string;
  centerText?: boolean;
  showSkipButton?: boolean;
};

export const TurfIntroText: React.FC<TurfIntroTextProps> = ({ text, onComplete, onSkip, buttonText = 'Continue', centerText = false, showSkipButton = true }) => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  
  // Calculate responsive dimensions
  const textContainerWidth = Math.min(screenWidth * 0.35, 320); // 35% of screen width, max 320px
  const textContainerMaxWidth = Math.min(screenWidth * 0.4, 350); // 40% of screen width, max 350px
  
  // Calculate responsive font size
  const baseFontSize = Math.max(screenWidth * 0.04, 14); // 4% of screen width, minimum 14px
  const fontSize = Math.min(baseFontSize, 18); // Maximum 18px
  
  // Calculate responsive positioning
  const rightOffset = Math.max(screenWidth * 0.1, 20); // 6% of screen width, minimum 20px (moved 2% left)
  const centerOffsetX = textContainerWidth / 2; // Half the container width for centering
  const centerOffsetY = screenHeight * 0.3; // 20% of screen height for vertical centering
  
  return (
    <View style={styles.container}>
      {/* Skip button at top right - only show if showSkipButton is true */}
      {showSkipButton && (
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={onSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}
      
      {/* Explanatory text - positioned based on centerText prop */}
      <View style={[
        styles.textContainer, 
        centerText ? {
          left: '50%',
          top: '50%',
          transform: [{ translateX: -centerOffsetX }, { translateY: -centerOffsetY }],
        } : {
          top: '50%',
          right: rightOffset,
          transform: [{ translateY: -centerOffsetY }],
        },
        {
          width: textContainerWidth,
          maxWidth: textContainerMaxWidth,
        }
      ]}>
        <Text style={[styles.text, { fontSize }]}>{text}</Text>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={onComplete}
        >
          <Text style={styles.continueText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1003,
  },
  skipButton: {
    position: 'absolute',
    top: '6%',
    left: '50%',
    transform: [{ translateX: -30 }], // Half of approximate button width for centering
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1004,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  textContainer: {
    position: 'absolute',
    padding: '4%',
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1004,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: '5%',
    fontWeight: '500',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  continueButton: {
    paddingHorizontal: '6%',
    paddingVertical: '3%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: '60%',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
