import React, {memo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

const HackRigDisplay = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.hackRig} onPress={onPress}>
    <Text style={styles.hackRigText}>Hack Rig</Text>
  </TouchableOpacity>
));

export function HomeScreen({ onNavigateToMap, onClose }: { 
  onNavigateToMap: () => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onClose}>
        <Text style={styles.backButtonText}>×</Text>
      </TouchableOpacity>
      <HackRigDisplay onPress={onNavigateToMap} />
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
  hackRig: {
    width: 200,
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
  backButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 