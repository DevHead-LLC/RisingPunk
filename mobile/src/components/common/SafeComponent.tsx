import React from 'react';
import { View, Text, StyleSheet } from 'react-native';


interface SafeComponentProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function SafeComponent({ children, fallback }: SafeComponentProps) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('SafeComponent caught an error:', error);

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Component Error</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
  },
});
