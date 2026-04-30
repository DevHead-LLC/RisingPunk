import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { SIZING } from '../styles/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { CloseButton } from '../components/common/CloseButton';
import { BattalionSlot } from '../components/battle/BattalionSlot';
import { CircleSlot } from '../components/battle/CircleSlot';
import { BattalionBotSelector } from '../components/battle/BattalionBotSelector';
import { BattalionAssignment } from '../components/battle/BattalionSlot';
import { ShieldCheckModal } from '../components/battle/ShieldCheckModal';
import { BotType } from '../types/bots';
import { useAppSelector } from '../store/hooks';
import {
  useAssignToBattalionMutation,
  useAssignPresetBattalionsMutation,
  useFetchBotsQuery,
} from '../store/api/botsApi';
import { useStartBattleMutation } from '../store/api/battleApi';
import {
  attackApi,
  getAttackMarchMinePollingIntervalMs,
  useGetMyAttackMarchesQuery,
  useLaunchAttackMarchMutation,
} from '../store/api/attackApi';
import { useAbortSwarmMutation, useCommitSwarmSlotMutation, useCreateSwarmMutation } from '../store/api/swarmApi';
import { useGetMyMapPositionQuery } from '../store/api/mapApi';
import { trackFirstBattle } from '../services/analyticsService';
import { useGetShieldStatusQuery, useDeactivateShieldMutation } from '../store/api/antivirusApi';
import { useGetUserFeaturesQuery } from '../store/api/researchFeaturesApi';
import { useBattalionSlotUnlocks } from '../hooks/useBattalionSlotUnlocks';
import { useTaskGuideHighlight } from '../contexts/TaskGuideHighlightContext';
import { TaskGuideHighlightOverlay } from '../components/turf/TaskGuideHighlightOverlay';
import { PresetBar } from '../components/battle/PresetBar';
import {
  BUG_HUNT_ROSTER_ID_KAITO,
  BUG_HUNT_VISUAL_KEY_KAITO_SPRINT,
  KAITO_GLITCH_HEADSHOT_IMAGE,
} from '../constants/hackMapBugHuntVisuals';
import { useFetchMyHuntersQuery } from '../store/api/bugHuntApi';

const DeployPurgeHighlightBorder = React.memo(({ colors }: { colors: any }) => {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useRef(new Animated.Value(0)).current;
  
  const highlightColors = [colors.primary, colors.secondary, colors.matrix];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentColorIndex(prev => (prev + 1) % highlightColors.length);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [highlightColors.length]);

  useEffect(() => {
    Animated.timing(animatedBorderColor, {
      toValue: currentColorIndex,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentColorIndex, animatedBorderColor]);

  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: highlightColors,
  });

  return (
    <Animated.View 
      style={[
        StyleSheet.absoluteFill,
        {
          borderWidth: 3,
          borderColor: animatedBorderColorValue,
          borderRadius: 8,
        }
      ]} 
      pointerEvents="none"
    />
  );
});

type Props = {
  onClose: () => void;
  /** `mode: 'march'` when async map deploy created a march (navigate to map, no live battle yet). */
  onBattleStart: (id?: string, options?: { mode?: 'live' | 'march' | 'swarm' }) => void;
  defenderId?: string;
  defenderNpcSlug?: string;
  defenderNpcInstanceId?: string;
  /** Set when battle was initiated from Hack Map (target cell). */
  hackMapCell?: { x: number; y: number };
  /** Optional lead-only setup mode for swarm creation from Hack Map. */
  swarmLeadSetup?: { targetUserId: string; targetX: number; targetY: number };
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Swarm lead prep does not call `assignToBattalion`; totals must not exceed Redux inventory before `commitSwarmSlot` (Bugbot / ios-bugs.md). */
const SWARM_LEAD_BATTALION_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

function validateSwarmLeadAssignmentsAgainstInventory(
  leadAssignments: Record<string, BattalionAssignment | undefined>,
  botCounts: Partial<Record<BotType, number>> | null | undefined,
  botCountsM2: Partial<Record<BotType, number>> | null | undefined
): { ok: true } | { ok: false; message: string } {
  const types: BotType[] = ['breacher', 'guardian', 'phreak'];
  const m1: Record<BotType, number> = { breacher: 0, guardian: 0, phreak: 0 };
  const m2: Record<BotType, number> = { breacher: 0, guardian: 0, phreak: 0 };

  for (const bid of SWARM_LEAD_BATTALION_IDS) {
    const a = leadAssignments[bid];
    if (!a || a.quantity <= 0) continue;
    const bt = a.botType as BotType;
    if (!types.includes(bt)) continue;
    if (a.markLevel === 2) m2[bt] += a.quantity;
    else m1[bt] += a.quantity;
  }

  for (const bt of types) {
    const owned1 = Math.max(0, Math.floor(Number(botCounts?.[bt] ?? 0)));
    const owned2 = Math.max(0, Math.floor(Number(botCountsM2?.[bt] ?? 0)));
    if (m1[bt] > owned1) {
      return {
        ok: false,
        message: `Mark I ${bt}: ${m1[bt]} assigned across lead slots but only ${owned1} in barracks.`,
      };
    }
    if (m2[bt] > owned2) {
      return {
        ok: false,
        message: `Mark II ${bt}: ${m2[bt]} assigned across lead slots but only ${owned2} in barracks.`,
      };
    }
  }
  return { ok: true };
}

export const BattlePreparationScreen = React.memo(
  ({
    onClose,
    onBattleStart,
    defenderId,
    defenderNpcSlug,
    defenderNpcInstanceId,
    hackMapCell,
    swarmLeadSetup,
  }: Props) => {
  const colors = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedBattalion, setSelectedBattalion] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, BattalionAssignment>>({});
  const [shieldCheckModalVisible, setShieldCheckModalVisible] = useState(false);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const [hunterSlotOneAssigned, setHunterSlotOneAssigned] = useState(false);
  /** Mirrors hunter slot selection for queued preset tasks to avoid stale closure reads (Bugbot). */
  const hunterSlotOneAssignedRef = useRef(false);
  /** Mirrors {@link isStartingBattle} synchronously for deploy guards (Bugbot: avoid stale useCallback closure vs async setState). */
  const isStartingBattleRef = useRef(false);
  /** Held only for the actual startBattle / launchAttackMarch phase — not during shield-only prep (Bugbot: shield return must not block continue). */
  const deployInFlightRef = useRef(false);
  /** Re-entry guard for {@link executeDeploy}(true): top of that path clears {@link isStartingBattleRef}, so the usual double-tap guard does not apply until {@link deployInFlightRef} (Bugbot). */
  const shieldContinueDeployRef = useRef(false);
  const token = useAppSelector((state) => state.auth.token);
  const userId = useAppSelector((state) => state.auth.user?._id);
  const botCounts = useAppSelector((state) => state.bots.botCounts);
  const botCountsM2 = useAppSelector((state) => state.bots.botCountsM2);
  const userBalance = useAppSelector((state) => state.balance.total ?? 0);
  const [assignToBattalion] = useAssignToBattalionMutation();
  const [assignPresetBattalions] = useAssignPresetBattalionsMutation();
  const { refetch: refetchBots } = useFetchBotsQuery(undefined, { skip: !token });
  const [startBattle] = useStartBattleMutation();
  const [launchAttackMarch] = useLaunchAttackMarchMutation();
  const [createSwarmSession] = useCreateSwarmMutation();
  const [commitSwarmSlot] = useCommitSwarmSlotMutation();
  const [abortSwarmSession] = useAbortSwarmMutation();
  const mineCached = useAppSelector((s) => attackApi.endpoints.getMyAttackMarches.select(undefined)(s));
  const attackMarchPollMs = getAttackMarchMinePollingIntervalMs(
    mineCached.data?.asyncMarchesEnabled,
    mineCached.data?.marches
  );
  const { data: attackMarchMeta, refetch: refetchMyMarches } = useGetMyAttackMarchesQuery(undefined, {
    skip: !token,
    pollingInterval: attackMarchPollMs,
  });
  const asyncMarchesEnabled = attackMarchMeta?.asyncMarchesEnabled === true;
  /** Orphan march rows when async is off must not block legacy live deploy (Bugbot / ENABLE_ASYNC_BATTLES). */
  const hasBlockingMarch =
    asyncMarchesEnabled && (attackMarchMeta?.marches?.length ?? 0) > 0;
  const [deactivateShield] = useDeactivateShieldMutation();
  /** Single source for hack-rig vs map/NPC target (Bugbot: do not duplicate in `battleStartData` useMemo). */
  const isHackRigBattle = !defenderId && !defenderNpcSlug;
  const isSwarmLeadSetup = swarmLeadSetup != null;
  const { data: huntersData } = useFetchMyHuntersQuery(undefined, { skip: !token || isSwarmLeadSetup });
  const hasKaitoHunter = React.useMemo(
    () => (huntersData?.hunters ?? []).some((h) => h.hunterRosterId === BUG_HUNT_ROSTER_ID_KAITO),
    [huntersData?.hunters]
  );
  const canAssignHunterToBattle = !isSwarmLeadSetup && hasKaitoHunter;
  const selectedBattleHunterRosterId = hunterSlotOneAssigned && canAssignHunterToBattle ? BUG_HUNT_ROSTER_ID_KAITO : undefined;
  const selectedBattleHunterVisualKey =
    hunterSlotOneAssigned && canAssignHunterToBattle ? BUG_HUNT_VISUAL_KEY_KAITO_SPRINT : undefined;
  const wantsMarchLaunch =
    asyncMarchesEnabled &&
    !isHackRigBattle &&
    !isSwarmLeadSetup &&
    hackMapCell != null &&
    Number.isFinite(hackMapCell.x) &&
    Number.isFinite(hackMapCell.y);
  const { data: myMapPos } = useGetMyMapPositionQuery('me', {
    skip: !token || !wantsMarchLaunch,
  });
  const { data: shieldData } = useGetShieldStatusQuery(undefined, {
    pollingInterval: 1000,
  });
  const { highlightTaskId, highlightStep, advanceHighlightStep } = useTaskGuideHighlight();
  
  const isFreeHackRig = highlightTaskId === 'free-hack-rig';
  const isBattalionAHighlight = isFreeHackRig && highlightStep === 'battalion-a';
  const isDeployPurgeHighlight = isFreeHackRig && highlightStep === 'deploy-purge';
  
  // Get research features data (same as other components)
  const { data: researchFeatures } = useGetUserFeaturesQuery('home-defense');
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability');
  const mark2Unlocked =
    hackAbilityFeatures?.some(
      (f: { id?: string; isUnlocked?: boolean }) => f.id === 'mark-2-bots' && f.isUnlocked
    ) ?? false;
  
  // Find the antivirus feature from the research features
  const antivirusFeature = researchFeatures?.find(f => f.id === 'antivirus');
  
  // Use local timer logic to determine if actually unlocked (same as other components)
  const isActuallyUnlocked = useMemo(() => {
    const now = new Date().getTime();
    const researchCompletesAt = antivirusFeature?.researchCompletesAt ? new Date(antivirusFeature.researchCompletesAt).getTime() : 0;
    const remaining = Math.max(0, researchCompletesAt - now);
    return antivirusFeature?.isUnlocked || 
      (antivirusFeature?.isResearching && remaining === 0);
  }, [antivirusFeature?.isUnlocked, antivirusFeature?.isResearching, antivirusFeature?.researchCompletesAt]);

  // Battalion C/D/E/F unlock state (shared logic with server isBattalionSlotUnlocked)
  const { isBattalionCUnlocked, isBattalionDUnlocked, isBattalionEUnlocked, isBattalionFUnlocked } = useBattalionSlotUnlocks();
  const effectiveSlotUnlocks = useMemo(() => {
    if (isSwarmLeadSetup) {
      return {
        isBattalionCUnlocked: true,
        isBattalionDUnlocked: true,
        isBattalionEUnlocked: true,
        isBattalionFUnlocked: true,
      };
    }
    return {
      isBattalionCUnlocked,
      isBattalionDUnlocked,
      isBattalionEUnlocked,
      isBattalionFUnlocked,
    };
  }, [isSwarmLeadSetup, isBattalionCUnlocked, isBattalionDUnlocked, isBattalionEUnlocked, isBattalionFUnlocked]);

  // Memoize available battalions array (A and B always available)
  const availableBattalions = useMemo(() => {
    return ['A', 'B'];
  }, []);

  // Available Mark I / Mark II pools after other battalion assignments (same family can differ by mark).
  const { availableM1, availableM2 } = useMemo(() => {
    const m1: Record<BotType, number> = { ...botCounts };
    const m2: Record<BotType, number> = { ...botCountsM2 };

    Object.entries(assignments).forEach(([battalionId, assignment]) => {
      // Swarm lead: assignments are client-only; exclude the open slot so its prior bots count toward `available` for QuantitySelector (Bugbot / ios-bugs.md).
      if (isSwarmLeadSetup && battalionId === selectedBattalion) {
        return;
      }
      if (assignment && assignment.quantity > 0) {
        const bt = assignment.botType as BotType;
        const ml = assignment.markLevel === 2 ? 2 : 1;
        if (ml === 2) {
          m2[bt] -= assignment.quantity;
        } else {
          m1[bt] -= assignment.quantity;
        }
      }
    });

    (['breacher', 'guardian', 'phreak'] as BotType[]).forEach((bt) => {
      if (m1[bt] < 0) m1[bt] = 0;
      if (m2[bt] < 0) m2[bt] = 0;
    });

    return { availableM1: m1, availableM2: m2 };
  }, [botCounts, botCountsM2, assignments, isSwarmLeadSetup, selectedBattalion]);

  useEffect(() => {
    Animated.sequence([
      ...Array(2).fill(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ),
      Animated.timing(pulseAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  const swipeIndicatorStyle = useMemo(() => ({
    opacity: pulseAnim,
    transform: [{
      translateX: pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -35],
      }),
    }],
  }), [pulseAnim]);

  const handleBattalionPress = React.useCallback((name: string) => {
    if (isBattalionAHighlight && name === 'A') {
      advanceHighlightStep();
    }
    setSelectedBattalion(name);
    setSelectorVisible(true);
  }, [isBattalionAHighlight, advanceHighlightStep]);

  const handleBotAssignment = React.useCallback(
    async (data: { botType: BotType; quantity: number; markLevel: 1 | 2 }) => {
    if (!selectedBattalion) {
      return;
    }

    try {
      if (isSwarmLeadSetup) {
        // Functional updater: `assignments` from closure can be stale across rapid slot updates (Bugbot).
        let inventoryError: string | null = null;
        setAssignments((prev) => {
          const nextAssignments: Record<string, BattalionAssignment> = {
            ...prev,
            [selectedBattalion]: {
              botType: data.botType,
              quantity: data.quantity,
              markLevel: data.markLevel,
            },
          };
          const inv = validateSwarmLeadAssignmentsAgainstInventory(
            nextAssignments,
            botCounts,
            botCountsM2
          );
          if (!inv.ok) {
            inventoryError = inv.message;
            return prev;
          }
          return nextAssignments;
        });
        if (inventoryError) {
          Alert.alert('Not enough bots', inventoryError);
          // Keep selector open so the user can correct quantity/type (Bugbot / ios-bugs.md).
          return;
        }
        setSelectorVisible(false);
        return;
      }

      await assignToBattalion({
        botType: data.botType,
        quantity: data.quantity,
        battalionId: selectedBattalion,
        markLevel: data.markLevel,
      }).unwrap();

      setAssignments((prev) => ({
        ...prev,
        [selectedBattalion]: {
          botType: data.botType,
          quantity: data.quantity,
          markLevel: data.markLevel,
        },
      }));
      setSelectorVisible(false);
    } catch (error) {
      console.error('Failed to assign bots:', error);
      setSelectorVisible(false);
      throw error;
    }
  },
    [selectedBattalion, assignToBattalion, isSwarmLeadSetup, botCounts, botCountsM2]
  );

  /** Serialize preset applies; skip identical successful lineup. Preset uses POST /assign-preset (one request) to avoid per-slot rate limits. */
  const presetApplyChainRef = useRef(Promise.resolve());
  const lastSuccessfulPresetSigRef = useRef<string | null>(null);

  const handleApplyPreset = React.useCallback(
    (
      presetId: string,
      presetAssignments: Record<string, BattalionAssignment>,
      options?: { hunterSlotOneRosterId?: 'kaito_glitch' }
    ) => {
      const sig = `${presetId}:${JSON.stringify(
        ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => presetAssignments[id] ?? null)
      )}:${options?.hunterSlotOneRosterId ?? ''}`;
      const applyPresetHunterSlotSelection = () => {
        if (isSwarmLeadSetup) {
          return;
        }
        const enableHunter = options?.hunterSlotOneRosterId === BUG_HUNT_ROSTER_ID_KAITO && hasKaitoHunter;
        setHunterSlotOneAssigned(enableHunter);
      };

      const task = async () => {
        if (lastSuccessfulPresetSigRef.current === sig) {
          const wantsHunterSlotOne = options?.hunterSlotOneRosterId === BUG_HUNT_ROSTER_ID_KAITO;
          if (!wantsHunterSlotOne) {
            return;
          }
          if (!hunterSlotOneAssignedRef.current) {
            applyPresetHunterSlotSelection();
          }
          return;
        }
        if (
          options?.hunterSlotOneRosterId === BUG_HUNT_ROSTER_ID_KAITO &&
          !hasKaitoHunter
        ) {
          // Hunter ownership query may still be loading. Do not lock this preset signature yet.
          lastSuccessfulPresetSigRef.current = null;
          return;
        }
        if (isSwarmLeadSetup) {
          const inv = validateSwarmLeadAssignmentsAgainstInventory(
            presetAssignments,
            botCounts,
            botCountsM2
          );
          if (!inv.ok) {
            Alert.alert('Not enough bots for this preset', inv.message);
            return;
          }
          setAssignments(presetAssignments);
          applyPresetHunterSlotSelection();
          lastSuccessfulPresetSigRef.current = sig;
          return;
        }
        setAssignments(presetAssignments);
        applyPresetHunterSlotSelection();
        try {
          const assignmentList = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((battalionId) => {
            const a = presetAssignments[battalionId];
            if (!a || a.quantity <= 0) return [];
            return [
              {
                battalionId,
                botType: a.botType as BotType,
                quantity: a.quantity,
                markLevel: a.markLevel ?? 1,
              },
            ];
          });
          await assignPresetBattalions({ assignments: assignmentList }).unwrap();
          setAssignments(presetAssignments);
          lastSuccessfulPresetSigRef.current = sig;
          refetchBots().catch(() => {});
        } catch (error: unknown) {
          console.error('Failed to apply preset:', error);
          lastSuccessfulPresetSigRef.current = null;
          const status =
            error && typeof error === 'object' && 'status' in error
              ? (error as { status?: number }).status
              : undefined;
          if (status === 429) {
            Alert.alert(
              'Slow down',
              'Too many battalion updates at once. Wait a few seconds and try again.',
            );
          } else {
            Alert.alert(
              'Could not apply preset',
              'Your battalion lineup may not match the server. Try again or assign manually.',
            );
          }
          try {
            const { data } = await refetchBots();
            const list = data?.battalionAssignments as
              | Array<{ battalionId: string; botType: BotType; quantity: number; markLevel?: number }>
              | undefined;
            if (list) {
              const next: Record<string, BattalionAssignment> = {};
              for (const a of list) {
                if (a.battalionId && a.quantity > 0) {
                  next[a.battalionId] = {
                    botType: a.botType,
                    quantity: a.quantity,
                    markLevel: a.markLevel ?? 1,
                  };
                }
              }
              setAssignments(next);
            }
          } catch (refetchErr) {
            console.error('Failed to refetch bots after preset error:', refetchErr);
          }
        }
      };

      presetApplyChainRef.current = presetApplyChainRef.current.then(task).catch(() => {
        /* task handles errors; keep chain usable for the next preset tap */
      });
      return presetApplyChainRef.current;
    },
    [
      assignPresetBattalions,
      refetchBots,
      isSwarmLeadSetup,
      botCounts,
      botCountsM2,
      hasKaitoHunter,
    ]
  );

  React.useEffect(() => {
    hunterSlotOneAssignedRef.current = hunterSlotOneAssigned;
  }, [hunterSlotOneAssigned]);

  // Convert assignments to battalion data format
  const convertAssignmentsToBattalionData = React.useCallback((assignments: Record<string, BattalionAssignment>) => {
    const battalionData: Array<{ type: BotType; quantity: number; markLevel: 1 | 2 }> = [];

    Object.entries(assignments).forEach(([, assignment]) => {
      if (assignment && assignment.quantity > 0) {
        const ml: 1 | 2 = assignment.markLevel === 2 ? 2 : 1;
        battalionData.push({
          type: assignment.botType as BotType,
          quantity: assignment.quantity,
          markLevel: ml,
        });
      }
    });

    return battalionData;
  }, []);

  // Use real assignments instead of hardcoded mock data
  const userBattalions = React.useMemo(() => {
    const realBattalions = convertAssignmentsToBattalionData(assignments);
    return realBattalions;
  }, [assignments, convertAssignmentsToBattalionData]);

  // Validate deployment - require at least one battalion with bots assigned
  const validateDeployment = React.useCallback((assignments: Record<string, BattalionAssignment>): { isValid: boolean; message: string } => {
    if (isSwarmLeadSetup) {
      const leadSlots = ['A', 'B', 'C', 'D', 'E', 'F'];
      const filled = leadSlots.filter((slot) => (assignments[slot]?.quantity ?? 0) > 0);
      // Matches server `hasLeaderParticipant`: at least one lead slot (1–6) — not all six required.
      if (filled.length < 1) {
        return {
          isValid: false,
          message: 'Commit at least one lead battalion (slots A–F) before continuing to the swarm room.',
        };
      }
      const inv = validateSwarmLeadAssignmentsAgainstInventory(assignments, botCounts, botCountsM2);
      if (!inv.ok) {
        return { isValid: false, message: inv.message };
      }
      return { isValid: true, message: 'Swarm lead payload ready.' };
    }

    const hasValidAssignment = Object.values(assignments).some(
      assignment => assignment && assignment.quantity > 0
    );
    
    if (hasValidAssignment) {
      return {
        isValid: true,
        message: 'Deployment ready!'
      };
    } else {
      return {
        isValid: false,
        message: 'Please assign at least one battalion before deploying.'
      };
    }
  }, [isSwarmLeadSetup, botCounts, botCountsM2]);

  const battleStartData = React.useMemo(() => {
    const hasCell =
      hackMapCell != null &&
      Number.isFinite(hackMapCell.x) &&
      Number.isFinite(hackMapCell.y);
    return {
      userBattalions,
      screenWidth: SCREEN_WIDTH,
      screenHeight: SCREEN_HEIGHT,
      defenderId,
      defenderNpcSlug: isHackRigBattle ? undefined : defenderNpcSlug,
      unlockHackRigOnWin: isHackRigBattle,
      defenderNpcInstanceId,
      ...(selectedBattleHunterRosterId != null
        ? {
            hunterRosterId: selectedBattleHunterRosterId,
            hunterVisualKey: selectedBattleHunterVisualKey,
          }
        : {}),
      ...(hasCell ? { hackMapCellX: hackMapCell!.x, hackMapCellY: hackMapCell!.y } : {}),
    };
  }, [
    userBattalions,
    defenderId,
    defenderNpcSlug,
    defenderNpcInstanceId,
    selectedBattleHunterRosterId,
    selectedBattleHunterVisualKey,
    hackMapCell,
    isHackRigBattle,
  ]);

  const { clearHighlight } = useTaskGuideHighlight();

  const executeDeploy = React.useCallback(
    async (afterShieldDeactivation: boolean) => {
      if (afterShieldDeactivation) {
        if (shieldContinueDeployRef.current) return;
        shieldContinueDeployRef.current = true;
      }
      try {
        if (afterShieldDeactivation) {
          isStartingBattleRef.current = false;
          setIsStartingBattle(false);
        }
        if (isStartingBattleRef.current && !afterShieldDeactivation) {
          return;
        }

        const validation = validateDeployment(assignments);
        if (!validation.isValid) {
          console.error('Deployment validation failed:', validation.message);
          if (isDeployPurgeHighlight) {
            clearHighlight();
          }
          return;
        }

        if (isDeployPurgeHighlight) {
          clearHighlight();
        }

        // Shield continue: no refetch here (latency); blocking uses RTK cache / 15s poll (Bugbot).
        let marchMetaForBlock = attackMarchMeta;
        if (!afterShieldDeactivation) {
          const marchesRefetch = await refetchMyMarches();
          marchMetaForBlock =
            marchesRefetch.data !== undefined ? marchesRefetch.data : attackMarchMeta;
        }
        // Swarm lead prep only creates/refreshes a session + commits slots; march deploy happens later in Swarm Room (Bugbot / ios-bugs.md).
        if (
          !isSwarmLeadSetup &&
          marchMetaForBlock?.asyncMarchesEnabled === true &&
          (marchMetaForBlock?.marches?.length ?? 0) > 0
        ) {
          Alert.alert(
            'Expedition in progress',
            'Finish or cancel your current hack march (or wait until it completes) before deploying again.'
          );
          return;
        }

        const isShieldActive = (isActuallyUnlocked && shieldData?.isActive) || false;
        // Map PvP uses `defenderId`; swarm lead prep uses `swarmLeadSetup.targetUserId` only — both require shield off before attacking a player (Bugbot / ios-bugs.md).
        const isAttackingPlayerTarget =
          (!!defenderId && !defenderNpcSlug) ||
          (isSwarmLeadSetup && !!swarmLeadSetup?.targetUserId);
        if (!afterShieldDeactivation && isShieldActive && isAttackingPlayerTarget) {
          setShieldCheckModalVisible(true);
          return;
        }

        if (deployInFlightRef.current) return;
        deployInFlightRef.current = true;
        try {
          setIsStartingBattle(true);
          isStartingBattleRef.current = true;
          // Bugbot: every exit from inner try runs inner finally — isStartingBattle + ref cleared.
          try {
            if (isSwarmLeadSetup && swarmLeadSetup) {
              const slotByBattalion: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
              const created = await createSwarmSession({
                targetUserId: swarmLeadSetup.targetUserId,
                targetX: swarmLeadSetup.targetX,
                targetY: swarmLeadSetup.targetY,
              }).unwrap();
              const swarmId = created?.swarmId;
              if (!swarmId) {
                Alert.alert('Swarm', 'Failed to create swarm session.');
                return;
              }

              try {
                for (const battalionId of ['A', 'B', 'C', 'D', 'E', 'F']) {
                  const assignment = assignments[battalionId];
                  if (!assignment || assignment.quantity <= 0) {
                    continue;
                  }
                  await commitSwarmSlot({
                    swarmId,
                    slotIndex: slotByBattalion[battalionId],
                    botType: assignment.botType as 'breacher' | 'guardian' | 'phreak',
                    quantity: assignment.quantity,
                    markLevel: assignment.markLevel === 2 ? 2 : 1,
                  }).unwrap();
                }
              } catch (commitError) {
                try {
                  await abortSwarmSession({ swarmId }).unwrap();
                } catch (abortError) {
                  console.error('Failed to rollback swarm after setup error:', abortError);
                }
                throw commitError;
              }

              onBattleStart(undefined, { mode: 'swarm' });
            } else if (wantsMarchLaunch && hackMapCell) {
              if (
                myMapPos == null ||
                !Number.isFinite(myMapPos.x) ||
                !Number.isFinite(myMapPos.y)
              ) {
                Alert.alert(
                  'Home position unavailable',
                  'Open the Hack Map so your property location can load, then try Deploy again.'
                );
                return;
              }
              const res = await launchAttackMarch({
                userBattalions: battleStartData.userBattalions,
                screenWidth: battleStartData.screenWidth,
                screenHeight: battleStartData.screenHeight,
                originX: Math.floor(myMapPos.x),
                originY: Math.floor(myMapPos.y),
                hackMapCellX: hackMapCell.x,
                hackMapCellY: hackMapCell.y,
                defenderId: battleStartData.defenderId,
                defenderNpcSlug: battleStartData.defenderNpcSlug,
                defenderNpcInstanceId,
                hunterRosterId: selectedBattleHunterRosterId,
                hunterVisualKey: selectedBattleHunterVisualKey,
              }).unwrap();
              if (!res.success || res.data == null) {
                const msg =
                  typeof res.error === 'string' && res.error.length > 0 ? res.error : 'Could not start march';
                Alert.alert('Deploy failed', msg);
                return;
              }
              await refetchBots();
              void refetchMyMarches();
              onBattleStart(res.data.marchId, { mode: 'march' });
              if (userId) {
                trackFirstBattle(userId).catch((error) => {
                  console.error('[Analytics] Error tracking first_battle:', error);
                });
              }
            } else {
              const result = await startBattle(battleStartData).unwrap();
              onBattleStart(result.battleId, { mode: 'live' });
              if (userId) {
                trackFirstBattle(userId).catch((error) => {
                  console.error('[Analytics] Error tracking first_battle:', error);
                });
              }
            }
          } catch (error: unknown) {
            console.error('Deploy failed:', error);
            const data = error && typeof error === 'object' && 'data' in error ? (error as { data?: unknown }).data : undefined;
            const body =
              data && typeof data === 'object' && data !== null && 'error' in data
                ? String((data as { error?: unknown }).error ?? '')
                : '';
            const msg = body.length > 0 ? body : 'Deploy failed. Please try again.';
            Alert.alert('Deploy failed', msg);
            // Stay on prep (same as !res.success / map position guard); do not navigate with a missing battle id.
          } finally {
            isStartingBattleRef.current = false;
            setIsStartingBattle(false);
          }
        } finally {
          deployInFlightRef.current = false;
        }
      } finally {
        if (afterShieldDeactivation) {
          shieldContinueDeployRef.current = false;
        }
      }
    },
    [
      assignments,
      attackMarchMeta,
      abortSwarmSession,
      battleStartData,
      commitSwarmSlot,
      clearHighlight,
      createSwarmSession,
      defenderId,
      defenderNpcInstanceId,
      defenderNpcSlug,
      hackMapCell,
      isActuallyUnlocked,
      isDeployPurgeHighlight,
      isSwarmLeadSetup,
      launchAttackMarch,
      myMapPos,
      onBattleStart,
      refetchBots,
      refetchMyMarches,
      shieldData?.isActive,
      startBattle,
      swarmLeadSetup,
      selectedBattleHunterRosterId,
      selectedBattleHunterVisualKey,
      userId,
      validateDeployment,
      wantsMarchLaunch,
    ]
  );

  const handleBattleStart = React.useCallback(() => {
    void executeDeploy(false);
  }, [executeDeploy]);

  const handleShieldModalContinue = React.useCallback(async () => {
    setShieldCheckModalVisible(false);
    try {
      await deactivateShield().unwrap();
    } catch (error) {
      console.error('Failed to deactivate shield:', error);
      return;
    }
    await executeDeploy(true);
  }, [deactivateShield, executeDeploy]);

  // Reset assignments when component mounts - start fresh each battle prep session
  useEffect(() => {
    setAssignments({});
    setSelectedBattalion(null);
    setHunterSlotOneAssigned(false);
    hunterSlotOneAssignedRef.current = false;
  }, []);

  const handleToggleHunterSlotOne = React.useCallback(() => {
    if (!canAssignHunterToBattle) {
      return;
    }
    setHunterSlotOneAssigned((prev) => !prev);
  }, [canAssignHunterToBattle]);

  const renderBattalionSlots = React.useCallback((names: string[], isEnemy = false, isLocked = false) => (
    <View style={styles.battalionColumn}>
      {names.map(name => {
        const isHighlighted = isBattalionAHighlight && name === 'A' && !isEnemy && !isLocked;
        const shouldDisable = isBattalionAHighlight && name !== 'A' && !isEnemy && !isLocked;
        return (
          <BattalionSlot
            key={name}
            name={name}
            isEnemy={isEnemy}
            isLocked={isLocked}
            onPress={!isLocked ? () => handleBattalionPress(name) : undefined}
            assignment={!isEnemy && !isLocked ? assignments[name] : undefined}
            isHighlighted={isHighlighted}
            disabled={shouldDisable}
          />
        );
      })}
    </View>
  ), [assignments, handleBattalionPress, isBattalionAHighlight]);

  const renderCircleSlots = React.useCallback((count: number, isEnemy = false) => (
    <View style={isEnemy ? styles.circleColumnEnemy : styles.circleColumn}>
      {Array(count).fill(null).map((_, index) => (
        <CircleSlot
          key={index}
          isEnemy={isEnemy}
          isEnabled={!isEnemy && index === 0 && canAssignHunterToBattle}
          isFilled={!isEnemy && index === 0 && hunterSlotOneAssigned}
          label={!isEnemy && index === 0 ? (canAssignHunterToBattle ? 'SLOT 1' : 'LOCKED') : undefined}
          filledLabel={!isEnemy && index === 0 ? 'KAITO' : undefined}
          imageSource={!isEnemy && index === 0 && hunterSlotOneAssigned ? KAITO_GLITCH_HEADSHOT_IMAGE : undefined}
          onPress={!isEnemy && index === 0 ? handleToggleHunterSlotOne : undefined}
        />
      ))}
    </View>
  ), [canAssignHunterToBattle, handleToggleHunterSlotOne, hunterSlotOneAssigned]);

  const deploymentReady = validateDeployment(assignments).isValid;
  const deployDisabled =
    !deploymentReady || isStartingBattle || (hasBlockingMarch && !isSwarmLeadSetup);
  const deployBusyLabel = isSwarmLeadSetup ? 'BUILDING SWARM...' : wantsMarchLaunch ? 'DISPATCHING...' : 'STARTING...';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {isFreeHackRig && !isDeployPurgeHighlight && (
        <TaskGuideHighlightOverlay 
          forBattalionA={isBattalionAHighlight}
          forDeployPurge={false}
        />
      )}
      <View style={{ zIndex: (isBattalionAHighlight || isDeployPurgeHighlight) ? 3 : 1000, pointerEvents: (isBattalionAHighlight || isDeployPurgeHighlight) ? 'none' : 'auto' }}>
        <CloseButton onPress={onClose} />
      </View>

      <View style={styles.fixedHeader}>
        <Text style={[styles.title, { color: colors.secondary }]}>
          {isSwarmLeadSetup ? 'SWARM PREPARATION' : 'BATTLE PREPARATION'}
        </Text>
      </View>

      <View style={[styles.mainContainer, isBattalionAHighlight && { zIndex: 1000, elevation: 1000 }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!isBattalionAHighlight}
          style={styles.horizontalPager}
          contentContainerStyle={styles.horizontalPagerContent}
        >
          {/* User Forces Screen */}
          <View style={styles.screen}>
            <Text style={[styles.subtitle, { color: colors.text.accent }]}>[USER FORCES]</Text>
            <Animated.View style={[styles.swipeIndicator, swipeIndicatorStyle]}>
              <Text style={[styles.swipeArrow, { color: colors.text.accent }]}>⟶</Text>
              <Text style={[styles.swipeText, { color: colors.text.accent }]}>ENEMY FORCES</Text>
            </Animated.View>
            <ScrollView
              style={styles.battalionVerticalScroll}
              contentContainerStyle={styles.battalionVerticalScrollContent}
              scrollEnabled={!isBattalionAHighlight}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.battalionsContainer, isBattalionAHighlight && { zIndex: 1001, elevation: 1001 }]}>
                {!effectiveSlotUnlocks.isBattalionEUnlocked ? (
                  renderBattalionSlots(['E', 'F'], false, true)
                ) : (
                  <View style={styles.battalionColumn}>
                    <BattalionSlot
                      name="E"
                      isEnemy={false}
                      isLocked={false}
                      onPress={() => handleBattalionPress('E')}
                      assignment={assignments['E']}
                      isHighlighted={false}
                      disabled={isBattalionAHighlight}
                    />
                    <BattalionSlot
                      name="F"
                      isEnemy={false}
                      isLocked={!effectiveSlotUnlocks.isBattalionFUnlocked}
                      onPress={effectiveSlotUnlocks.isBattalionFUnlocked ? () => handleBattalionPress('F') : undefined}
                      assignment={effectiveSlotUnlocks.isBattalionFUnlocked ? assignments['F'] : undefined}
                      isHighlighted={false}
                      disabled={isBattalionAHighlight}
                    />
                  </View>
                )}
                {!effectiveSlotUnlocks.isBattalionCUnlocked ? (
                  renderBattalionSlots(['C', 'D'], false, true)
                ) : (
                  <View style={styles.battalionColumn}>
                    <BattalionSlot
                      name="C"
                      isEnemy={false}
                      isLocked={false}
                      onPress={() => handleBattalionPress('C')}
                      assignment={assignments['C']}
                      isHighlighted={false}
                      disabled={isBattalionAHighlight}
                    />
                    <BattalionSlot
                      name="D"
                      isEnemy={false}
                      isLocked={!effectiveSlotUnlocks.isBattalionDUnlocked}
                      onPress={effectiveSlotUnlocks.isBattalionDUnlocked ? () => handleBattalionPress('D') : undefined}
                      assignment={effectiveSlotUnlocks.isBattalionDUnlocked ? assignments['D'] : undefined}
                      isHighlighted={false}
                      disabled={isBattalionAHighlight}
                    />
                  </View>
                )}
                {renderBattalionSlots(availableBattalions)}
                {renderCircleSlots(3)}
              </View>
            </ScrollView>
          </View>

          {/* Enemy Forces Screen */}
          <View style={styles.screen}>
            <Text style={[styles.subtitleEnemy, { color: colors.error }]}>[ENEMY FORCES]</Text>
            <ScrollView
              style={styles.battalionVerticalScroll}
              contentContainerStyle={styles.battalionVerticalScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.battalionsContainer, styles.battalionsContainerEnemy]}>
                {renderCircleSlots(3, true)}
                {renderBattalionSlots(['A', 'B'], true)}
                {renderBattalionSlots(['C', 'D'], true, true)}
                {renderBattalionSlots(['E', 'F'], true, true)}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {!isDeployPurgeHighlight && (
        <View>
          <PresetBar
            botCounts={botCounts}
            userBalance={userBalance}
            unlockedSlots={effectiveSlotUnlocks}
            onApplyPreset={handleApplyPreset}
            maxBattalionSizeOverride={isSwarmLeadSetup ? 5000 : undefined}
          />
          <TouchableOpacity
            style={[
              styles.executeButton,
              { 
                backgroundColor: colors.secondary + '1A',
                borderColor: colors.secondary,
                borderWidth: 1,
              },
              deployDisabled && {
                opacity: 0.5,
                backgroundColor: colors.neutral + '1A',
                borderColor: colors.neutral
              }
            ]}
            onPress={handleBattleStart}
            disabled={deployDisabled}
          >
            <Text style={[
              styles.executeText,
              { 
                color: colors.secondary,
              },
              deployDisabled && {
                color: colors.neutral,
              }
            ]}>
              {isStartingBattle ? deployBusyLabel : isSwarmLeadSetup ? 'CONTINUE TO SWARM ROOM' : 'DEPLOY PURGE'}
            </Text>
          </TouchableOpacity>
          {hasBlockingMarch && !isSwarmLeadSetup ? (
            <Text style={[styles.marchBlockHint, { color: colors.text.secondary }]}>
              You already have a hack expedition in progress. Committed bots stay out of Digital Barracks and full
              home defense until your army returns home (including a cancel recall leg on the Hack Map).
            </Text>
          ) : null}
        </View>
      )}
      {isFreeHackRig && isDeployPurgeHighlight && (
        <TaskGuideHighlightOverlay 
          forBattalionA={false}
          forDeployPurge={true}
        />
      )}
      {isDeployPurgeHighlight && (
          <View style={{
            position: 'absolute',
            bottom: Platform.OS === 'android' ? SIZING.spacing.sm + 24 : SIZING.spacing.sm,
            left: SIZING.spacing.sm,
            right: SIZING.spacing.sm,
            zIndex: 10000,
            elevation: 10000,
            pointerEvents: 'box-none',
          }}>
            <TouchableOpacity
              style={[
                styles.executeButton,
                { 
                  backgroundColor: colors.secondary + '1A',
                  borderColor: undefined,
                  borderWidth: 3,
                },
                deployDisabled && {
                  opacity: 0.5,
                  backgroundColor: colors.neutral + '1A',
                  borderColor: colors.neutral
                }
              ]}
              onPress={handleBattleStart}
              disabled={deployDisabled}
              activeOpacity={0.7}
            >
              {!deployDisabled ? (
                <DeployPurgeHighlightBorder colors={colors} />
              ) : null}
              <Text style={[
                styles.executeText,
                { 
                  color: colors.secondary,
                },
                deployDisabled && {
                  color: colors.neutral,
                }
              ]}>
                {isStartingBattle ? deployBusyLabel : isSwarmLeadSetup ? 'CONTINUE TO SWARM ROOM' : 'DEPLOY PURGE'}
              </Text>
            </TouchableOpacity>
          </View>
      )}

      <BattalionBotSelector
        isVisible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onSubmit={handleBotAssignment}
        battalionName={selectedBattalion || ''}
        availableM1={availableM1}
        availableM2={availableM2}
        mark2Unlocked={mark2Unlocked}
        maxQuantityOverride={isSwarmLeadSetup ? 5000 : undefined}
      />

      <ShieldCheckModal
        visible={shieldCheckModalVisible}
        onClose={() => setShieldCheckModalVisible(false)}
        onContinue={handleShieldModalContinue}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'center',
  },
  mainContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  /** Horizontal USER ↔ ENEMY pager; flex so each page gets a bounded height for nested vertical scroll. */
  horizontalPager: {
    flex: 1,
  },
  horizontalPagerContent: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  screen: {
    width: SCREEN_WIDTH,
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    paddingTop: SIZING.spacing.lg,
  },
  /** Phase 2: only battalion slots scroll vertically; presets + deploy stay outside. */
  battalionVerticalScroll: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
  },
  battalionVerticalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SIZING.spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    marginBottom: SIZING.spacing.sm,
    marginTop: SIZING.spacing.sm * 6,
    marginRight: SIZING.spacing.sm * 14,
  },
  subtitleEnemy: {
    fontSize: 24,
    marginBottom: SIZING.spacing.sm,
    marginTop: SIZING.spacing.sm * 5,
    marginRight: SIZING.spacing.sm * 16,
  },
  battalionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZING.spacing.lg,
  },
  battalionsContainerEnemy: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZING.spacing.lg,
    marginLeft: -SIZING.spacing.lg * 10,
  },
  battalionColumn: {
    gap: SIZING.spacing.md,
  },
  circleColumn: {
    marginLeft: SIZING.spacing.lg,
    justifyContent: 'flex-start',
    gap: SIZING.spacing.xs,
    paddingTop: 4,
  },
  circleColumnEnemy: {
    marginRight: SIZING.spacing.lg,
    justifyContent: 'flex-start',
    gap: SIZING.spacing.xs,
    paddingTop: 4,
  },
  executeButton: {
    marginHorizontal: SIZING.spacing.sm,
    marginBottom: Platform.OS === 'android' ? SIZING.spacing.sm + 24 : SIZING.spacing.sm,
    height: 50,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  executeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  marchBlockHint: {
    marginHorizontal: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.sm,
    fontSize: 12,
    textAlign: 'center',
  },
  swipeIndicator: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.xs,
    paddingRight: SIZING.spacing.lg * 5,
    marginTop: -SIZING.spacing.lg * 1.5,
  },
  swipeArrow: {
    fontSize: 24,
  },
  swipeText: {
    fontSize: 12,
    letterSpacing: 1,
  },
});
