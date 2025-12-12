import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ResearchFeature } from './ResearchFeaturesList';
import { useStartResearchMutation, useCompleteResearchMutation, useSpeedupFeatureResearchMutation } from '../../store/api/researchFeaturesApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { LockedFeatureModal } from '../turf/LockedFeatureModal';

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
  const dispatch = useAppDispatch();
  const currentBalanceState = useAppSelector((state) => state.balance);
  const [isResearching, setIsResearching] = useState(false);
  const [researchTimeRemaining, setResearchTimeRemaining] = useState(0);
  const [isSpeedupLoading, setIsSpeedupLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [startResearch, { isLoading: isStartingResearch }] = useStartResearchMutation();
  const [completeResearch, { isLoading: isCompletingResearch }] = useCompleteResearchMutation();
  const [speedupFeatureResearch] = useSpeedupFeatureResearchMutation();
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
          // Research completed - automatically complete it
          completeResearch({ categoryId, featureId: feature.id }).unwrap().then((result) => {
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

  // Calculate speedup cost: $5 per second remaining
  const getSpeedupCost = (): number => {
    const seconds = Math.ceil(researchTimeRemaining / 1000);
    return seconds * 5;
  };

  const speedupCost = getSpeedupCost();
  const canAffordSpeedup = currentBalance >= speedupCost && researchTimeRemaining > 0;

  const handleSpeedup = async () => {
    if (!canAffordSpeedup || isSpeedupLoading) {
      return;
    }

    setIsSpeedupLoading(true);
    try {
      const result = await speedupFeatureResearch({ categoryId, featureId: feature.id }).unwrap();
      
      // Update balance
      if (result.newBalance !== undefined) {
        dispatch(updateBalance({
          total: result.newBalance,
          ratePerSecond: currentBalanceState.ratePerSecond,
          lastUpdated: currentBalanceState.lastUpdated ? new Date(currentBalanceState.lastUpdated) : null,
          fractionalRemainder: currentBalanceState.fractionalRemainder
        }));
      }
      
      // Close modal and trigger refresh
      onResearchStarted?.();
      onClose();
    } catch (error: any) {
      console.error('Error speeding up research:', error);
      // Show error modal with appropriate message
      if (error?.data?.error === 'Insufficient funds') {
        setErrorMessage('You do not have sufficient funds to speed up this research.');
      } else {
        const errorMsg = error?.data?.message || error?.data?.error || 'Failed to speed up research. Please try again.';
        setErrorMessage(errorMsg);
      }
      setShowErrorModal(true);
    } finally {
      setIsSpeedupLoading(false);
    }
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
        
        <View style={styles.requirementRow}>
          <Text style={[styles.requirementLabel, { color: colors.text.secondary }]}>
            Research Time:
          </Text>
          <Text style={[styles.requirementValue, { color: colors.text.primary }]}>
            {researchTimeHours} hours
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
      
      {/* Only show research cost/time if research is NOT in progress */}
      {!isCurrentlyResearching && (
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
      )}
      
      {isCurrentlyResearching ? (
        <View style={styles.researchingStatus}>
          <Text style={[styles.researchingTitle, { color: '#10B981' }]}>
            Research in Progress
          </Text>
          <Text style={[styles.researchingTime, { color: '#F1F5F9' }]}>
            {formatTimeRemaining(researchTimeRemaining)}
          </Text>
          <Text style={[styles.researchingSubtext, { color: '#9CA3AF' }]}>
            Research will complete automatically
          </Text>
          
          {/* Speedup Section */}
          {researchTimeRemaining > 0 && (
            <View style={styles.speedupContainer}>
              <View style={styles.speedupInfo}>
                <Text style={[styles.speedupLabel, { color: isLightMode ? '#374151' : '#CBD5E1' }]}>
                  Finish this research now for:
                </Text>
                <Text style={[styles.speedupCost, { color: '#8B5CF6' }]}>
                  ${speedupCost.toLocaleString()}
                </Text>
              </View>
              <View style={styles.balanceInfo}>
                <Text style={[styles.balanceLabel, { color: isLightMode ? '#374151' : '#9CA3AF' }]}>
                  Your Balance: ${currentBalance.toLocaleString()}
                </Text>
              </View>
              {!canAffordSpeedup && (
                <Text style={[styles.insufficientFunds, { color: colors.error }]}>
                  Insufficient funds
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.speedupButton,
                  {
                    backgroundColor: canAffordSpeedup ? '#8B5CF6' : '#6B7280',
                    opacity: canAffordSpeedup ? 1 : 0.6
                  }
                ]}
                onPress={handleSpeedup}
                disabled={!canAffordSpeedup || isSpeedupLoading}
              >
                <Text style={[styles.speedupButtonText, { color: '#FFFFFF' }]}>
                  {isSpeedupLoading ? 'Completing...' : 'Finish Research Now'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : !feature.isUnlocked ? (
        <TouchableOpacity
          style={[
            styles.researchButton,
            {
              backgroundColor: (canAfford && meetsLevelRequirement) ? colors.secondary : '#EF4444',
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
      ) : (
        <View style={styles.unlockedStatus}>
          <Text style={[styles.unlockedText, { color: '#10B981' }]}>
            ✓ Feature Unlocked
          </Text>
        </View>
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
    <>
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
            {(feature.isUnlocked || isCurrentlyResearching) ? renderUnlockedModal() : renderLockedModal()}
          </View>
        </View>
      </Modal>
      
      <LockedFeatureModal
        visible={showErrorModal}
        title="SPEEDUP ERROR"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        closeButtonText="CLOSE"
      />
    </>
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
    width: Platform.OS === 'android' ? '75%' : '100%',
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 2,
    padding: SIZING.spacing.md,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
    marginBottom: SIZING.spacing.sm,
    lineHeight: 18,
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
  researchingStatus: {
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  researchingTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs / 2,
  },
  researchingTime: {
    fontSize: SIZING.font.large,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginBottom: SIZING.spacing.xs / 2,
  },
  researchingSubtext: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  speedupContainer: {
    width: '100%',
    marginTop: SIZING.spacing.sm,
    paddingTop: SIZING.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  speedupInfo: {
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  speedupLabel: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.xs / 2,
    textAlign: 'center',
  },
  speedupCost: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  balanceInfo: {
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs / 2,
  },
  balanceLabel: {
    fontSize: SIZING.font.small,
  },
  insufficientFunds: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
    marginBottom: SIZING.spacing.xs / 2,
    fontStyle: 'italic',
  },
  speedupButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    marginTop: SIZING.spacing.xs,
    minWidth: 200,
    alignItems: 'center',
  },
  speedupButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  unlockedStatus: {
    alignItems: 'center',
    marginBottom: SIZING.spacing.md,
  },
  unlockedText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    marginTop: SIZING.spacing.xs,
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
