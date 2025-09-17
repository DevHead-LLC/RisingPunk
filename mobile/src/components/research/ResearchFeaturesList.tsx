import React, { useState, useEffect, useRef } from 'react';
import { useCompleteResearchMutation } from '../../store/api/researchFeaturesApi';
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
  researchTimeHours?: number;
  isResearching?: boolean;
  researchStartedAt?: Date;
  researchCompletesAt?: Date;
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
  categoryId: string; // Add categoryId prop
  onResearchStarted?: () => void;
}

export function ResearchFeaturesList({
  features,
  currentLevel,
  currentBalance,
  categoryId,
  onResearchStarted,
}: ResearchFeaturesListProps) {
  const colors = useThemeColors();
  const [selectedFeature, setSelectedFeature] = useState<ResearchFeature | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [researchTimers, setResearchTimers] = useState<Record<string, number>>({});
  const [completeResearch] = useCompleteResearchMutation();
  const completedFeaturesRef = useRef<Set<string>>(new Set());

  // Format time remaining as HH:MM:SS
  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update research timers and handle automatic completion
  useEffect(() => {
    const researchingFeatures = features.filter(f => f.isResearching && f.researchCompletesAt);
    
    if (researchingFeatures.length === 0) {
      setResearchTimers({});
      completedFeaturesRef.current.clear();
      return;
    }

    const updateTimers = () => {
      const now = new Date().getTime();
      const newTimers: Record<string, number> = {};
      
      researchingFeatures.forEach((feature) => {
        // Skip if already completed
        if (completedFeaturesRef.current.has(feature.id)) {
          return;
        }

        if (feature.researchCompletesAt) {
          const completesAt = new Date(feature.researchCompletesAt).getTime();
          const remaining = Math.max(0, completesAt - now);
          newTimers[feature.id] = remaining;
          
          // Auto-complete research when timer reaches zero
          if (remaining === 0) {
            console.log('🔬 RESEARCH: ⚡ TIMER REACHED ZERO! Completing research for:', feature.id);
            completedFeaturesRef.current.add(feature.id);
            completeResearch({ categoryId, featureId: feature.id }).unwrap().then((result) => {
              console.log('🔬 RESEARCH: ✅ Successfully completed research:', result);
              onResearchStarted?.();
            }).catch((error) => {
              console.error('🔬 RESEARCH: ❌ Failed to complete research:', error);
              completedFeaturesRef.current.delete(feature.id);
            });
          }
        }
      });
      
      setResearchTimers(newTimers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    
    return () => clearInterval(interval);
  }, [features, completeResearch, categoryId, onResearchStarted]);

  const renderFeatureCard = (feature: ResearchFeature) => {
    const isLightMode = colors.background === '#FAFAFA' || colors.background === '#F5F5DC';
    
    // Check if timer has reached zero - if so, consider it unlocked
    const timerRemaining = researchTimers[feature.id] || 0;
    const isActuallyUnlocked = feature.isUnlocked || (feature.isResearching && timerRemaining === 0);
    
    // Helper function to render feature content with consistent styling
    const renderFeatureContent = () => (
      <View style={styles.featureContent}>
        {!isActuallyUnlocked && (
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
            backgroundColor: feature.isResearching ? (isLightMode ? '#F0FDF4' : 'rgba(16, 185, 129, 0.1)') : 
                            feature.isUnlocked ? (isLightMode ? '#F0F9FF' : 'rgba(59, 130, 246, 0.1)') :
                            (isLightMode ? '#FEF2F2' : 'rgba(255, 255, 255, 0.1)'),
            borderColor: feature.isResearching ? (isLightMode ? '#BBF7D0' : '#10B981') :
                        feature.isUnlocked ? (isLightMode ? '#BFDBFE' : '#3B82F6') :
                        (isLightMode ? '#FECACA' : 'transparent'),
            borderWidth: isLightMode ? 1 : 0,
            zIndex: feature.isUnlocked ? 2 : 0
          }
        ]}>
          <Text style={[
            styles.statusText,
            { 
              color: feature.isResearching ? (isLightMode ? '#059669' : '#10B981') :
                    feature.isUnlocked ? (isLightMode ? '#2563EB' : '#3B82F6') :
                    currentBalance >= feature.unlockCost ? (isLightMode ? '#2563EB' : '#3B82F6') : (isLightMode ? '#DC2626' : colors.error),
              fontWeight: '600'
            }
          ]}>
            {feature.isResearching && timerRemaining > 0 ? 
              formatTimeRemaining(timerRemaining) :
              `$${feature.unlockCost.toLocaleString()}`}
          </Text>
        </View>
      </View>
    );
    
    // Helper function to render disabled overlay
    const renderDisabledOverlay = () => {
      // Don't show disabled overlay only if fully unlocked
      if (isActuallyUnlocked) {
        return null;
      }
      
      return (
        <View style={[
          styles.disabledOverlay,
          {
            backgroundColor: isLightMode ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.4)'
          }
        ]} />
      );
    };
    
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
            {isActuallyUnlocked ? (
              // COMPLETED STATE: Centered text + checkmark
              <View style={styles.antivirusContent}>
                <Text style={[
                  styles.antivirusTitle,
                  { 
                    color: isLightMode ? '#FFFFFF' : '#00FF00',
                    fontWeight: '600'
                  }
                ]}>
                  {feature.name}
                </Text>
              </View>
            ) : (
              // RESEARCHING STATE: Original layout with timer, lock, price
              renderFeatureContent()
            )}
            {renderDisabledOverlay()}
            {isActuallyUnlocked && (
              <View style={styles.completionCheckmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
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

  // Filter out bot-trap for App Store submission - only show Antivirus
  const visibleFeatures = features.filter(feature => feature.id !== 'bot-trap');

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.featuresGrid}>
        {visibleFeatures.map(renderFeatureCard)}
      </View>
      
      {/* Feature Modal */}
      {selectedFeature && (
        <FeatureModal
          key={selectedFeature.id}
          visible={showFeatureModal}
          feature={selectedFeature}
          currentBalance={currentBalance}
          currentLevel={currentLevel}
          categoryId={categoryId}
          onClose={() => {
            setShowFeatureModal(false);
            // Delay clearing the selected feature to prevent content flash
            setTimeout(() => setSelectedFeature(null), 300);
          }}
            onResearchStarted={() => {
              onResearchStarted?.();
            }}
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
  completionCheckmark: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 25,
    height: 25,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  antivirusContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  antivirusTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
