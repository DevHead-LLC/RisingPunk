import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useGetRentalHousingIncomeQuery } from '../../store/api/rentalHousingApi';
import { formatCurrency } from '../../utils/currencyUtils';

interface FloorPlanProps {
  propertyId: number;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({ propertyId }) => {
  const colors = useThemeColors();
  const { data: rentalIncome, isLoading } = useGetRentalHousingIncomeQuery();
  
  // Get room values for this property
  const propertyData = rentalIncome?.propertyBreakdown.find(p => p.propertyId === propertyId);
  const roomValues = propertyData?.roomValues;

  return (
    <View style={styles.floorPlan}>
      {/* Main outer border */}
      <View style={[styles.outerBorder, { borderColor: colors.matrix }]} />
      
      {/* Left side - stacked colored boxes */}
      {/* Bathroom - top left */}
      <View style={[styles.room, styles.bathroom, { backgroundColor: colors.primary + '30' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.primary }]}>
          <Text style={styles.roomText}>Bathroom</Text>
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.01' : formatCurrency(roomValues?.bathroom || 0.01)}
          </Text>
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
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.01' : formatCurrency(roomValues?.kitchen || 0.01)}
          </Text>
        </View>
      </View>
      
      {/* Right side - stacked colored boxes */}
      {/* Bedroom - top right */}
      <View style={[styles.room, styles.bedroom, { backgroundColor: colors.primary + '20' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.primary }]}>
          <Text style={styles.roomText}>Bedroom</Text>
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.02' : formatCurrency(roomValues?.bedroom || 0.02)}
          </Text>
        </View>
      </View>
      
      {/* Living Room - bottom right */}
      <View style={[styles.room, styles.livingRoom, { backgroundColor: colors.secondary + '20' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.secondary }]}>
          <Text style={styles.roomText}>Living Room</Text>
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.02' : formatCurrency(roomValues?.livingRoom || 0.02)}
          </Text>
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
    justifyContent: 'center',
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
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 140,
  },
  roomText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  roomValue: {
    fontSize: 16,
    color: '#00ff00', // Green color for value
    textAlign: 'center',
    marginTop: 8,
  },
});
