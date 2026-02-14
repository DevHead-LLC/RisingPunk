import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

/**
 * World Chat entry point. Shown only when user has unlocked the hack rig.
 * Top-center placement; replace the inner content with a custom image asset if desired.
 */
export const WorldChatIconButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel="World Chat"
    >
      <Text style={styles.iconText}>💬</Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      top: SIZING.spacing.lg,
      left: '50%',
      marginLeft: -18,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10002,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 100,
    },
    iconText: {
      fontSize: 18,
    },
  });
