import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface BattleLoadingErrorProps {
  isLoading: boolean;
  error: any;
  loadingText?: string;
  errorText?: string;
  errorSubtext?: string;
  children: React.ReactNode;
}

export const BattleLoadingError: React.FC<BattleLoadingErrorProps> = ({
  isLoading,
  error,
  loadingText = 'Loading...',
  errorText = 'Failed to load',
  errorSubtext = 'Please try again',
  children
}) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4717F6" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorText}</Text>
        <Text style={styles.errorSubtext}>{errorSubtext}</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#4717F6',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF4141',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
}); 