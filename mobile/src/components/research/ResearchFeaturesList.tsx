import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCompleteResearchMutation } from '../../store/api/researchFeaturesApi';
import { useGetCrewStatusQuery, useGetCrewDetailsQuery, useRequestCrewBackupMutation } from '../../store/api/authApi';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useAppSelector } from '../../store/hooks';
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
  const currentUserId = useAppSelector((state) => state.auth.user?._id ?? (state.auth.user as any)?.id);
  const [selectedFeature, setSelectedFeature] = useState<ResearchFeature | null>(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [researchTimers, setResearchTimers] = useState<Record<string, number>>({});
  const [completeResearch] = useCompleteResearchMutation();
  const [requestCrewBackup] = useRequestCrewBackupMutation();
  const completedFeaturesRef = useRef<Set<string>>(new Set());

  const hasAnyResearching = useMemo(() => features.some((f) => f.isResearching), [features]);
  const { data: crewStatus } = useGetCrewStatusQuery(undefined, { skip: !hasAnyResearching });
  const { data: crewDetails, refetch: refetchCrewDetails } = useGetCrewDetailsQuery(crewStatus?.crewId ?? '', {
    skip: !hasAnyResearching || !crewStatus?.crewId || !crewStatus?.isInCrew,
  });

  const hasRequestedBackupForFeature = useMemo(() => {
    const backupRequests = crewDetails?.crew?.backupRequests ?? [];
    return (feature: ResearchFeature) =>
      Boolean(
        currentUserId &&
          backupRequests.some(
            (r) =>
              String(r.userId) === String(currentUserId) &&
              r.jobType === 'research' &&
              r.categoryId === categoryId &&
              r.featureId === feature.id
          )
      );
  }, [crewDetails?.crew?.backupRequests, currentUserId, categoryId]);

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
    const showRequestBackup =
      Boolean(crewStatus?.isInCrew && crewDetails != null && feature.isResearching && (researchTimers[feature.id] ?? 0) > 0) &&
      !hasRequestedBackupForFeature(feature);

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
        showRequestBackup={showRequestBackup}
        onRequestBackup={
          showRequestBackup
            ? () => {
                console.log('[ResearchFeaturesList] CLICKED research Request back-up cat=' + categoryId + ' feat=' + feature.id);
                requestCrewBackup({ categoryId, featureId: feature.id });
              }
            : undefined
        }
      />
    );
  };

  // Show all features per category (spec 18); temporarily hide some until future development
  const visibleFeatures = features.filter(feature => {
    if (feature.id === 'bot-trap') return false;
    // probe: shown (5.4 Probe feature implemented)
    if (feature.id === 'mark-2-bots') return false; // TODO: re-enable when planned feature 5.4 (Research Center new abilities) is done
    if (feature.id === 'crew-strength-increase') return false; // TODO: re-enable when planned feature 5.4 (Research Center new abilities) is done
    if (feature.id === 'energy-regen-increase') return false; // TODO: re-enable when planned feature 5.4 (Research Center new abilities) is done
    if (feature.id === 'energy-max-increase') return false; // TODO: re-enable when planned feature 5.4 (Research Center new abilities) is done
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
