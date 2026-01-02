import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { CustomButton } from '../common/CustomButton';
import { LockedFeatureModal } from '../turf/LockedFeatureModal';
import { API_URL } from '../../config';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { useGetUserFeaturesQuery } from '../../store/api/researchFeaturesApi';
import { userGuideApi } from '../../store/api/userGuideApi';

interface ResearchRequirements {
  categoryId: string;
  name: string;
  levelRequirement: number;
  balanceRequirement: number;
  dependencies: string[];
  requiredFeatures?: string[];
  unlockCost: number;
  isUnlocked: boolean;
}

interface ResearchStatus {
  categoryId: string;
  name: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  unlockCost: number;
  levelRequirement: number;
  balanceRequirement: number;
  dependencies: string[];
  image: string;
}

interface ResearchLockedModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlockSuccess: (newBalance: number) => void;
  requirements: ResearchRequirements | null;
  currentLevel: number;
  currentBalance: number;
  researchStatus: ResearchStatus[];
}

export function ResearchLockedModal({
  visible,
  onClose,
  onUnlockSuccess,
  requirements,
  currentLevel: propCurrentLevel,
  currentBalance: propCurrentBalance,
  researchStatus,
}: ResearchLockedModalProps): React.JSX.Element | null {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);
  const [showUnlockError, setShowUnlockError] = useState(false);
  const [showNetworkError, setShowNetworkError] = useState(false);
  const [showRequirementsNotMet, setShowRequirementsNotMet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const token = useAppSelector(state => state.auth.token);
  const dispatch = useAppDispatch();
  const currentLevel = useAppSelector(state => state.auth.user?.level || propCurrentLevel || 1);
  const currentBalance = useAppSelector(state => getCurrentBalance(state) || propCurrentBalance || 0);
  
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { data: homeDefenseFeatures, isLoading: isLoadingHomeDefenseFeatures } = useGetUserFeaturesQuery('home-defense', {
    skip: !requirements || requirements.categoryId !== 'hack-crew'
  });

  // Check if required features are unlocked (must be before early return)
  const requiredFeaturesMet = useMemo(() => {
    if (!requirements?.requiredFeatures || requirements.requiredFeatures.length === 0) {
      return true;
    }

    if (requirements.categoryId === 'hack-crew') {
      if (isLoadingHomeDefenseFeatures) {
        return false;
      }
      
      if (!homeDefenseFeatures) {
        return false;
      }
      
      return requirements.requiredFeatures.every(featureId => {
        const feature = homeDefenseFeatures.find(f => f.id === featureId);
        if (!feature) return false;
        
        if (feature.isUnlocked) {
          return true;
        }
        
        if (feature.isResearching && feature.researchCompletesAt) {
          const now = new Date().getTime();
          const researchCompletesAt = new Date(feature.researchCompletesAt).getTime();
          const remaining = Math.max(0, researchCompletesAt - now);
          return remaining === 0;
        }
        
        return false;
      });
    }

    return true;
  }, [requirements?.requiredFeatures, requirements?.categoryId, homeDefenseFeatures, isLoadingHomeDefenseFeatures]);

  if (!requirements) return null;

  const levelMet = currentLevel >= requirements.levelRequirement;
  const balanceMet = currentBalance >= requirements.balanceRequirement;
  
  // Check if each dependency is actually unlocked
  const dependenciesMet = requirements.dependencies.every(depId => {
    const depResearch = researchStatus.find(r => r.categoryId === depId);
    return depResearch?.isUnlocked || false;
  });
  
  const canUnlock = levelMet && balanceMet && dependenciesMet && requiredFeaturesMet;

  const handleUnlock = async () => {
    if (!token) {
      setShowAuthError(true);
      setErrorMessage('Authentication required');
      return;
    }

    if (!canUnlock) {
      setShowRequirementsNotMet(true);
      setTimeout(() => {
        setShowRequirementsNotMet(false);
      }, 2000);
      return;
    }

    setIsUnlocking(true);
    
    try {
      const response = await fetch(`${API_URL}/api/research/unlock/${requirements.categoryId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        onUnlockSuccess(data.newBalance);
        
        if (requirements.categoryId === 'home-defense') {
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        }
      } else {
        setShowUnlockError(true);
        setErrorMessage(data.message);
      }
    } catch (error) {
      setShowNetworkError(true);
      setErrorMessage('Failed to unlock research. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

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
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{requirements.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.lockedMessage}>
              This research category is currently locked. Meet the requirements below to unlock it.
            </Text>

            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Unlock Requirements:</Text>
              
              <View style={styles.requirementRow}>
                <Text style={styles.requirementLabel}>Level:</Text>
                <Text style={[
                  styles.requirementValue,
                  levelMet ? styles.requirementMet : styles.requirementNotMet
                ]}>
                  {currentLevel}/{requirements.levelRequirement}
                </Text>
              </View>

              <View style={styles.requirementRow}>
                <Text style={styles.requirementLabel}>Balance:</Text>
                <Text style={[
                  styles.requirementValue,
                  balanceMet ? styles.requirementMet : styles.requirementNotMet
                ]}>
                  ${currentBalance.toLocaleString()}/${requirements.balanceRequirement.toLocaleString()}
                </Text>
              </View>

              {requirements.dependencies.length > 0 && (
                <View style={styles.requirementRow}>
                  <Text style={styles.requirementLabel}>Dependencies:</Text>
                  <Text style={[
                    styles.requirementValue,
                    dependenciesMet ? styles.requirementMet : styles.requirementNotMet
                  ]}>
                    {requirements.dependencies.join(', ')}
                  </Text>
                </View>
              )}

              {requirements.requiredFeatures && requirements.requiredFeatures.length > 0 && (
                <View style={styles.requirementRow}>
                  <Text style={styles.requirementLabel}>Required Features:</Text>
                  <Text style={[
                    styles.requirementValue,
                    requiredFeaturesMet ? styles.requirementMet : styles.requirementNotMet
                  ]}>
                    {requirements.requiredFeatures.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.costContainer}>
                <Text style={styles.costLabel}>Unlock Cost:</Text>
                <Text style={styles.costValue}>${requirements.unlockCost.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <CustomButton
              title="Close"
              onPress={onClose}
              style={styles.closeButtonStyle}
            />
            <CustomButton
              title="Unlock"
              onPress={handleUnlock}
              style={styles.unlockButtonStyle}
              disabled={isUnlocking}
            />
          </View>
          
          {showRequirementsNotMet && (
            <View style={styles.requirementsNotMetOverlay}>
              <View style={styles.requirementsNotMetPopup}>
                <Text style={styles.requirementsNotMetText}>Requirements Not Met</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
    
    <LockedFeatureModal
      visible={showAuthError}
      title="AUTHENTICATION ERROR"
      onClose={() => setShowAuthError(false)}
      message={errorMessage}
    />
    <LockedFeatureModal
      visible={showUnlockError}
      title="UNLOCK FAILED"
      onClose={() => setShowUnlockError(false)}
      message={errorMessage}
    />
    <LockedFeatureModal
      visible={showNetworkError}
      title="NETWORK ERROR"
      onClose={() => setShowNetworkError(false)}
      message={errorMessage}
    />
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: SIZING.spacing.md,
    margin: SIZING.spacing.md,
    maxWidth: 400,
    width: '100%',
    ...(colors.modalBorder && { borderWidth: 1, borderColor: colors.modalBorder }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.md,
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: SIZING.spacing.md,
  },
  lockedMessage: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  requirementsContainer: {
    backgroundColor: colors.surface,
    padding: SIZING.spacing.md,
    borderRadius: 8,
  },
  requirementsTitle: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: '600',
    marginBottom: SIZING.spacing.sm,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  requirementLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
  },
  requirementValue: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '500',
  },
  requirementMet: {
    color: colors.success,
  },
  requirementNotMet: {
    color: colors.error,
  },
  costContainer: {
    marginTop: SIZING.spacing.sm,
    paddingTop: SIZING.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  costLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.xs,
  },
  costValue: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SIZING.spacing.sm,
  },
  closeButtonStyle: {
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
    borderWidth: 1,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    minWidth: 120,
    borderRadius: 6,
  },
  unlockButtonStyle: {
    backgroundColor: colors.successDark || colors.success,
    borderColor: colors.secondary,
    borderWidth: 1,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    minWidth: 120,
    borderRadius: 6,
  },
  requirementsNotMetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  requirementsNotMetPopup: {
    backgroundColor: colors.error,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 200,
    maxWidth: 300,
  },
  requirementsNotMetText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
