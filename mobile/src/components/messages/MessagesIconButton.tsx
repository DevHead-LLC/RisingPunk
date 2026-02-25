import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../context/ThemeContext';
import { SIZING } from '../../styles/theme';

/** Full button size; tappable area matches visible button. Row has gap between icons so hit areas do not overlap. */
const BUTTON_SIZE = 36;

export const MessagesIconButton: React.FC<{ onPress: () => void; unreadCount?: number; inline?: boolean }> = ({
  onPress,
  unreadCount = 0,
  inline,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const styles = createStyles(colors, !!inline, themeMode);
  const hasUnread = (unreadCount ?? 0) > 0;
  const iconSource = hasUnread
    ? require('../../assets/images/ui/activeMailbox.png')
    : require('../../assets/images/ui/mailbox.png');
  return (
    <View style={styles.button}>
      <Image source={iconSource} style={styles.iconImage} resizeMode="contain" />
      <TouchableOpacity
        style={styles.hitArea}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel="Messages"
        accessibilityHint="Opens your private messages"
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
            right: SIZING.spacing.md,
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
      width: 85,
      height: 85,
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
