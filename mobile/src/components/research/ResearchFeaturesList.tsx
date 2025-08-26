import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { FeatureModal } from './FeatureModal';

/**
 * RESEARCH FEATURES WITH BACKGROUND IMAGES
 * 
 * To add a background image to a feature:
 * 1. Add the image to mobile/src/assets/images/
 * 2. Add a new condition in renderFeatureCard: if (feature.id === 'your-feature-id')
 * 3. Use ImageBackground with the image source
 * 4. Call renderFeatureContent() and renderDisabledOverlay() inside ImageBackground
 * 
 * Example:
 * if (feature.id === 'bot-trap') {
 *   return (
 *     <TouchableOpacity ...>
 *       <ImageBackground source={require('../../assets/images/botTrapResearch.png')}>
 *         {renderFeatureContent()}
 *         {renderDisabledOverlay()}
 *       </ImageBackground>
 *     </TouchableOpacity>
 *   );
 * }
 */

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
  const [selectedFeature, setSelectedFeature] = useState<ResearchFeature | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);

  const renderFeatureCard = (feature: ResearchFeature) => {
    const isLightMode = colors.background === '#FAFAFA' || colors.background === '#F5F5DC';
    
    // Helper function to render feature content with consistent styling
    const renderFeatureContent = () => (
      <View style={styles.featureContent}>
        {!feature.isUnlocked && (
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
        )}
        
        <Text style={[
          styles.featureName, 
          { 
            color: isLightMode ? '#FFFFFF' : '#00FF00',
            fontWeight: '600'
          }
        ]}>
          {feature.name}
        </Text>
        
        <View style={[
          styles.featureStatus,
          {
            backgroundColor: isLightMode ? '#FEF2F2' : 'rgba(255, 255, 255, 0.1)',
            borderColor: isLightMode ? '#FECACA' : 'transparent',
            borderWidth: isLightMode ? 1 : 0,
            zIndex: feature.isUnlocked ? 2 : 0
          }
        ]}>
                  <Text style={[
          styles.statusText,
          { 
            color: currentBalance >= feature.unlockCost ? (isLightMode ? '#2563EB' : '#3B82F6') : (isLightMode ? '#DC2626' : colors.error),
            fontWeight: '600'
          }
        ]}>
          ${feature.unlockCost.toLocaleString()}
        </Text>
        </View>
      </View>
    );
    
    // Helper function to render disabled overlay
    const renderDisabledOverlay = () => (
      <View style={[
        styles.disabledOverlay,
        {
          backgroundColor: isLightMode ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.4)'
        }
      ]} />
    );
    
    // Use ImageBackground for features with background images
    if (feature.id === 'antivirus') {
      return (
        <TouchableOpacity 
          key={feature.id} 
                      style={[
              styles.featureCard, 
              { 
                borderColor: isLightMode ? '#3B82F6' : '#00FF00',
                borderWidth: isLightMode ? 1 : 1,
                shadowColor: isLightMode ? '#000000' : '#000000',
                shadowOpacity: isLightMode ? 0.1 : 0.1,
                shadowRadius: isLightMode ? 4 : 4,
                elevation: isLightMode ? 2 : 3,
                opacity: 0.8,
                overflow: 'hidden'
              }
            ]}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedFeature(feature);
            setShowFeatureModal(true);
          }}
        >
          <ImageBackground
            source={require('../../assets/images/antivirusResearch.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            {renderFeatureContent()}
            {renderDisabledOverlay()}
          </ImageBackground>
        </TouchableOpacity>
      );
    }
    
    if (feature.id === 'bot-trap') {
      return (
        <TouchableOpacity 
          key={feature.id} 
                      style={[
              styles.featureCard, 
              { 
                borderColor: isLightMode ? '#3B82F6' : '#00FF00',
                borderWidth: isLightMode ? 1 : 1,
                shadowColor: isLightMode ? '#000000' : '#000000',
                shadowOpacity: isLightMode ? 0.1 : 0.1,
                shadowRadius: isLightMode ? 4 : 4,
                elevation: isLightMode ? 2 : 3,
                opacity: 0.8,
                overflow: 'hidden'
              }
            ]}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedFeature(feature);
            setShowFeatureModal(true);
          }}
        >
          <ImageBackground
            source={require('../../assets/images/botTrapResearch.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            {renderFeatureContent()}
            {renderDisabledOverlay()}
          </ImageBackground>
        </TouchableOpacity>
      );
    }
    
    // Regular card for other features
    return (
      <TouchableOpacity 
        key={feature.id} 
        style={[
          styles.featureCard, 
          { 
            backgroundColor: isLightMode ? '#FFFFFF' : colors.surface,
            borderColor: isLightMode ? '#3B82F6' : '#00FF00',
            borderWidth: isLightMode ? 1 : 1,
            shadowColor: isLightMode ? '#000000' : '#000000',
            shadowOpacity: isLightMode ? 0.1 : 0.1,
            shadowRadius: isLightMode ? 4 : 4,
            elevation: isLightMode ? 2 : 3,
            opacity: 0.8
          }
        ]}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedFeature(feature);
          setShowFeatureModal(true);
        }}
      >
        {renderFeatureContent()}
        {renderDisabledOverlay()}
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
      
      {/* Feature Modal */}
      {selectedFeature && (
        <FeatureModal
          key={selectedFeature.id}
          visible={showFeatureModal}
          feature={selectedFeature}
          currentBalance={currentBalance}
          currentLevel={currentLevel}
          onClose={() => {
            setShowFeatureModal(false);
            // Delay clearing the selected feature to prevent content flash
            setTimeout(() => setSelectedFeature(null), 300);
          }}
          onPerformResearch={onFeatureUnlock}
        />
      )}
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
    position: 'relative',
    marginBottom: SIZING.spacing.md,
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
    fontSize: SIZING.font.small,
    fontWeight: '600',
  },
  disabledOverlay: {
    position: 'absolute',
    top: -SIZING.spacing.md,
    left: -SIZING.spacing.md,
    right: -SIZING.spacing.md,
    bottom: -SIZING.spacing.md,
    borderRadius: 12,
    pointerEvents: 'none',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
