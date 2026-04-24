import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ResearchFeature, matchesResearchCrewBackupRequest } from './FeatureCard';
import { useStartResearchMutation, useCompleteResearchMutation, useSpeedupFeatureResearchMutation, useGetUserFeaturesQuery } from '../../store/api/researchFeaturesApi';
import { useGetResearchCenterStatusQuery, useGetCrewStatusQuery, useGetCrewDetailsQuery, useRequestCrewBackupMutation } from '../../store/api/authApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { LockedFeatureModal } from '../turf/LockedFeatureModal';
import { trackFirstResearch } from '../../services/analyticsService';
import { useFetchStorageInventoryQuery, useUseStorageItemMutation } from '../../store/api/bugHuntApi';

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'home-defense': 'Home Defense',
  'cash-flow': 'Cash Flow',
  'hack-ability': 'Hack Ability',
  'hack-crew': 'Hack Crew',
  'investments': 'Investments',
  'financial': 'Financial',
  'npc': 'NPC',
  'construction': 'Construction',
  'battle-mechanics': 'Battle Mechanics',
  'gear': 'Gear',
};

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
  const userId = useAppSelector((state) => state.auth.user?._id);
  const currentUserId = useAppSelector((state) => state.auth.user?._id ?? (state.auth.user as any)?.id);
  const [isResearching, setIsResearching] = useState(false);
  // Sync local isResearching when modal opens or feature changes so we never show crew UI for a different feature (Bugbot).
  useEffect(() => {
    if (visible) setIsResearching(!!feature.isResearching);
  }, [visible, feature.id, feature.isResearching]);
  useEffect(() => {
    setResearchCompletesAtOverrideMs(null);
  }, [feature.id, feature.researchCompletesAt]);
  const [researchTimeRemaining, setResearchTimeRemaining] = useState(0);
  const [isSpeedupLoading, setIsSpeedupLoading] = useState(false);
  const [researchCompletesAtOverrideMs, setResearchCompletesAtOverrideMs] = useState<number | null>(null);
  const [selectedResearchSpeedupKey, setSelectedResearchSpeedupKey] = useState<string | null>(null);
  const [selectedResearchSpeedupQuantity, setSelectedResearchSpeedupQuantity] = useState(1);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRequirementsNotMet, setShowRequirementsNotMet] = useState(false);
  const [requirementsNotMetList, setRequirementsNotMetList] = useState<string[]>([]);
  const [startResearch, { isLoading: isStartingResearch }] = useStartResearchMutation();
  const [completeResearch, { isLoading: isCompletingResearch }] = useCompleteResearchMutation();
  const [speedupFeatureResearch] = useSpeedupFeatureResearchMutation();
  const [requestCrewBackup] = useRequestCrewBackupMutation();
  const [useStorageItem, { isLoading: isApplyingResearchStorageSpeedup }] = useUseStorageItemMutation();
  const { data: crewStatus } = useGetCrewStatusQuery(undefined, { skip: !visible });
  // Use ?? so server's explicit false is respected; local isResearching only used when feature.isResearching is null/undefined (Bugbot).
  const { data: crewDetails, refetch: refetchCrewDetails } = useGetCrewDetailsQuery(crewStatus?.crewId ?? '', {
    skip: !visible || !crewStatus?.crewId || !crewStatus?.isInCrew || !(feature.isResearching ?? isResearching),
  });
  const hasRequestedBackup = Boolean(
    currentUserId &&
      crewDetails?.crew?.backupRequests?.some((r) =>
        matchesResearchCrewBackupRequest(r, currentUserId, categoryId, feature.id)
      )
  );
  const isLightMode = colors.background === '#FAFAFA' || colors.background === '#F5F5DC';

  const refs = feature.requiredFeatureRefs ?? [];
  const refCategories = useMemo(() => [...new Set(refs.map(r => r.categoryId))], [refs]);
  const { data: homeDefFeatures } = useGetUserFeaturesQuery('home-defense', { skip: !visible || !refCategories.includes('home-defense') });
  const { data: cashFlowFeatures } = useGetUserFeaturesQuery('cash-flow', { skip: !visible || !refCategories.includes('cash-flow') });
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability', { skip: !visible || !refCategories.includes('hack-ability') });
  const { data: hackCrewFeatures } = useGetUserFeaturesQuery('hack-crew', { skip: !visible || !refCategories.includes('hack-crew') });
  const { data: investmentsFeatures } = useGetUserFeaturesQuery('investments', { skip: !visible || !refCategories.includes('investments') });
  const { data: researchCenterStatus } = useGetResearchCenterStatusQuery(undefined, { skip: !visible });
  const { data: storageInventory, refetch: refetchStorageInventory } = useFetchStorageInventoryQuery(undefined, { skip: !visible });
  const currentResearchCenterLevel = researchCenterStatus?.level ?? 0;

  const featuresByCategory = useMemo(() => ({
    'home-defense': homeDefFeatures ?? [],
    'cash-flow': cashFlowFeatures ?? [],
    'hack-ability': hackAbilityFeatures ?? [],
    'hack-crew': hackCrewFeatures ?? [],
    'investments': investmentsFeatures ?? [],
  }), [homeDefFeatures, cashFlowFeatures, hackAbilityFeatures, hackCrewFeatures, investmentsFeatures]);

  const missingRequiredRefs = useMemo(() => {
    if (refs.length === 0) return [];
    return refs.filter(ref => {
      const list = featuresByCategory[ref.categoryId];
      // Don't treat as missing when category not fetched or still loading (empty list). Server validates (Bugbot).
      if (!list || list.length === 0) return false;
      const f = list.find((x: any) => (x.id || x.featureId) === ref.featureId);
      if (f?.isUnlocked) return false;
      // Server treats reduce-insurance-02 (or legacy) as satisfying reduce-insurance-01 for crew-system-unlock. Align client so migrated users can start Crew System.
      if (ref.categoryId === 'cash-flow' && ref.featureId === 'reduce-insurance-01') {
        const has02 = list.some((x: any) => ((x.id || x.featureId) === 'reduce-insurance-02' || (x.id || x.featureId) === 'reduce-insurance-expense') && x.isUnlocked);
        if (has02) return false;
      }
      return true;
    });
  }, [refs, featuresByCategory]);

  const missingRequiredDisplay = useMemo(() => {
    return missingRequiredRefs.map(ref => {
      const list = featuresByCategory[ref.categoryId];
      const f = list?.find((x: any) => (x.id || x.featureId) === ref.featureId);
      const featureName = f?.name ?? ref.featureId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      const categoryName = CATEGORY_DISPLAY_NAMES[ref.categoryId] ?? ref.categoryId;
      return `${featureName} (${categoryName})`;
    });
  }, [missingRequiredRefs, featuresByCategory]);
  
  const canAfford = currentBalance >= feature.unlockCost;
  const meetsLevelRequirement = currentLevel >= feature.levelRequirement;
  const rcLevelReq = feature.researchCenterLevelRequirement;
  const meetsRcLevelRequirement = rcLevelReq == null || currentResearchCenterLevel >= rcLevelReq;
  const meetsPrerequisiteRequirements = missingRequiredRefs.length === 0;
  const canStartResearch = canAfford && meetsLevelRequirement && meetsRcLevelRequirement && meetsPrerequisiteRequirements && !feature.isResearching;
  const researchTimeHours = feature.researchTimeHours ?? 4; // Default to 4 hours if not specified

  /** Format researchTimeHours (fractional ok) as human-readable: weeks, days, hours, minutes, seconds (only appropriate parts). */
  const formatResearchTimeDisplay = (hours: number): string => {
    const totalSeconds = Math.round(hours * 3600);
    if (totalSeconds <= 0) return '0 seconds';
    const weeks = Math.floor(totalSeconds / (7 * 24 * 3600));
    const days = Math.floor((totalSeconds % (7 * 24 * 3600)) / (24 * 3600));
    const hrs = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const min = Math.floor((totalSeconds % 3600) / 60);
    const sec = totalSeconds % 60;
    const parts: string[] = [];
    if (weeks > 0) parts.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hrs > 0) parts.push(`${hrs} hour${hrs !== 1 ? 's' : ''}`);
    if (min > 0) parts.push(`${min} minute${min !== 1 ? 's' : ''}`);
    if (sec > 0 || parts.length === 0) parts.push(`${sec} second${sec !== 1 ? 's' : ''}`);
    return parts.join(' ');
  };
  const researchTimeDisplay = formatResearchTimeDisplay(researchTimeHours);
  
  // Check if research is in progress
  const isCurrentlyResearching = feature.isResearching || false;
  
  const requirementsOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Prevents completeResearch from firing every 1s while timer is at 0 (matches ResearchFeaturesList completedFeaturesRef pattern). */
  const researchCompleteRequestSentRef = useRef(false);

  useEffect(() => {
    researchCompleteRequestSentRef.current = false;
  }, [feature.id, feature.researchCompletesAt]);

  // Reset error state when modal opens or closes; clear requirements overlay timer to avoid setState after unmount (Bugbot).
  useEffect(() => {
    if (!visible) {
      researchCompleteRequestSentRef.current = false;
      setSelectedResearchSpeedupKey(null);
      setSelectedResearchSpeedupQuantity(1);
      setResearchCompletesAtOverrideMs(null);
      if (requirementsOverlayTimerRef.current) {
        clearTimeout(requirementsOverlayTimerRef.current);
        requirementsOverlayTimerRef.current = null;
      }
      setShowErrorModal(false);
      setErrorMessage('');
      setShowRequirementsNotMet(false);
      setRequirementsNotMetList([]);
    }
    return () => {
      if (requirementsOverlayTimerRef.current) {
        clearTimeout(requirementsOverlayTimerRef.current);
        requirementsOverlayTimerRef.current = null;
      }
    };
  }, [visible]);
  
  // Calculate time remaining if research is in progress
  useEffect(() => {
    if (isCurrentlyResearching && feature.researchCompletesAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const serverCompletesAt = new Date(feature.researchCompletesAt!).getTime();
        const completesAt =
          researchCompletesAtOverrideMs != null && Number.isFinite(researchCompletesAtOverrideMs)
            ? researchCompletesAtOverrideMs
            : serverCompletesAt;
        const remaining = Math.max(0, completesAt - now);
        setResearchTimeRemaining(remaining);
        
        if (remaining === 0 && !researchCompleteRequestSentRef.current) {
          researchCompleteRequestSentRef.current = true;
          completeResearch({ categoryId, featureId: feature.id })
            .unwrap()
            .then(() => {
              setIsResearching(false);
            })
            .catch((error) => {
              researchCompleteRequestSentRef.current = false;
              console.error('🔬 RESEARCH: Failed to complete research:', error);
            });
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [
    isCurrentlyResearching,
    feature.researchCompletesAt,
    feature.id,
    completeResearch,
    categoryId,
    onResearchStarted,
    researchCompletesAtOverrideMs,
  ]);
  
  const showRequirementsNotMetOverlay = (items: string[]) => {
    if (requirementsOverlayTimerRef.current) {
      clearTimeout(requirementsOverlayTimerRef.current);
      requirementsOverlayTimerRef.current = null;
    }
    setRequirementsNotMetList(items);
    setShowRequirementsNotMet(true);
    requirementsOverlayTimerRef.current = setTimeout(() => {
      requirementsOverlayTimerRef.current = null;
      setShowRequirementsNotMet(false);
    }, 2000);
  };

  const handlePerformResearch = async () => {
    if (!canStartResearch) {
      const items: string[] = [];
      if (!meetsLevelRequirement) items.push(`Level ${feature.levelRequirement} required`);
      if (!canAfford) items.push(`$${feature.unlockCost.toLocaleString()} balance required`);
      if (rcLevelReq != null && !meetsRcLevelRequirement) items.push(`Research Center level ${rcLevelReq} required`);
      missingRequiredDisplay.forEach(label => items.push(label));
      showRequirementsNotMetOverlay(items.length > 0 ? items : ['Requirements not met']);
      return;
    }
    try {
      const result = await startResearch({ categoryId, featureId: feature.id }).unwrap();
      
      setIsResearching(true);
      onResearchStarted?.();
      onClose();
      
      if (userId) {
        trackFirstResearch(categoryId, feature.id, userId).catch((analyticsError) => {
          console.error('[Analytics] Error tracking first_research:', analyticsError);
        });
      }
    } catch (error: any) {
      console.error('Failed to start research:', error);
      const msg = error?.data?.message || error?.message;
      const items = msg ? [msg] : ['Requirements not met. Complete any required research in other categories first.'];
      showRequirementsNotMetOverlay(items);
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
  const researchStorageSpeedupItems = useMemo(() => {
    return (storageInventory?.items ?? [])
      .filter(
        (item) =>
          item.category === 'speedup' &&
          item.speedupDomain === 'research' &&
          Number.isFinite(item.durationSeconds) &&
          Number(item.quantity) > 0
      )
      .sort((a, b) => {
        const durationA = Math.max(0, Math.floor(a.durationSeconds ?? 0));
        const durationB = Math.max(0, Math.floor(b.durationSeconds ?? 0));
        if (durationA !== durationB) {
          return durationA - durationB;
        }
        return a.label.localeCompare(b.label);
      });
  }, [storageInventory?.items]);

  const researchSpeedupSummary = useMemo(() => {
    if (researchStorageSpeedupItems.length === 0) {
      return 'No speedup items available';
    }
    return researchStorageSpeedupItems
      .slice(0, 3)
      .map((item) => `${item.label} x${item.quantity}`)
      .join('   |   ');
  }, [researchStorageSpeedupItems]);

  const getMaxResearchStorageSpeedupQuantity = (durationSeconds: number, ownedQuantity: number): number => {
    const duration = Math.max(1, Math.floor(durationSeconds));
    const remainingSeconds = Math.max(0, Math.ceil(researchTimeRemaining / 1000));
    const maxByTime = Math.max(1, Math.ceil(remainingSeconds / duration));
    return Math.max(1, Math.min(Math.floor(ownedQuantity), maxByTime));
  };

  const selectedResearchStorageSpeedupItem =
    selectedResearchSpeedupKey == null
      ? null
      : researchStorageSpeedupItems.find((item) => item.itemKey === selectedResearchSpeedupKey) ?? null;

  const selectedResearchStorageSpeedupMaxQuantity =
    selectedResearchStorageSpeedupItem && Number.isFinite(selectedResearchStorageSpeedupItem.durationSeconds)
      ? getMaxResearchStorageSpeedupQuantity(
          selectedResearchStorageSpeedupItem.durationSeconds ?? 0,
          selectedResearchStorageSpeedupItem.quantity
        )
      : 1;

  useEffect(() => {
    if (selectedResearchSpeedupQuantity > selectedResearchStorageSpeedupMaxQuantity) {
      setSelectedResearchSpeedupQuantity(selectedResearchStorageSpeedupMaxQuantity);
    }
  }, [selectedResearchSpeedupQuantity, selectedResearchStorageSpeedupMaxQuantity]);

  const formatSpeedupButtonDuration = (durationSeconds: number): string => {
    const seconds = Math.max(0, Math.floor(durationSeconds));
    if (seconds % 3600 === 0 && seconds >= 3600) {
      return `${seconds / 3600}h`;
    }
    if (seconds % 60 === 0 && seconds >= 60) {
      return `${seconds / 60}m`;
    }
    return `${seconds}s`;
  };

  const handleUseResearchStorageSpeedup = async () => {
    if (
      !selectedResearchStorageSpeedupItem ||
      !Number.isFinite(selectedResearchStorageSpeedupItem.durationSeconds) ||
      isApplyingResearchStorageSpeedup
    ) {
      return;
    }
    try {
      const result = await useStorageItem({
        itemKey: selectedResearchStorageSpeedupItem.itemKey,
        quantity: selectedResearchSpeedupQuantity,
        researchCategoryId: categoryId,
        researchFeatureId: feature.id,
      }).unwrap();

      const appliedQuantity =
        typeof result.quantityUsed === 'number' && Number.isFinite(result.quantityUsed)
          ? Math.max(1, Math.floor(result.quantityUsed))
          : Math.max(1, selectedResearchSpeedupQuantity);
      const perItemDurationSeconds = Math.max(1, Math.floor(selectedResearchStorageSpeedupItem.durationSeconds ?? 0));
      const totalDurationMs = perItemDurationSeconds * 1000 * appliedQuantity;
      const now = Date.now();
      const baseCompletesAt = researchCompletesAtOverrideMs ?? new Date(feature.researchCompletesAt ?? now).getTime();
      const nextCompletesAt = Math.max(now, baseCompletesAt - totalDurationMs);
      setResearchCompletesAtOverrideMs(nextCompletesAt);
      setResearchTimeRemaining(Math.max(0, nextCompletesAt - now));
      await refetchStorageInventory();
      onResearchStarted?.();
    } catch (error: any) {
      const msg = error?.data?.error || error?.data?.message || 'Could not use speedup item.';
      setErrorMessage(msg);
      setShowErrorModal(true);
    }
  };

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
      // Note: speedup-feature-research endpoint returns { success: false, message: '...' }
      if (error?.data?.message === 'Insufficient funds') {
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
          <Text style={[styles.requirementValue, { color: colors.success }]}>
            {researchTimeDisplay}
          </Text>
        </View>
        {rcLevelReq != null && (
          <View style={styles.requirementRow}>
            <Text style={[styles.requirementLabel, { color: colors.text.secondary }]}>
              Research Center Level:
            </Text>
            <Text style={[
              styles.requirementValue,
              { color: meetsRcLevelRequirement ? colors.success : colors.error }
            ]}>
              {currentResearchCenterLevel}/{rcLevelReq}
            </Text>
          </View>
        )}
        {refs.length > 0 && (
          <View style={styles.requirementRow}>
            <Text style={[styles.requirementLabel, { color: colors.text.secondary }]}>
              Required research:
            </Text>
            <View style={styles.requirementValueWrap}>
              {missingRequiredDisplay.length > 0 ? (
                <Text style={[styles.requirementValue, { color: colors.error }]}>
                  {missingRequiredDisplay.join('\n')}
                </Text>
              ) : (
                <Text style={[styles.requirementValue, { color: colors.success }]}>
                  Met
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.modalActionButton, { backgroundColor: colors.primary }]}
          onPress={onClose}
        >
          <Text style={[styles.modalActionButtonText, { color: '#FFFFFF' }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        {!isCurrentlyResearching && (
          <TouchableOpacity
            style={[
              styles.modalActionButton,
              { 
                backgroundColor: canStartResearch ? colors.secondary : '#6B7280',
                opacity: isStartingResearch ? 0.6 : 1
              }
            ]}
            onPress={handlePerformResearch}
            disabled={isStartingResearch}
          >
            <Text style={[styles.modalActionButtonText, { color: '#FFFFFF' }]}>
              {isStartingResearch ? 'Starting...' : 
               !canAfford ? 'Insufficient Funds' :
               !meetsLevelRequirement ? 'Level Too Low' :
               (rcLevelReq != null && !meetsRcLevelRequirement) ? 'RC Level Too Low' :
               !meetsPrerequisiteRequirements ? 'Required research not complete' :
               'Research'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showRequirementsNotMet && (
        <View style={styles.requirementsNotMetOverlay}>
          <View style={[styles.requirementsNotMetPopup, { backgroundColor: colors.error }]}>
            <Text style={styles.requirementsNotMetText}>Requirements Not Met</Text>
            {requirementsNotMetList.map((item, i) => (
              <Text key={i} style={styles.requirementsNotMetItem}>{item}</Text>
            ))}
          </View>
        </View>
      )}
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
            <Text style={[styles.infoValue, { color: colors.success }]}>
              {researchTimeDisplay}
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
                  styles.researchStorageSpeedupHeader,
                  { borderColor: '#8B5CF6', backgroundColor: '#8B5CF622' },
                ]}
                activeOpacity={1}
              >
                <Text style={[styles.researchStorageSpeedupHeaderText, { color: '#8B5CF6' }]}>
                  Use Speedup Item ({researchStorageSpeedupItems.length} type{researchStorageSpeedupItems.length === 1 ? '' : 's'})
                </Text>
              </TouchableOpacity>
              {researchStorageSpeedupItems.length > 0 ? (
                <>
                  <View style={styles.researchStorageSpeedupList}>
                    {researchStorageSpeedupItems.map((item) => {
                      const maxUsable = Number.isFinite(item.durationSeconds)
                        ? getMaxResearchStorageSpeedupQuantity(item.durationSeconds ?? 0, item.quantity)
                        : item.quantity;
                      const isSelected = selectedResearchSpeedupKey === item.itemKey;
                      return (
                        <TouchableOpacity
                          key={item.itemKey}
                          style={[
                            styles.researchStorageSpeedupItemButton,
                            {
                              borderColor: isSelected ? '#10B981' : '#8B5CF6',
                              backgroundColor: isSelected ? '#10B98122' : '#8B5CF622',
                              opacity: isApplyingResearchStorageSpeedup ? 0.65 : 1,
                            },
                          ]}
                          disabled={isApplyingResearchStorageSpeedup}
                          onPress={() => {
                            setSelectedResearchSpeedupKey(item.itemKey);
                            setSelectedResearchSpeedupQuantity(1);
                          }}
                        >
                          <Text style={[styles.researchStorageSpeedupItemButtonText, { color: isLightMode ? '#374151' : '#E2E8F0' }]}>
                            {formatSpeedupButtonDuration(item.durationSeconds ?? 0)} x{item.quantity} (max {maxUsable})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedResearchStorageSpeedupItem != null ? (
                    <View style={styles.researchStorageSpeedupQuantitySection}>
                      <View style={styles.researchStorageSpeedupQuantityRow}>
                        <TouchableOpacity
                          style={[styles.researchStorageSpeedupQuantityButton, { borderColor: '#8B5CF6' }]}
                          onPress={() => setSelectedResearchSpeedupQuantity((prev) => Math.max(1, prev - 1))}
                          disabled={isApplyingResearchStorageSpeedup || selectedResearchSpeedupQuantity <= 1}
                        >
                          <Text style={[styles.researchStorageSpeedupQuantityButtonText, { color: '#8B5CF6' }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={[styles.researchStorageSpeedupQuantityValue, { color: isLightMode ? '#111827' : '#F8FAFC' }]}>
                          {selectedResearchSpeedupQuantity}
                        </Text>
                        <TouchableOpacity
                          style={[styles.researchStorageSpeedupQuantityButton, { borderColor: '#8B5CF6' }]}
                          onPress={() =>
                            setSelectedResearchSpeedupQuantity((prev) =>
                              Math.min(selectedResearchStorageSpeedupMaxQuantity, prev + 1)
                            )
                          }
                          disabled={
                            isApplyingResearchStorageSpeedup ||
                            selectedResearchSpeedupQuantity >= selectedResearchStorageSpeedupMaxQuantity
                          }
                        >
                          <Text style={[styles.researchStorageSpeedupQuantityButtonText, { color: '#8B5CF6' }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.researchStorageSpeedupApplyButton,
                          {
                            borderColor: '#10B981',
                            backgroundColor: '#10B98122',
                            opacity: isApplyingResearchStorageSpeedup ? 0.65 : 1,
                          },
                        ]}
                        onPress={handleUseResearchStorageSpeedup}
                        disabled={isApplyingResearchStorageSpeedup}
                      >
                        <Text style={[styles.researchStorageSpeedupApplyButtonText, { color: isLightMode ? '#111827' : '#F8FAFC' }]}>
                          {isApplyingResearchStorageSpeedup
                            ? 'Applying...'
                            : `Use ${selectedResearchSpeedupQuantity}`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.researchStorageSpeedupEmptyText, { color: isLightMode ? '#374151' : '#94A3B8' }]}>
                  {researchSpeedupSummary}
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
          {crewStatus?.isInCrew && crewDetails != null && !hasRequestedBackup && researchTimeRemaining > 0 && (
            <TouchableOpacity
              style={[styles.requestBackupButton, { backgroundColor: colors.primary, borderColor: colors.matrix }]}
              onPress={() => {
                requestCrewBackup({ categoryId, featureId: feature.id });
              }}
            >
              <Text style={[styles.requestBackupText, { color: colors.background }]}>Request back-up</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: '#475569', marginTop: SIZING.spacing.sm }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      ) : !feature.isUnlocked ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.modalActionButton, { backgroundColor: '#475569' }]}
            onPress={onClose}
          >
            <Text style={[styles.modalActionButtonText, { color: '#FFFFFF' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalActionButton,
              {
                backgroundColor: canStartResearch ? colors.secondary : '#EF4444',
                opacity: canStartResearch ? 1 : 0.6
              }
            ]}
            onPress={handlePerformResearch}
            disabled={isStartingResearch}
          >
            <Text style={[styles.modalActionButtonText, { color: '#FFFFFF' }]}>
              {isStartingResearch ? 'Starting...' : 
               !canAfford ? 'Insufficient Funds' :
               !meetsLevelRequirement ? 'Level Too Low' :
               (rcLevelReq != null && !meetsRcLevelRequirement) ? 'RC Level Too Low' :
               !meetsPrerequisiteRequirements ? 'Required research not complete' :
               'Research'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.unlockedStatus}>
            <Text style={[styles.unlockedText, { color: '#10B981' }]}>
              ✓ Feature Unlocked
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: '#475569' }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </>
      )}

      {showRequirementsNotMet && (
        <View style={styles.requirementsNotMetOverlay}>
          <View style={[styles.requirementsNotMetPopup, { backgroundColor: colors.error }]}>
            <Text style={styles.requirementsNotMetText}>Requirements Not Met</Text>
            {requirementsNotMetList.map((item, i) => (
              <Text key={i} style={styles.requirementsNotMetItem}>{item}</Text>
            ))}
          </View>
        </View>
      )}
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
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {(feature.isUnlocked || isCurrentlyResearching) ? renderUnlockedModal() : renderLockedModal()}
            </ScrollView>
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
    width: '94%',
    maxWidth: 980,
    maxHeight: '82%',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    overflow: 'hidden',
  },
  modalScrollView: {
    width: '100%',
  },
  modalScrollContent: {
    width: '100%',
    paddingBottom: SIZING.spacing.md,
  },
  modalContent: {
    alignItems: 'stretch',
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
  requirementValueWrap: {
    flex: 1,
    alignItems: 'flex-end',
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
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SIZING.spacing.xs,
    gap: SIZING.spacing.sm,
    marginTop: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.xs,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalActionButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  researchButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    minWidth: 120,
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
  researchStorageSpeedupHeader: {
    marginTop: SIZING.spacing.sm,
    width: '100%',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.sm,
    alignItems: 'center',
  },
  researchStorageSpeedupHeaderText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  researchStorageSpeedupEmptyText: {
    marginTop: SIZING.spacing.xs,
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  researchStorageSpeedupList: {
    width: '100%',
    marginTop: SIZING.spacing.xs,
    gap: SIZING.spacing.xs,
  },
  researchStorageSpeedupItemButton: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    alignItems: 'center',
  },
  researchStorageSpeedupItemButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  researchStorageSpeedupQuantitySection: {
    width: '100%',
    marginTop: SIZING.spacing.sm,
    alignItems: 'center',
    gap: SIZING.spacing.xs,
  },
  researchStorageSpeedupQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  researchStorageSpeedupQuantityButton: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  researchStorageSpeedupQuantityButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  researchStorageSpeedupQuantityValue: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  researchStorageSpeedupApplyButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
    alignSelf: 'center',
  },
  researchStorageSpeedupApplyButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  requestBackupButton: {
    marginTop: SIZING.spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  requestBackupText: {
    fontSize: 12,
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
    marginBottom: SIZING.spacing.xs,
  },
  requirementsNotMetItem: {
    color: '#FFFFFF',
    fontSize: SIZING.font.small,
    textAlign: 'center',
    marginTop: 2,
  },
});
