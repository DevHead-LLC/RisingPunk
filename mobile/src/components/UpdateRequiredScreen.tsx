import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { SIZING, styleGuide } from '../styles/theme';
import { getUpdateUrl } from '../constants/updateUrls';

type UpdateRequiredScreenProps = {
  /** Server's minimum required version (from version check). Shown in message when provided. */
  minAppVersion?: string;
};

/**
 * Full-screen, non-dismissable "Update required" screen.
 * Shown when app version is below server minimum. Single CTA opens store (or risingpunk.com).
 */
export const UpdateRequiredScreen: React.FC<UpdateRequiredScreenProps> = ({ minAppVersion }) => {
  const colors = useThemeColors();
  const { width, height } = useWindowDimensions();
  const whyLine = 'We’ve updated our services and no longer support this version of the app for security and compatibility.';
  const actionLine = minAppVersion
    ? `Please update to version ${minAppVersion} or newer, then restart the app to continue.`
    : 'Please update to the latest version, then restart the app to continue.';

  const handleUpdatePress = () => {
    Linking.openURL(getUpdateUrl());
  };

  // Use wider content on narrow screens (phones) so message is readable; keep 40% cap on larger screens
  const contentWidth = width < 500 ? Math.min(width * 0.85, 400) : Math.min(width * 0.4, 400);
  return (
    <View style={[styles.container, { width, height, backgroundColor: colors.background }]}>
      <View style={[styles.content, { width: contentWidth, maxWidth: 400, borderColor: colors.matrix }]}>
        <Text style={[styles.title, { color: colors.text.accent }]}>
          Update required
        </Text>
        <Text style={[styles.message, { color: colors.text.secondary }]}>
          {whyLine} {actionLine}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.secondary },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleUpdatePress}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Update
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  message: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SIZING.spacing.lg,
  },
  button: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
});
