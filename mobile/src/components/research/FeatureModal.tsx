import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ResearchFeature } from './ResearchFeaturesList';
import { useStartResearchMutation, useCompleteResearchMutation } from '../../store/api/researchFeaturesApi';

interface FeatureModalProps {
  visible: boolean;
  feature: ResearchFeature;
  currentBalance: number;
  currentLevel: number;
  categoryId?: string; // Add categoryId prop
  onClose: () => void;
  onResearchStarted?: () => void;
}

export function FeatureModal({
  visible,
  feature,
  currentBalance,
  currentLevel,
  categoryId = 'home-defense', // Default to home-defense
  onClose,
  onResearchStarted,
}: FeatureModalProps) {
  const colors = useThemeColors();
  const [isResearching, setIsResearching] = useState(false);
  const [researchTimeRemaining, setResearchTimeRemaining] = useState(0);
  const [startResearch, { isLoading: isStartingResearch }] = useStartResearchMutation();
  const [completeResearch, { isLoading: isCompletingResearch }] = useCompleteResearchMutation();
  const isLightMode = colors.background === '#FAFAFA' || colors.background === '#F5F5DC';
  
  const canAfford = currentBalance >= feature.unlockCost;
  const meetsLevelRequirement = currentLevel >= feature.levelRequirement;
  const researchTimeHours = feature.researchTimeHours || 4; // Default to 4 hours if not specified
  
  // Check if research is in progress
  const isCurrentlyResearching = feature.isResearching || false;
  
  // Calculate time remaining if research is in progress
  useEffect(() => {
    if (isCurrentlyResearching && feature.researchCompletesAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const completesAt = new Date(feature.researchCompletesAt!).getTime();
        const remaining = Math.max(0, completesAt - now);
        setResearchTimeRemaining(remaining);
        
        if (remaining === 0) {
          console.log('🔬 RESEARCH: Timer reached zero, attempting to complete research for:', feature.id);
          // Research completed - automatically complete it
          completeResearch({ categoryId, featureId: feature.id }).unwrap().then((result) => {
            console.log('🔬 RESEARCH: Successfully completed research:', result);
            setIsResearching(false);
            // RTK Query will automatically invalidate cache and refetch data
          }).catch((error) => {
            console.error('🔬 RESEARCH: Failed to complete research:', error);
          });
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [isCurrentlyResearching, feature.researchCompletesAt, feature.id, completeResearch, categoryId, onResearchStarted]);
  
  const handlePerformResearch = async () => {
    if (canAfford && meetsLevelRequirement && !isCurrentlyResearching) {
      try {
        const result = await startResearch({ categoryId, featureId: feature.id }).unwrap();
        setIsResearching(true);
        onResearchStarted?.();
        onClose(); // Close modal after starting research
      } catch (error) {
        console.error('Failed to start research:', error);
      }
    }
  };
  
  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderLockedModal = () => (
    <View style={styles.modalContent}>
      <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
        {feature.name}
      </Text>
      
      <Text style={[styles.modalDescription, { color: colors.text.secondary }]}>
        {feature.description}
      </Text>
      
      <View style={styles.requirementsContainer}>
        <Text style={[styles.requirementsTitle, { color: colors.text.primary }]}>
          Requirements to Unlock:
        </Text>
        
        <View style={styles.requirementRow}>
          <Text style={[styles.requirementLabel, { color: colors.text.secondary }]}>
            Level Required:
          </Text>
          <Text style={[
            styles.requirementValue,
            { color: meetsLevelRequirement ? colors.success : colors.error }
          ]}>
            {currentLevel}/{feature.levelRequirement}
          </Text>
        </View>
        
        <View style={styles.requirementRow}>
          <Text style={[styles.requirementLabel, { color: colors.text.secondary }]}>
            Balance Required:
          </Text>
          <Text style={[
            styles.requirementValue,
            { color: canAfford ? colors.success : colors.error }
          ]}>
            ${feature.unlockCost.toLocaleString()}
          </Text>
        </View>
      </View>
      
      {/* Show research button if conditions are met, or disabled button if conditions not met */}
      {!isCurrentlyResearching && (
        <TouchableOpacity
          style={[
            styles.researchButton,
            { 
              backgroundColor: (canAfford && meetsLevelRequirement) ? colors.secondary : '#6B7280',
              opacity: isStartingResearch ? 0.6 : 1
            }
          ]}
          onPress={handlePerformResearch}
          disabled={isStartingResearch || !canAfford || !meetsLevelRequirement}
        >
          <Text style={[styles.researchButtonText, { color: '#FFFFFF' }]}>
            {isStartingResearch ? 'Starting Research...' : 
             !canAfford ? 'Insufficient Funds' :
             !meetsLevelRequirement ? 'Level Too Low' :
             'Perform Research'}
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.primary }]}
        onPress={onClose}
      >
        <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>
          Close
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderUnlockedModal = () => (
    <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#8B5CF6' }]}>
        {feature.name}
      </Text>

      <Text style={[styles.modalDescription, { color: isLightMode ? '#374151' : '#CBD5E1' }]}>
        {feature.description}
      </Text>
      
      <View style={styles.researchInfoContainer}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: '#8B5CF6', textDecorationLine: 'underline' }]}>
            Research Cost:
          </Text>
          <Text style={[styles.infoValue, { color: isLightMode ? '#374151' : '#F1F5F9' }]}>
            ${feature.unlockCost.toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: '#8B5CF6', textDecorationLine: 'underline' }]}>
            Research Time:
          </Text>
          <Text style={[styles.infoValue, { color: isLightMode ? '#374151' : '#F1F5F9' }]}>
            {researchTimeHours} hours
          </Text>
        </View>
      </View>
      
      {isCurrentlyResearching ? (
        <View style={[styles.researchingContainer, { backgroundColor: '#1F2937' }]}>
          <Text style={[styles.researchingTitle, { color: '#10B981' }]}>
            Research in Progress
          </Text>
          <Text style={[styles.researchingTime, { color: '#F1F5F9' }]}>
            {formatTimeRemaining(researchTimeRemaining)}
          </Text>
          <Text style={[styles.researchingSubtext, { color: '#9CA3AF' }]}>
            Research will complete automatically
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.researchButton,
            {
              backgroundColor: (canAfford && meetsLevelRequirement) ? '#7C3AED' : '#EF4444',
              opacity: (canAfford && meetsLevelRequirement) ? 1 : 0.6
            }
          ]}
          onPress={handlePerformResearch}
          disabled={!canAfford || !meetsLevelRequirement || isStartingResearch}
        >
          <Text style={[styles.researchButtonText, { color: '#FFFFFF' }]}>
            {isStartingResearch ? 'Starting Research...' : 
             !canAfford ? 'Insufficient Funds' :
             !meetsLevelRequirement ? 'Level Too Low' :
             'Perform Research'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: '#475569' }]}
        onPress={onClose}
      >
        <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>
          Close
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderComingSoonOverlay = () => (
    <View style={styles.comingSoonOverlay}>
      <View style={[
        styles.comingSoonContent,
        {
          backgroundColor: colors.background,
          borderColor: colors.matrix,
        }
      ]}>
        <Text style={[
          styles.comingSoonText,
          { color: colors.matrix }
        ]}>Coming Soon</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
      statusBarTranslucent={false}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modal,
          {
            backgroundColor: colors.background,
            borderColor: colors.primary
          }
        ]}>
          {feature.isUnlocked ? renderUnlockedModal() : renderLockedModal()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.md,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 2,
    padding: SIZING.spacing.lg,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginBottom: SIZING.spacing.lg,
    lineHeight: 20,
  },
  requirementsContainer: {
    width: '100%',
    marginBottom: SIZING.spacing.lg,
  },
  requirementsTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  requirementLabel: {
    fontSize: SIZING.font.body,
  },
  requirementValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  researchInfoContainer: {
    width: '100%',
    marginBottom: SIZING.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  infoLabel: {
    fontSize: SIZING.font.body,
  },
  infoValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  researchButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    marginBottom: SIZING.spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  researchButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  researchingContainer: {
    width: '100%',
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SIZING.spacing.lg,
  },
  researchingTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: '700',
    marginBottom: SIZING.spacing.sm,
  },
  researchingTime: {
    fontSize: SIZING.font.h2,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginBottom: SIZING.spacing.xs,
  },
  researchingSubtext: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comingSoonContent: {
    padding: SIZING.spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  comingSoonText: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
});
