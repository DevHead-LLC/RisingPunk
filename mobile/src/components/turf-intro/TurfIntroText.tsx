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
  
  // Simple responsive calculations - keep it clean and working
  const textContainerWidth = Math.min(screenWidth * 0.35, 320);
  const rightOffset = Math.max(screenWidth * 0.08, 30);
  const centerOffsetX = textContainerWidth / 2;
  const centerOffsetY = screenHeight * 0.275;
  
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
        }
      ]}>
        <Text style={styles.text}>{text}</Text>
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
    top: 25,
    left: '50%',
    transform: [{ translateX: -30 }],
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
    width: 280,
    padding: 20,
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
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  continueButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 120,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
