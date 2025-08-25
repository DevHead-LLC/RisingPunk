import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

export interface ResearchFeature {
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  levelRequirement: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  effect: {
    type: 'unlock' | 'improvement' | 'reduction' | 'special';
    value: number | string;
    target?: string;
  };
}

interface ResearchFeaturesListProps {
  features: ResearchFeature[];
  currentLevel: number;
  currentBalance: number;
  onFeatureUnlock: (featureId: string, cost: number) => Promise<boolean>;
}

export function ResearchFeaturesList({
  features,
  currentLevel,
  currentBalance,
  onFeatureUnlock,
}: ResearchFeaturesListProps) {
  const colors = useThemeColors();

  const renderFeatureCard = (feature: ResearchFeature) => {
    const isLightMode = colors.background === '#FAFAFA' || colors.background === '#F5F5DC';
    
    return (
      <TouchableOpacity 
        key={feature.id} 
        style={[
          styles.featureCard, 
          { 
            backgroundColor: isLightMode ? '#FFFFFF' : colors.surface,
            borderColor: isLightMode ? '#E5E7EB' : 'rgba(255, 255, 255, 0.2)',
            borderWidth: isLightMode ? 1 : 2,
            shadowColor: isLightMode ? '#000000' : '#000000',
            shadowOpacity: isLightMode ? 0.1 : 0.1,
            shadowRadius: isLightMode ? 4 : 4,
            elevation: isLightMode ? 2 : 3,
            opacity: 0.8
          }
        ]}
        activeOpacity={0.7}
        onPress={() => {
          // TODO: Open feature detail modal
          console.log('Feature pressed:', feature.name);
        }}
      >
        <View style={styles.featureContent}>
          <View style={[
            styles.featureIcon,
            {
              backgroundColor: isLightMode ? '#F3F4F6' : 'rgba(255, 255, 255, 0.1)',
              borderColor: isLightMode ? '#D1D5DB' : 'rgba(255, 255, 255, 0.2)',
              borderWidth: isLightMode ? 1 : 0
            }
          ]}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          
          <Text style={[
            styles.featureName, 
            { 
              color: isLightMode ? '#1F2937' : colors.text.primary,
              fontWeight: isLightMode ? '600' : '600'
            }
          ]}>
            {feature.name}
          </Text>
          
          <View style={[
            styles.featureStatus,
            {
              backgroundColor: isLightMode ? '#FEF2F2' : 'rgba(255, 255, 255, 0.1)',
              borderColor: isLightMode ? '#FECACA' : 'transparent',
              borderWidth: isLightMode ? 1 : 0
            }
          ]}>
            <Text style={[
              styles.statusText,
              { 
                color: isLightMode ? '#DC2626' : colors.error,
                fontWeight: isLightMode ? '600' : '600'
              }
            ]}>
              LOCKED
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.featuresGrid}>
        {features.map(renderFeatureCard)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZING.spacing.md,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SIZING.spacing.md,
  },
  featureCard: {
    width: '48%',
    height: 120,
    borderRadius: 12,
    padding: SIZING.spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  lockIcon: {
    fontSize: 24,
  },
  featureName: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  featureStatus: {
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: SIZING.spacing.xs,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    fontSize: SIZING.font.caption,
    fontWeight: '600',
  },
});
