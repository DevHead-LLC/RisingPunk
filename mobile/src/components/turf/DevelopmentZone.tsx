import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BuildCountdownTimer } from './BuildCountdownTimer';

interface DevelopmentZoneProps {
  children: React.ReactNode;
  buildingProperties?: Array<{
    propertyId: number;
    buildStatus: any;
    onComplete: () => void;
  }>;
}

export const DevelopmentZone: React.FC<DevelopmentZoneProps> = ({ children, buildingProperties = [] }) => {
  const colors = useThemeColors();

  const containerStyle = [
    styles.developmentZone,
    {
      backgroundColor: colors.matrix + '0D',
      borderColor: colors.matrix + '33'
    }
  ];

  const activeBuilds = buildingProperties.filter(prop => prop.buildStatus && prop.buildStatus.completesAt);

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
        INVESTMENT PROPERTIES
      </Text>

      {activeBuilds.length > 0 && (
        <View style={styles.timerContainer}>
          <BuildCountdownTimer
            completesAt={activeBuilds[0].buildStatus.completesAt}
            onComplete={activeBuilds[0].onComplete}
          />
        </View>
      )}
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
  timerContainer: {
    position: 'absolute',
    top: '105%',
    left: '50%',
    transform: [{ translateX: -75 }],
    alignItems: 'center',
    width: '35%',
  },
});
