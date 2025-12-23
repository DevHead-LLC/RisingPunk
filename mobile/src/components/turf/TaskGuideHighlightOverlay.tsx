import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';
import { SIZING } from '../../styles/theme';

export const TaskGuideHighlightOverlay: React.FC = () => {
  const colors = useThemeColors();
  const { highlightTaskId } = useTaskGuideHighlight();

  if (highlightTaskId !== 'view-profile') {
    return null;
  }

  return (
    <>
      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.clickHereContainer} pointerEvents="none">
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
  clickHereContainer: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    right: SIZING.spacing.lg + 80, // Position to the left of profile (profile is 60px wide + spacing)
    zIndex: 1001, // Higher than profile (1000) so it appears above
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

