import React, {memo} from 'react';
import {View, StyleSheet, TouchableOpacity, Image, Text} from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

type HackRigDisplayProps = {
  onPress: () => void;
  disabled?: boolean;
};

export const HackRigDisplay = memo(function HackRigDisplay({ 
  onPress, 
  disabled = true 
}: HackRigDisplayProps) {
  return (
    <TouchableOpacity 
      style={[
        styles.moduleContainer,
        disabled && styles.moduleDisabled
      ]} 
      onPress={disabled ? undefined : onPress}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={require('../../assets/images/hacker-rig.png')}
          style={styles.moduleImage}
        />
        {disabled && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockText}>🔒</Text>
          </View>
        )}
      </View>
      <View style={styles.moduleTextContainer}>
        <Text style={[styles.moduleTitle, disabled && styles.textDisabled]}>HACK RIG</Text>
        <Text style={[styles.moduleDescription, disabled && styles.textDisabled]}>
          Access the network
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  moduleContainer: {
    width: '45%',
    aspectRatio: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    marginBottom: SIZING.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.matrix,
    padding: SIZING.spacing.xs,
  },
  moduleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  moduleTextContainer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  moduleTitle: {
    color: '#b39ddb',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  moduleDescription: {
    color: '#9C27B0',
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
  },
  lockText: {
    fontSize: 32,
  },
  moduleDisabled: {
    opacity: 0.5,
    borderColor: COLORS.text.secondary,
  },
  textDisabled: {
    color: COLORS.text.secondary,
  }
}); 