import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../context/ThemeContext';
import { SIZING } from '../../styles/theme';

/** Full button size; tappable area matches visible button. Row has gap between icons so hit areas do not overlap. */
const BUTTON_SIZE = 36;

/**
 * World Chat entry point. Shown only when user has unlocked the hack rig.
 * Use inline={true} inside a centered row; otherwise uses top-center absolute placement.
 */
export const WorldChatIconButton: React.FC<{ onPress: () => void; inline?: boolean }> = ({ onPress, inline }) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const styles = createStyles(colors, !!inline, themeMode);
  return (
    <View style={styles.button}>
      <Image source={require('../../assets/images/ui/worldChat.png')} style={styles.iconImage} resizeMode="contain" />
      <TouchableOpacity
        style={styles.hitArea}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel="World Chat"
      />
    </View>
  );
};

const createStyles = (colors: any, inline: boolean, themeMode: 'light' | 'dark') =>
  StyleSheet.create({
    button: {
      ...(inline
        ? {}
        : {
            position: 'absolute' as const,
            top: SIZING.spacing.lg,
            left: '50%',
            marginLeft: -BUTTON_SIZE / 2,
          }),
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: themeMode === 'dark' ? 'transparent' : '#9E9E9E',
      borderWidth: 1,
      borderColor: themeMode === 'dark' ? 'transparent' : '#757575',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10002,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 100,
    },
    iconImage: {
      width: 75,
      height: 75,
    },
    hitArea: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: BUTTON_SIZE / 2,
    },
  });
