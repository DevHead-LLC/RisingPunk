import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onBack} />
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>
          Investment Property {propertyId} Floor Plan
        </Text>
        
        <View style={[styles.floorPlanContainer, { borderColor: colors.matrix }]}>
          <Text style={[styles.floorPlanText, { color: colors.secondary }]}>
            Floor Plan Details Coming Soon
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SIZING.spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.xl,
    letterSpacing: 1,
  },
  floorPlanContainer: {
    padding: SIZING.spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    minWidth: 300,
  },
  floorPlanText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    opacity: 0.7,
  },
});
