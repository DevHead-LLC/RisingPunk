import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useBalance } from '../../context/BalanceContext';

export function Balance({ style }: { style?: object }): React.JSX.Element {
  const { balance } = useBalance();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Credits:</Text>
      <Text style={styles.amount}>{balance.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#4a90e2',
  },
  label: {
    color: '#4a90e2',
    fontSize: 16,
    marginRight: 8,
  },
  amount: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 