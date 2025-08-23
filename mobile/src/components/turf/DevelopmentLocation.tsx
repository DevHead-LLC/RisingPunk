import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface DevelopmentLocationProps {
  children: ReactNode;
  position: {
    top: string;
    left: string;
    transformX?: number;
    transformY?: number;
  };
  width?: number;
  height?: string;
  zIndex?: number;
}

export const DevelopmentLocation: React.FC<DevelopmentLocationProps> = ({
  children,
  position,
  width = 300,
  height = '11%',
  zIndex = 1
}) => {
  const colors = useThemeColors();

  const containerStyle = [
    styles.container,
    {
      top: position.top,
      left: position.left,
      transform: [
        { translateX: position.transformX || -150 },
        ...(position.transformY ? [{ translateY: position.transformY }] : [])
      ],
      width,
      height,
      zIndex,
      backgroundColor: colors.matrix + '0D',
      borderColor: colors.matrix + '33'
    }
  ];

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: SIZING.spacing.lg,
    paddingTop: SIZING.spacing.md,
  },
});
