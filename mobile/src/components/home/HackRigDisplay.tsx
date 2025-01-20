import React, {memo} from 'react';
import {View, StyleSheet, TouchableOpacity, Image, Text} from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

type HackRigDisplayProps = {
  onPress: () => void;
};

export const HackRigDisplay = memo(function HackRigDisplay({ onPress }: HackRigDisplayProps) {
  return (
    <TouchableOpacity style={styles.moduleContainer} onPress={onPress}>
      <View style={styles.imageContainer}>
        <Image 
          source={require('../../assets/images/hacker-rig.png')}
          style={styles.moduleImage}
        />
      </View>
      <View style={styles.moduleTextContainer}>
        <Text style={styles.moduleTitle}>HACK RIG</Text>
        <Text style={styles.moduleDescription}>Access the network</Text>
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
  }
}); 