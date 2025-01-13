import React, {memo} from 'react';
import {View, Text, StyleSheet} from 'react-native';

const HackRigDisplay = memo(() => (
  <View style={styles.hackRig}>
    <Text style={styles.hackRigText}>Hack Rig</Text>
  </View>
));

export function HackRigScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <HackRigDisplay />
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
}); 