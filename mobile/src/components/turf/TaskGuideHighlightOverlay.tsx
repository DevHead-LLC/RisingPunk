import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';
import { SIZING } from '../../styles/theme';

interface TaskGuideHighlightOverlayProps {
  forProfile?: boolean;
  forSettings?: boolean;
  forThemeToggle?: boolean;
}

export const TaskGuideHighlightOverlay: React.FC<TaskGuideHighlightOverlayProps> = ({ 
  forProfile = false,
  forSettings = false,
  forThemeToggle = false
}) => {
  const colors = useThemeColors();
  const { highlightTaskId, highlightStep } = useTaskGuideHighlight();

  const isThemeTask = highlightTaskId === 'use-hacker-mode' || highlightTaskId === 'use-business-mode';
  const isViewProfile = highlightTaskId === 'view-profile';

  if (!isViewProfile && !isThemeTask) {
    return null;
  }

  if (isViewProfile && !forProfile) {
    return null;
  }

  if (isThemeTask && !forSettings && !forThemeToggle) {
    return null;
  }

  let clickHerePosition = styles.clickHereContainer;
  if (forProfile) {
    clickHerePosition = styles.clickHereContainerProfile;
  } else if (forSettings) {
    clickHerePosition = styles.clickHereContainerSettings;
  } else if (forThemeToggle) {
    clickHerePosition = styles.clickHereContainerThemeToggle;
  }

  return (
    <>
      <View style={styles.overlay} pointerEvents="none" />
      <View style={clickHerePosition} pointerEvents="none">
        <View style={[styles.clickHereBox, { backgroundColor: colors.background, borderColor: colors.primary }]}>
          <Text style={[styles.clickHereText, { color: colors.text.primary }]}>
            Click Here
          </Text>
        </View>
      </View>
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

