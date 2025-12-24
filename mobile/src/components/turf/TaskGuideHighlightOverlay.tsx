import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';
import { SIZING } from '../../styles/theme';

interface TaskGuideHighlightOverlayProps {
  forProfile?: boolean;
  forSettings?: boolean;
  forThemeToggle?: boolean;
  forAvatarToggle?: boolean;
}

export const TaskGuideHighlightOverlay: React.FC<TaskGuideHighlightOverlayProps> = ({ 
  forProfile = false,
  forSettings = false,
  forThemeToggle = false,
  forAvatarToggle = false
}) => {
  const colors = useThemeColors();
  const { highlightTaskId, highlightStep } = useTaskGuideHighlight();

  const isThemeTask = highlightTaskId === 'use-hacker-mode' || highlightTaskId === 'use-business-mode';
  const isAvatarTask = highlightTaskId === 'change-avatar';
  const isViewProfile = highlightTaskId === 'view-profile';

  if (!isViewProfile && !isThemeTask && !isAvatarTask) {
    return null;
  }

  if (isViewProfile && !forProfile) {
    return null;
  }

  // For theme tasks, use highlightStep to control which overlay shows (sequential flow)
  if (isThemeTask) {
    // Show profile overlay on turf screen when highlightStep is null (initial state)
    if (forProfile && highlightStep === null) {
      // Allow this to render - show profile highlight on turf screen
    } else if (forProfile && highlightStep !== null) {
      return null; // Don't show profile overlay after step has advanced
    } else if (forSettings && highlightStep !== 'settings-tab') {
      return null; // Only show settings overlay when step is 'settings-tab'
    } else if (forThemeToggle && highlightStep !== 'theme-toggle') {
      return null; // Only show theme toggle overlay when step is 'theme-toggle'
    } else if (!forProfile && !forSettings && !forThemeToggle) {
      return null; // Neither prop set, don't render
    }
  }

  // For avatar tasks, use highlightStep to control which overlay shows (sequential flow)
  if (isAvatarTask) {
    // Show profile overlay on turf screen when highlightStep is null (initial state)
    if (forProfile && highlightStep === null) {
      // Allow this to render - show profile highlight on turf screen
    } else if (forProfile && highlightStep !== null) {
      return null; // Don't show profile overlay after step has advanced
    } else if (forSettings && highlightStep !== 'settings-tab') {
      return null; // Only show settings overlay when step is 'settings-tab'
    } else if (forAvatarToggle && highlightStep !== 'avatar-toggle') {
      return null; // Only show avatar toggle overlay when step is 'avatar-toggle'
    } else if (!forProfile && !forSettings && !forAvatarToggle) {
      return null; // Neither prop set, don't render
    }
  }

  return (
    <>
      <View style={styles.overlay} pointerEvents="none" />
      {forProfile && (
        <View style={styles.clickHereContainerProfile} pointerEvents="none">
          <View style={[styles.clickHereBox, { backgroundColor: colors.background, borderColor: colors.primary }]}>
            <Text style={[styles.clickHereText, { color: colors.text.primary }]}>
              Click Here
            </Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 999,
  },
  clickHereContainerProfile: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    right: SIZING.spacing.lg + 80, // Position to the left of profile (profile is 60px wide + spacing)
    zIndex: 1001, // Higher than profile (1000) so it appears above
    alignItems: 'center',
    justifyContent: 'center',
  },
  clickHereContainerSettings: {
    position: 'absolute',
    top: SIZING.spacing.xl,
    left: SIZING.spacing.lg,
    zIndex: 1001, // Higher than Settings tab (1000) so it appears above
    alignItems: 'center',
    justifyContent: 'center',
  },
  clickHereContainerThemeToggle: {
    position: 'absolute',
    top: 200, // Position above theme toggle (adjust as needed)
    left: SIZING.spacing.lg,
    zIndex: 1001, // Higher than theme toggle (1000) so it appears above
    alignItems: 'center',
    justifyContent: 'center',
  },
  clickHereContainer: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    right: SIZING.spacing.lg + 80,
    zIndex: 1001,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clickHereBox: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clickHereText: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

