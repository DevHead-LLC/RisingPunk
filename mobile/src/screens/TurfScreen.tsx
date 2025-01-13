import React, {memo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Dimensions} from 'react-native';

// Get screen dimensions for responsive layout
const {width} = Dimensions.get('window');

// Memoize child components for performance
const SquareButton = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.homeSquare} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.homeText}>home</Text>
  </TouchableOpacity>
));

const DigitalBarracks = memo(() => (
  <View style={styles.barracksCircle}>
    <Text style={styles.barracksText}>Digital Barracks</Text>
  </View>
));

export function TurfScreen({onNavigateToHackRig}: {onNavigateToHackRig: () => void}): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <DigitalBarracks />
        <SquareButton onPress={onNavigateToHackRig} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: width * 0.8, // Use 80% of screen width
    paddingHorizontal: 20,
  },
  homeSquare: {
    width: 100,
    height: 100,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  homeText: {
    fontSize: 16,
  },
  barracksCircle: {
    width: 120,
    height: 120,
    backgroundColor: '#4a90e2',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barracksText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
}); 