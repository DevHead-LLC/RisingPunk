import React, {memo} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet} from 'react-native';
import {COLORS, SIZING} from '../../styles/theme';

type DigitalBarracksLocationProps = {
  onPress: () => void;
};

export const DigitalBarracksLocation = memo(function DigitalBarracksLocation({ onPress }: DigitalBarracksLocationProps) {
  return (
    <TouchableOpacity 
      style={[styles.location, styles.barracksPosition]} 
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Image 
          source={require('../../assets/images/digital-barracks.png')}
          style={styles.locationIcon}
        />
      </View>
      <Text style={styles.locationLabel}>DIGITAL BARRACKS</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  location: {
    position: 'absolute',
    alignItems: 'center',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 3,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.matrix,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  locationIcon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  locationLabel: {
    color: COLORS.secondary,
    fontSize: SIZING.font.body,
    letterSpacing: 2,
    textAlign: 'center',
    position: 'absolute',
    top: '100%',
    marginTop: 20,
    width: 200,
    left: -40,
  },
  barracksPosition: {
    position: 'absolute',
    top: '50%',
    right: '25%',
    transform: [{translateX: 60}, {translateY: -80}],
    zIndex: 3,
  }
});