import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface DevelopmentLabelProps {
  isBuilding: boolean;
  unlockedText: string;
  buildingText?: string;
  width?: number;
  leftOffset?: number;
}

export const DevelopmentLabel: React.FC<DevelopmentLabelProps> = ({
  isBuilding,
  unlockedText,
  buildingText = 'UNDER CONSTRUCTION',
  width = 400,
  leftOffset = -50
}) => {
  const colors = useThemeColors();

  const labelText = isBuilding ? buildingText : unlockedText;

  const labelStyle = [
    styles.locationLabel,
    {
      color: colors.secondary,
      width,
      left: leftOffset
    }
  ];

  return (
    <Text style={labelStyle}>
      {labelText}
    </Text>
  );
};

const styles = StyleSheet.create({
  locationLabel: {
    fontSize: SIZING.font.body,
    letterSpacing: 2,
    textAlign: 'center',
    position: 'absolute',
    bottom: '20%',
  },
});
