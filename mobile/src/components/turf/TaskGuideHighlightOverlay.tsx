import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';
import { SIZING } from '../../styles/theme';

interface TaskGuideHighlightOverlayProps {
  forProfile?: boolean;
  forSettings?: boolean;
  forThemeToggle?: boolean;
  forAvatarToggle?: boolean;
  forTaskGuideToggle?: boolean;
  forHome?: boolean;
  forDigitalBarracks?: boolean;
  forGarageTab?: boolean;
  forBotAssembly?: boolean;
  forGuardianSelection?: boolean;
  forQuantityInput?: boolean;
  forBuildButton?: boolean;
  forSpeedupButton?: boolean;
  forHackRig?: boolean;
  forBattalionA?: boolean;
  forGuardiansSelection?: boolean;
  forAssignBots?: boolean;
  forDeployPurge?: boolean;
}

export const TaskGuideHighlightOverlay: React.FC<TaskGuideHighlightOverlayProps> = ({ 
  forProfile = false,
  forSettings = false,
  forThemeToggle = false,
  forAvatarToggle = false,
  forTaskGuideToggle = false,
  forHome = false,
  forDigitalBarracks = false,
  forGarageTab = false,
  forBotAssembly = false,
  forGuardianSelection = false,
  forQuantityInput = false,
  forBuildButton = false,
  forSpeedupButton = false,
  forHackRig = false,
  forBattalionA = false,
  forGuardiansSelection = false,
  forAssignBots = false,
  forDeployPurge = false
}) => {
  const colors = useThemeColors();
  const { highlightTaskId, highlightStep, clearHighlight } = useTaskGuideHighlight();

  const isThemeTask = highlightTaskId === 'use-hacker-mode' || highlightTaskId === 'use-business-mode';
  const isAvatarTask = highlightTaskId === 'change-avatar';
  const isHideTaskListTask = highlightTaskId === 'hide-task-list';
  const isViewProfile = highlightTaskId === 'view-profile';
  const isVisitHome = highlightTaskId === 'visit-home';
  const isVisitDigitalBarracks = highlightTaskId === 'visit-digital-barracks';
  const isBuildGuardians = highlightTaskId === 'build-100-guardians';
  const isFreeHackRig = highlightTaskId === 'free-hack-rig';

  if (!isViewProfile && !isThemeTask && !isAvatarTask && !isHideTaskListTask && !isVisitHome && !isVisitDigitalBarracks && !isBuildGuardians && !isFreeHackRig) {
    return null;
  }

  if (isViewProfile && !forProfile) {
    return null;
  }

  if (isVisitHome && !forHome) {
    return null;
  }

  if (isVisitDigitalBarracks && !forDigitalBarracks) {
    return null;
  }

  if (isBuildGuardians) {
    if (highlightStep === null && !forHome) {
      return null;
    }
    if (highlightStep === 'garage-tab' && !forGarageTab) {
      return null;
    }
    if (highlightStep === 'bot-assembly' && !forBotAssembly) {
      return null;
    }
    if (highlightStep === 'guardian-selection' && !forGuardianSelection) {
      return null;
    }
    if (highlightStep === 'quantity-input' && !forQuantityInput) {
      return null;
    }
    if (highlightStep === 'build-button' && !forBuildButton) {
      return null;
    }
    if (highlightStep === 'speedup-button' && !forSpeedupButton) {
      return null;
    }
  }

  if (isFreeHackRig) {
    if (highlightStep === null && !forHome) {
      return null;
    }
    if (highlightStep === 'hack-rig' && !forHackRig) {
      return null;
    }
    if (highlightStep === 'battalion-a' && !forBattalionA) {
      return null;
    }
    if (highlightStep === 'guardians-selection' && !forGuardiansSelection) {
      return null;
    }
    if (highlightStep === 'assign-bots' && !forAssignBots) {
      return null;
    }
    if (highlightStep === 'deploy-purge' && !forDeployPurge) {
      return null;
    }
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

  // For hide-task-list tasks, use highlightStep to control which overlay shows (sequential flow)
  if (isHideTaskListTask) {
    // Show profile overlay on turf screen when highlightStep is null (initial state)
    if (forProfile && highlightStep === null) {
      // Allow this to render - show profile highlight on turf screen
    } else if (forProfile && highlightStep !== null) {
      return null; // Don't show profile overlay after step has advanced
    } else if (forSettings && highlightStep !== 'settings-tab') {
      return null; // Only show settings overlay when step is 'settings-tab'
    } else if (forTaskGuideToggle && highlightStep !== 'task-guide-toggle') {
      return null; // Only show task guide toggle overlay when step is 'task-guide-toggle'
    } else if (!forProfile && !forSettings && !forTaskGuideToggle) {
      return null; // Neither prop set, don't render
    }
  }

  const shouldShowOverlay = 
    (isViewProfile && forProfile) ||
    (isThemeTask && (forProfile || forSettings || forThemeToggle)) ||
    (isAvatarTask && (forProfile || forSettings || forAvatarToggle)) ||
    (isHideTaskListTask && (forProfile || forSettings || forTaskGuideToggle)) ||
    (isVisitHome && forHome) || 
    (isVisitDigitalBarracks && forDigitalBarracks) ||
    (isBuildGuardians && forHome && highlightStep === null) ||
    (isFreeHackRig && forHome && highlightStep === null) ||
    (isBuildGuardians && forGarageTab && highlightStep === 'garage-tab') ||
    (isBuildGuardians && forBotAssembly && highlightStep === 'bot-assembly') ||
    (isBuildGuardians && forGuardianSelection && highlightStep === 'guardian-selection') ||
    (isBuildGuardians && forQuantityInput && highlightStep === 'quantity-input') ||
    (isBuildGuardians && forBuildButton && highlightStep === 'build-button') ||
    (isBuildGuardians && forSpeedupButton && highlightStep === 'speedup-button') ||
    (isFreeHackRig && forHackRig && highlightStep === 'hack-rig') ||
    (isFreeHackRig && forBattalionA && highlightStep === 'battalion-a') ||
    (isFreeHackRig && forGuardiansSelection && highlightStep === 'guardians-selection') ||
    (isFreeHackRig && forAssignBots && highlightStep === 'assign-bots') ||
    (isFreeHackRig && forDeployPurge && highlightStep === 'deploy-purge');
  const overlayStyle = shouldShowOverlay
    ? [styles.overlay, { zIndex: 999 }]
    : styles.overlay;

  const handleOverlayPress = () => {
    if (isVisitDigitalBarracks) {
      clearHighlight();
    }
  };

  const shouldBeClickable = isVisitDigitalBarracks && shouldShowOverlay;

  return (
    <>
      {shouldBeClickable ? (
        <TouchableOpacity 
          style={overlayStyle} 
          activeOpacity={1}
          onPress={handleOverlayPress}
          pointerEvents="auto"
        />
      ) : shouldShowOverlay ? (
        <View style={overlayStyle} pointerEvents="none" />
      ) : null}
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

