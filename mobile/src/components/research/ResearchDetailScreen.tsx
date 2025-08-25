import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { CustomButton } from '../common/CustomButton';
import { ResearchFeaturesList, ResearchFeature } from './ResearchFeaturesList';

type ResearchDetailScreenProps = {
  title: string;
  onBack: () => void;
  onClose: () => void;
  features?: ResearchFeature[];
  currentLevel?: number;
  currentBalance?: number;
  onFeatureUnlock?: (featureId: string, cost: number) => Promise<boolean>;
  children?: React.ReactNode;
};

export function ResearchDetailScreen({ 
  title, 
  onBack, 
  onClose, 
  features,
  currentLevel = 1,
  currentBalance = 0,
  onFeatureUnlock,
  children 
}: ResearchDetailScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  
  const styles = createStyles(colors);
  
  const handleFeatureUnlock = async (featureId: string, cost: number): Promise<boolean> => {
    if (onFeatureUnlock) {
      return await onFeatureUnlock(featureId, cost);
    }
    return false;
  };

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
          onFeatureUnlock={handleFeatureUnlock}
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
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
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
  backButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
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
    textAlign: 'center',
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
});
