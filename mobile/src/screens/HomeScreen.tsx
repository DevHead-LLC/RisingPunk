import React, {memo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import { Balance } from '../components/common/Balance';

const HackRigDisplay = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.hackRig} onPress={onPress}>
    <Text style={styles.hackRigText}>Hack Rig</Text>
  </TouchableOpacity>
));

const BotAssembly = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.botAssembly} onPress={onPress}>
    <View style={styles.botAssemblyTextContainer}>
      <Text style={styles.botAssemblyText}>Bot Assembly</Text>
    </View>
  </TouchableOpacity>
));

export function HomeScreen({ 
  onNavigateToMap, 
  onClose,
  onNavigateToBotAssembly 
}: { 
  onNavigateToMap: () => void;
  onClose: () => void;
  onNavigateToBotAssembly: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Balance style={styles.balance} />
      <TouchableOpacity style={styles.backButton} onPress={onClose}>
        <Text style={styles.backButtonText}>×</Text>
      </TouchableOpacity>
      <View style={styles.roomsContainer}>
        <HackRigDisplay onPress={onNavigateToMap} />
        <BotAssembly onPress={onNavigateToBotAssembly} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  roomsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  hackRig: {
    width: 150,
    height: 100,
    backgroundColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  hackRigText: {
    color: '#fff',
    fontSize: 18,
  },
  botAssembly: {
    width: 120,
    height: 120,
    backgroundColor: '#8e44ad',
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  botAssemblyTextContainer: {
    transform: [{ rotate: '-45deg' }],
  },
  botAssemblyText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#4a90e2',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  balance: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
}); 