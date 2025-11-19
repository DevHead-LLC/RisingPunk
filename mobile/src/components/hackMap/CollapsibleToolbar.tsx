import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { CloseButton } from '../common/CloseButton';
import { useGetShieldStatusQuery } from '../../store/api/antivirusApi';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CollapsibleToolbarProps {
  onAntivirusPress: () => void;
  isAntivirusUnlocked?: boolean;
  onHackCrewPress?: () => void;
  isHackCrewUnlocked?: boolean;
  isInCrew?: boolean;
}

export const CollapsibleToolbar: React.FC<CollapsibleToolbarProps> = ({
  onAntivirusPress,
  isAntivirusUnlocked = false,
  onHackCrewPress,
  isHackCrewUnlocked = false,
  isInCrew = false,
}) => {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: shieldData } = useGetShieldStatusQuery(undefined, {
    pollingInterval: 1000, // Poll every second for real-time updates
  });

  const isShieldActive = shieldData?.isActive || false;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Don't render the toolbar at all if neither feature is unlocked
  if (!isAntivirusUnlocked && !isHackCrewUnlocked) {
    return null;
  }

  // Calculate number of unlocked icons
  const iconCount = (isAntivirusUnlocked ? 1 : 0) + (isHackCrewUnlocked ? 1 : 0);
  const iconWidth = 36;
  const horizontalPadding = SIZING.spacing.md;
  const toolbarWidth = (iconWidth * iconCount) + (horizontalPadding * 2);

  const styles = createStyles(colors, toolbarWidth);

  return (
    <View style={styles.container}>
      {/* Arrow button - ALWAYS in the same position */}
      <TouchableOpacity
        style={styles.arrowButton}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Text style={styles.arrowText}>{isExpanded ? '›' : '‹'}</Text>
      </TouchableOpacity>

      {/* Toolbar - appears to the left of the arrow when expanded */}
      {isExpanded && (
        <View style={styles.expandedToolbar}>
          {/* Antivirus Shield */}
          {isAntivirusUnlocked && (
            <TouchableOpacity
              style={styles.toolButton}
              onPress={onAntivirusPress}
              activeOpacity={0.7}
            >
              <Image
                source={isShieldActive 
                  ? require('../../assets/images/hackMap/activatedShield.png')
                  : require('../../assets/images/hackMap/antivirusShield.png')
                }
                style={styles.toolIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
          
          {/* Hack Crew */}
          {isHackCrewUnlocked && (
            <TouchableOpacity
              style={styles.toolButton}
              onPress={onHackCrewPress}
              activeOpacity={0.7}
            >
              <Image
                source={isInCrew 
                  ? require('../../assets/images/hackMap/hackCrewActive.png')
                  : require('../../assets/images/hackMap/hackCrew.png')
                }
                style={styles.toolIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: any, toolbarWidth: number) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: SIZING.spacing.lg,
    right: SIZING.spacing.lg,
    zIndex: 1000,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  arrowText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  expandedToolbar: {
    position: 'absolute',
    right: 50, // Position to the left of the arrow button (36px + 14px margin)
    top: -8, // Slight vertical adjustment for better alignment
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: toolbarWidth,
    minHeight: 50,
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'transparent',
    width: 36,
    height: 36,
  },
  disabledToolButton: {
    opacity: 0.5,
  },
  toolIcon: {
    width: 32,
    height: 32,
  },
});

