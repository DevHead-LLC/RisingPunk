import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS } from '../../styles/theme';

export const LoadingSpinner: React.FC = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
