import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { CustomButton } from '../common/CustomButton';
import { Balance } from '../common/Balance';
import { ResearchFeaturesList, ResearchFeature } from './ResearchFeaturesList';

type ResearchDetailScreenProps = {
  title: string;
  onBack: () => void;
  onClose: () => void;
  features?: ResearchFeature[];
  currentLevel?: number;
  currentBalance?: number;
  categoryId?: string; // Add categoryId prop
  onResearchStarted?: () => void;
  children?: React.ReactNode;
};

export function ResearchDetailScreen({ 
  title, 
  onBack, 
  onClose, 
  features,
  currentLevel = 1,
  currentBalance = 0,
  categoryId = 'home-defense', // Default to home-defense
  onResearchStarted,
  children 
}: ResearchDetailScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  
  const styles = createStyles(colors);
  

  const renderContent = () => {
    if (children) {
      return children;
    }
    
    if (features && features.length > 0) {
      return (
        <ResearchFeaturesList
          features={features}
          currentLevel={currentLevel}
          currentBalance={currentBalance}
          categoryId={categoryId}
          onResearchStarted={onResearchStarted}
        />
      );
    }
    
    return (
      <View style={styles.content}>
        <Text style={styles.placeholderText}>Research content for {title} will be implemented here.</Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={styles.balanceWrapper}>
            <Balance />
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rightSection}>
          <TouchableOpacity 
            style={[
              styles.backButton, 
              { 
                backgroundColor: colors.primary,
                borderColor: colors.primary
              }
            ]} 
            onPress={onBack}
          >
            <Text style={[styles.backButtonText, { color: '#FFFFFF' }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {renderContent()}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  backButton: {
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
    borderWidth: 2,
    borderRadius: 22,
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 28,
    marginTop: -2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZING.spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZING.spacing.lg,
  },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'center',
  },
  balanceWrapper: {
    position: 'absolute',
    top: -SIZING.spacing.lg,
    zIndex: 9999,
  },
});
