import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Linking,
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
  const versionMessage = minAppVersion
    ? `Please update to version ${minAppVersion} and restart your application to continue a better experience.`
    : 'Please update to the latest version and restart your application to continue a better experience.';

  const handleUpdatePress = () => {
    Linking.openURL(getUpdateUrl());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { borderColor: colors.matrix }]}>
        <Text style={[styles.title, { color: colors.text.accent }]}>
          Update required
        </Text>
        <Text style={[styles.message, { color: colors.text.secondary }]}>
          Older versions of this app no longer operate correctly. {versionMessage}
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: SIZING.screen.width * 0.4,
    maxWidth: 400,
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
