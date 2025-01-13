import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export function TurfScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.homeSquare}>
        <Text style={styles.homeText}>home</Text>
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
}); 