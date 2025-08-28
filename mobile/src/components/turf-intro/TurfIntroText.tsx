import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type TurfIntroTextProps = {
  text: string;
  onComplete: () => void;
  onSkip: () => void;
  buttonText?: string;
  centerText?: boolean;
  showSkipButton?: boolean;
};

export const TurfIntroText: React.FC<TurfIntroTextProps> = ({ text, onComplete, onSkip, buttonText = 'Continue', centerText = false, showSkipButton = true }) => {
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
        centerText ? styles.textContainerCentered : styles.textContainerRight
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
    top: 50,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1004,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  textContainer: {
    position: 'absolute',
    width: 280,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1004,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainerCentered: {
    left: '50%',
    top: '50%',
    transform: [{ translateX: -140 }, { translateY: -100 }],
  },
  textContainerRight: {
    top: '45%',
    right: 200,
    transform: [{ translateY: -100 }],
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  continueButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
