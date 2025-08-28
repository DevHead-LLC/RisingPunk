import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

interface HomeFloorPlanProps {
  onHackRigPress: () => void;
  onNavigateToBattle: () => void;
}

export const HomeFloorPlan: React.FC<HomeFloorPlanProps> = ({ 
  onHackRigPress, 
  onNavigateToBattle 
}) => {
  const colors = useThemeColors();

  return (
    <View style={styles.floorPlan}>
      {/* Main outer border */}
      <View style={[styles.outerBorder, { borderColor: colors.matrix }]} />
      
      {/* Left side - stacked colored boxes */}
      {/* Bathroom - top left */}
      <View style={[styles.room, styles.bathroom, { backgroundColor: colors.primary + '30' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.primary }]}>
          <Text style={styles.roomText}>Bathroom</Text>
        </View>
      </View>
      
      {/* Entrance - middle left */}
      <View style={[styles.room, styles.entrance, { backgroundColor: colors.secondary + '30' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.secondary }]}>
          <Text style={styles.roomText}>Entrance</Text>
        </View>
      </View>
      
      {/* Kitchen - bottom left */}
      <View style={[styles.room, styles.kitchen, { backgroundColor: colors.primary + '30' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.primary }]}>
          <Text style={styles.roomText}>Kitchen</Text>
        </View>
      </View>
      
      {/* Right side - stacked colored boxes */}
      {/* Bedroom - top right - This will contain the HackRig */}
      <View style={[styles.room, styles.bedroom, { backgroundColor: colors.primary + '20' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.primary }]}>
          <Text style={styles.roomText}>Bedroom</Text>
        </View>
        {/* HackRig will be placed here */}
      </View>
      
      {/* Living Room - bottom right */}
      <View style={[styles.room, styles.livingRoom, { backgroundColor: colors.secondary + '20' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.secondary }]}>
          <Text style={styles.roomText}>Living Room</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floorPlan: {
    width: 1200,
    height: 900,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  outerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderStyle: 'solid',
    borderRadius: 8,
  },
  room: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  bathroom: {
    top: 20,
    left: 20,
    width: 380,
    height: 280,
  },
  entrance: {
    top: 320,
    left: 20,
    width: 380,
    height: 280,
  },
  kitchen: {
    top: 620,
    left: 20,
    width: 380,
    height: 260,
  },
  bedroom: {
    top: 20,
    right: 20,
    width: 780,
    height: 430,
  },
  livingRoom: {
    bottom: 20,
    right: 20,
    width: 780,
    height: 430,
  },
  roomLabel: {
    padding: 5,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 100,
    marginTop: 5,
  },
  roomText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});
