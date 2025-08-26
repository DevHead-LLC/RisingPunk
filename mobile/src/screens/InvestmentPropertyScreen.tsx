import React, { useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Text } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { FloorPlan } from '../components/common/FloorPlan';

interface InvestmentPropertyScreenProps {
  propertyId: number;
  onBack: () => void;
}

export const InvestmentPropertyScreen: React.FC<InvestmentPropertyScreenProps> = ({
  propertyId,
  onBack
}) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Center the view on the Property text at the top center
    const screenWidth = Dimensions.get('window').width;
    const floorPlanWidth = 1200;
    const centerX = (floorPlanWidth - screenWidth) / 2;
    const centerY = 0; // Start at the top to show Property text
    
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: centerX,
        y: centerY,
        animated: false,
      });
    }, 100);
  }, [propertyId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onBack} />
      
      {/* Fixed Property pill at top center of screen */}
      <View style={[styles.fixedPropertyPill, { backgroundColor: colors.primary }]}>
        <Text style={styles.fixedPropertyText}>Property {propertyId}</Text>
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        directionalLockEnabled={false}
        alwaysBounceHorizontal={true}
        alwaysBounceVertical={true}
      >
        <View style={[styles.floorPlanContainer, { borderColor: colors.matrix }]}>
          <FloorPlan propertyId={propertyId} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 1250,
    height: 950,
  },
  floorPlanContainer: {
    padding: SIZING.spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 950,
    minWidth: 1250,
  },
  fixedPropertyPill: {
    position: 'absolute',
    top: 15, // Moved up slightly from 20px
    left: '50%',
    transform: [{ translateX: -70 }], // Adjusted for smaller width
    paddingHorizontal: 25, // Reduced from 30px
    paddingVertical: 12, // Reduced from 15px
    borderRadius: 25,
    minWidth: 140, // Reduced from 160px
    zIndex: 1000, // Ensure it's above everything
  },
  fixedPropertyText: {
    fontSize: 20, // Reduced from 24px
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});
