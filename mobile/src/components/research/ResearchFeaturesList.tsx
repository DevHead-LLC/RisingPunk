import React, { useState, useEffect, useRef } from 'react';
import { useCompleteResearchMutation } from '../../store/api/researchFeaturesApi';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { FeatureModal } from './FeatureModal';
import { FeatureCard, ResearchFeature } from './FeatureCard';

export type { ResearchFeature };

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
            completedFeaturesRef.current.add(feature.id);
            completeResearch({ categoryId, featureId: feature.id }).unwrap().then((result) => {
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
    const timerRemaining = researchTimers[feature.id] || 0;
    
    return (
      <FeatureCard
        key={feature.id}
        feature={feature}
        timerRemaining={timerRemaining}
        currentBalance={currentBalance}
        isLightMode={isLightMode}
        onPress={() => {
          setSelectedFeature(feature);
          setShowFeatureModal(true);
        }}
      />
    );
  };

  // Filter features based on category
  const visibleFeatures = features.filter(feature => {
    // Filter out bot-trap for App Store submission - only show Antivirus
    if (feature.id === 'bot-trap') return false;
    
    // For hack-crew, only show "crew-system-unlock"
    if (categoryId === 'hack-crew') {
      return feature.id === 'crew-system-unlock';
    }
    
    return true;
  });

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
});
