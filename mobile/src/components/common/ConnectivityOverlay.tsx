import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

interface ConnectivityOverlayProps {
  visible: boolean;
}

export const ConnectivityOverlay: React.FC<ConnectivityOverlayProps> = ({ visible }) => {
  const colors = useThemeColors();

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={[styles.messageContainer, { backgroundColor: colors.background, borderColor: colors.error }]}>
        <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
          It looks like you're not connected to the internet. Please check your connection and try again.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  messageContainer: {
    maxWidth: Dimensions.get('window').width * 0.8,
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  messageText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    lineHeight: SIZING.font.body * 1.4,
  },
});
