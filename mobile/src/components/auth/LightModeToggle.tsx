import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

export function LightModeToggle(): React.JSX.Element {
  const { themeMode, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const isLightMode = themeMode === 'light';

  return (
    <TouchableOpacity style={styles.container} onPress={toggleTheme}>
      <View style={styles.iconRow}>
        <View style={[styles.iconContainer, isLightMode && styles.iconContainerDark]}>
          <Text style={styles.icon}>
            {isLightMode ? '👀' : '💡'}
          </Text>
        </View>
        <Text style={[styles.actionText, { color: colors.text.secondary }]}>
          {isLightMode ? 'Go Hacker' : 'Go Business'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: SIZING.spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.xs,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDark: {
    backgroundColor: '#000000',
    borderRadius: 12,
  },
  icon: {
    fontSize: 16,
    opacity: 0.8,
  },
  actionText: {
    fontSize: SIZING.font.small - 2,
    opacity: 0.7,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});
