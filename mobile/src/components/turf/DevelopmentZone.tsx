import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface DevelopmentZoneProps {
  children: React.ReactNode;
}

export const DevelopmentZone: React.FC<DevelopmentZoneProps> = ({ children }) => {
  const colors = useThemeColors();

  const containerStyle = [
    styles.developmentZone,
    {
      backgroundColor: colors.matrix + '0D',
      borderColor: colors.matrix + '33'
    }
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.gridContainer}>
        <View style={styles.topRow}>
          {React.Children.toArray(children).slice(0, 2)}
        </View>
        <View style={styles.bottomRow}>
          {React.Children.toArray(children).slice(2, 4)}
        </View>
      </View>
      <Text style={[styles.zoneLabel, { color: colors.secondary }]}>
        RENTAL HOUSING
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  developmentZone: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    width: 600,
    height: 350,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.lg,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SIZING.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: SIZING.spacing.lg * 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: SIZING.spacing.lg * 6,
  },
  zoneLabel: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: SIZING.spacing.lg,
    width: '100%',
  },
});
