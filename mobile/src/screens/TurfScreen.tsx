import React, {memo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Dimensions} from 'react-native';
import { Balance } from '../components/common/Balance';

const {width} = Dimensions.get('window');

const DigitalBarracks = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.barracksCircle} onPress={onPress}>
    <Text style={styles.barracksText}>Digital Barracks</Text>
  </TouchableOpacity>
));

const SquareButton = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.homeSquare} onPress={onPress}>
    <Text style={styles.homeText}>home</Text>
  </TouchableOpacity>
));

const ProfileSection = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.profileContainer} onPress={onPress}>
    <View style={styles.profileDiamond}>
      <Text style={styles.profileText}>Profile</Text>
    </View>
  </TouchableOpacity>
));

export function TurfScreen({
  onNavigateToHackRig,
  onNavigateToBarracks,
  onNavigateToProfile,
}: {
  onNavigateToHackRig: () => void;
  onNavigateToBarracks: () => void;
  onNavigateToProfile: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Balance style={styles.balance} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <DigitalBarracks onPress={onNavigateToBarracks} />
          <SquareButton onPress={onNavigateToHackRig} />
        </View>
        <ProfileSection onPress={onNavigateToProfile} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 60,
  },
  balance: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
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
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDiamond: {
    width: 100,
    height: 100,
    backgroundColor: '#2ecc71',
    transform: [{rotate: '45deg'}],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#fff',
    fontSize: 16,
    transform: [{rotate: '-45deg'}],
    textAlign: 'center',
  },
}); 