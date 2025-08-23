import React from 'react';
import { TouchableOpacity, View, Image, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface DevelopmentIconProps {
  isBuilding: boolean;
  isUnlocked: boolean;
  emptyImage: any;
  completedImage: any;
  underConstructionImage?: any;
  onPress: () => void;
  size?: number;
  iconSize?: number;
}

export const DevelopmentIcon: React.FC<DevelopmentIconProps> = ({
  isBuilding,
  isUnlocked,
  emptyImage,
  completedImage,
  underConstructionImage,
  onPress,
  size = 120,
  iconSize = 100
}) => {
  const colors = useThemeColors();

  const getImageSource = () => {
    if (isBuilding) {
      return underConstructionImage || require('../../assets/images/underConstruction.png');
    } else if (isUnlocked) {
      return completedImage;
    } else {
      return emptyImage;
    }
  };

  const containerStyle = [
    styles.iconContainer,
    {
      width: size,
      height: size,
      borderColor: colors.matrix
    }
  ];

  const iconStyle = [
    styles.locationIcon,
    {
      width: iconSize,
      height: iconSize
    }
  ];

  return (
    <TouchableOpacity
      style={styles.location}
      onPress={onPress}
    >
      <View style={containerStyle}>
        <Image
          source={getImageSource()}
          style={iconStyle}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  location: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 3,
    paddingTop: SIZING.spacing.md,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  locationIcon: {
    resizeMode: 'contain' as const,
  },
});
