import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { CustomButton } from '../common/CustomButton';
import { LockedFeatureModal } from '../turf/LockedFeatureModal';
import { API_URL } from '../../config';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { useGetUserFeaturesQuery } from '../../store/api/researchFeaturesApi';
import { useGetResearchCenterStatusQuery } from '../../store/api/authApi';
import { userGuideApi } from '../../store/api/userGuideApi';
import type { ResearchFeatureRef } from '../../hooks/useResearchStatus';

interface ResearchRequirements {
  categoryId: string;
  name: string;
  levelRequirement: number;
  balanceRequirement: number;
  dependencies: string[];
  requiredFeatures?: string[];
  requiredFeatureRefs?: ResearchFeatureRef[];
  researchCenterLevelRequirement?: number;
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
  onRefreshResearchStatus?: () => void;
}

export function ResearchLockedModal({
  visible,
  onClose,
  onUnlockSuccess,
  requirements,
  currentLevel: propCurrentLevel,
  currentBalance: propCurrentBalance,
  researchStatus,
  onRefreshResearchStatus,
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
  const previousLevelRef = useRef(currentLevel);

  useEffect(() => {
    if (visible && onRefreshResearchStatus) {
      onRefreshResearchStatus();
      previousLevelRef.current = currentLevel;
    }
  }, [visible, onRefreshResearchStatus]);

  useEffect(() => {
    if (visible && onRefreshResearchStatus && currentLevel !== previousLevelRef.current) {
      onRefreshResearchStatus();
      previousLevelRef.current = currentLevel;
    }
  }, [currentLevel, visible, onRefreshResearchStatus]);
  
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { data: buildStatus } = useGetResearchCenterStatusQuery(undefined, { skip: !visible || !requirements });
  const currentResearchCenterLevel = buildStatus?.level ?? 0;

  const refs = requirements?.requiredFeatureRefs ?? [];
  const legacyHackCrewNeedsHomeDefense = requirements?.categoryId === 'hack-crew' && (requirements?.requiredFeatures?.length ?? 0) > 0;
  const needsHomeDefense = refs.some(r => r.categoryId === 'home-defense') || legacyHackCrewNeedsHomeDefense;
  const needsHackCrew = refs.some(r => r.categoryId === 'hack-crew');
  const needsInvestments = refs.some(r => r.categoryId === 'investments');

  const { data: homeDefenseFeatures, isLoading: isLoadingHomeDefense } = useGetUserFeaturesQuery('home-defense', {
    skip: !visible || !needsHomeDefense
  });
  const { data: hackCrewFeatures, isLoading: isLoadingHackCrew } = useGetUserFeaturesQuery('hack-crew', {
    skip: !visible || !needsHackCrew
  });
  const { data: investmentsFeatures, isLoading: isLoadingInvestments } = useGetUserFeaturesQuery('investments', {
    skip: !visible || !needsInvestments
  });

  const featuresByCategory: Record<string, any[] | undefined> = useMemo(() => ({
    'home-defense': homeDefenseFeatures,
    'hack-crew': hackCrewFeatures,
    'investments': investmentsFeatures
  }), [homeDefenseFeatures, hackCrewFeatures, investmentsFeatures]);

  const isLoadingAnyFeatures = (needsHomeDefense && isLoadingHomeDefense) || (needsHackCrew && isLoadingHackCrew) || (needsInvestments && isLoadingInvestments);

  // Check if required features (from requiredFeatureRefs or legacy requiredFeatures) are unlocked
  const requiredFeaturesMet = useMemo(() => {
    if (refs.length > 0) {
      if (isLoadingAnyFeatures) return false;
      return refs.every(ref => {
        const features = featuresByCategory[ref.categoryId];
        if (!features) return false;
        const feature = features.find((f: any) => f.id === ref.featureId || f.featureId === ref.featureId);
        if (!feature) return false;
        if (feature.isUnlocked) return true;
        if (feature.isResearching && feature.researchCompletesAt) {
          const now = new Date().getTime();
          const completesAt = new Date(feature.researchCompletesAt).getTime();
          return now >= completesAt;
        }
        return false;
      });
    }
    if (requirements?.requiredFeatures?.length) {
      if (requirements.categoryId === 'hack-crew' && isLoadingHomeDefense) return false;
      const homeDefense = featuresByCategory['home-defense'];
      if (!homeDefense) return false;
      return requirements.requiredFeatures.every(featureId => {
        const feature = homeDefense.find((f: any) => f.id === featureId || f.featureId === featureId);
        if (!feature) return false;
        if (feature.isUnlocked) return true;
        if (feature.isResearching && feature.researchCompletesAt) {
          const now = new Date().getTime();
          const completesAt = new Date(feature.researchCompletesAt).getTime();
          return now >= completesAt;
        }
        return false;
      });
    }
    return true;
  }, [refs, requirements?.requiredFeatures, requirements?.categoryId, featuresByCategory, isLoadingAnyFeatures, isLoadingHomeDefense]);

  if (!requirements) return null;

  const levelMet = currentLevel >= requirements.levelRequirement;
  const balanceMet = currentBalance >= requirements.balanceRequirement;
  const rcLevelReq = requirements.researchCenterLevelRequirement;
  const researchCenterLevelMet = rcLevelReq == null || currentResearchCenterLevel >= rcLevelReq;

  const dependenciesMet = requirements.dependencies.every(depId => {
    const depResearch = researchStatus.find(r => r.categoryId === depId);
    return depResearch?.isUnlocked || false;
  });

  const canUnlock = levelMet && balanceMet && dependenciesMet && researchCenterLevelMet && requiredFeaturesMet;

  const getCategoryName = (categoryId: string) => researchStatus.find(r => r.categoryId === categoryId)?.name ?? categoryId;
  const formatFeatureId = (featureId: string) =>
    featureId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const displayRequiredFeatures = (requirements.requiredFeatureRefs?.length ?? 0) > 0
    ? (requirements.requiredFeatureRefs ?? []).map(r => formatFeatureId(r.featureId))
    : (requirements.requiredFeatures ?? []).map(f => formatFeatureId(f));
  const showRequiredFeaturesRow = displayRequiredFeatures.length > 0;

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
        // Invalidate task guide so category-unlock tasks (e.g. Home Defense, Hack Ability, Hack Crew) update live
        dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
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
                <View style={styles.requirementValueWrap}>
                  <Text style={[
                    styles.requirementValue,
                    levelMet ? styles.requirementMet : styles.requirementNotMet
                  ]}>
                    {currentLevel}/{requirements.levelRequirement}
                  </Text>
                </View>
              </View>

              <View style={styles.requirementRow}>
                <Text style={styles.requirementLabel}>Balance:</Text>
                <View style={styles.requirementValueWrap}>
                  <Text style={styles.requirementValue}>
                    <Text style={styles.balanceMyAmount}>${currentBalance.toLocaleString()}</Text>
                    <Text style={[
                      styles.balanceCost,
                      balanceMet ? styles.requirementMet : styles.requirementNotMet
                    ]}>
                      /${requirements.balanceRequirement.toLocaleString()}
                    </Text>
                  </Text>
                </View>
              </View>

              {rcLevelReq != null && (
                <View style={styles.requirementRow}>
                  <Text style={styles.requirementLabel}>Research Center Level:</Text>
                  <View style={styles.requirementValueWrap}>
                    <Text style={[
                      styles.requirementValue,
                      researchCenterLevelMet ? styles.requirementMet : styles.requirementNotMet
                    ]}>
                      {currentResearchCenterLevel}/{rcLevelReq}
                    </Text>
                  </View>
                </View>
              )}

              {requirements.dependencies.length > 0 && (
                <View style={styles.requirementRow}>
                  <Text style={styles.requirementLabel}>Other Categories:</Text>
                  <View style={styles.requirementValueWrap}>
                    <Text style={[
                      styles.requirementValue,
                      dependenciesMet ? styles.requirementMet : styles.requirementNotMet
                    ]}>
                      {requirements.dependencies.map(depId => getCategoryName(depId)).join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              {showRequiredFeaturesRow && (
                <View style={styles.requirementRow}>
                  <Text style={styles.requirementLabel}>Required Features:</Text>
                  <View style={styles.requirementValueWrap}>
                    <Text style={[
                      styles.requirementValue,
                      requiredFeaturesMet ? styles.requirementMet : styles.requirementNotMet
                    ]}>
                      {displayRequiredFeatures.join(', ')}
                    </Text>
                  </View>
                </View>
              )}
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
    maxWidth: 440,
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
    alignItems: 'flex-start',
    marginBottom: SIZING.spacing.xs,
  },
  requirementLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
  },
  requirementValueWrap: {
    flex: 1,
    marginLeft: SIZING.spacing.sm,
    flexShrink: 1,
  },
  requirementValue: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '500',
  },
  balanceMyAmount: {
    color: colors.text.primary,
  },
  balanceCost: {
    /* Base for cost segment; met/not-met applied conditionally via requirementMet / requirementNotMet */
  },
  requirementMet: {
    color: colors.success,
  },
  requirementNotMet: {
    color: colors.error,
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
