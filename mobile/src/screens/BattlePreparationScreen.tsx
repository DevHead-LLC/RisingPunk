import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, Animated, Platform } from 'react-native';
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
import { useAssignToBattalionMutation } from '../store/api/botsApi';
import { useStartBattleMutation } from '../store/api/battleApi';
import { useGetShieldStatusQuery, useDeactivateShieldMutation } from '../store/api/antivirusApi';
import { useGetUserFeaturesQuery } from '../store/api/researchFeaturesApi';
import { API_URL } from '../config';
import { useTaskGuideHighlight } from '../contexts/TaskGuideHighlightContext';
import { TaskGuideHighlightOverlay } from '../components/turf/TaskGuideHighlightOverlay';

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
  onBattleStart: (battleId?: string) => void;
  defenderId?: string;
  defenderNpcSlug?: string;
  defenderNpcInstanceId?: string;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BattlePreparationScreen = React.memo(({ onClose, onBattleStart, defenderId, defenderNpcSlug, defenderNpcInstanceId }: Props) => {
  const colors = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedBattalion, setSelectedBattalion] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, BattalionAssignment>>({});
  const [shieldCheckModalVisible, setShieldCheckModalVisible] = useState(false);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const token = useAppSelector((state) => state.auth.token);
  const botCounts = useAppSelector((state) => state.bots.botCounts);
  const [assignToBattalion] = useAssignToBattalionMutation();
  const [startBattle] = useStartBattleMutation();
  const [deactivateShield] = useDeactivateShieldMutation();
  const { data: shieldData } = useGetShieldStatusQuery(undefined, {
    pollingInterval: 1000,
  });
  const { highlightTaskId, highlightStep, advanceHighlightStep } = useTaskGuideHighlight();
  
  const isFreeHackRig = highlightTaskId === 'free-hack-rig';
  const isBattalionAHighlight = isFreeHackRig && highlightStep === 'battalion-a';
  const isDeployPurgeHighlight = isFreeHackRig && highlightStep === 'deploy-purge';
  
  // Get research features data (same as other components)
  const { data: researchFeatures } = useGetUserFeaturesQuery('home-defense');
  
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

  // Calculate available bot counts by subtracting assigned quantities
  const availableBots = useMemo(() => {
    
    const available = { ...botCounts };
    
    // Subtract assigned quantities from available pool
    Object.values(assignments).forEach((assignment) => {
      if (assignment && assignment.quantity > 0) {
        available[assignment.botType as BotType] -= assignment.quantity;
      }
    });
    
    // Ensure quantities don't go below 0
    Object.keys(available).forEach((botType) => {
      if (available[botType as BotType] < 0) {
        available[botType as BotType] = 0;
      }
    });
    
    return available;
  }, [botCounts, assignments]);

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

  const handleBotAssignment = React.useCallback(async (data: { botType: BotType; quantity: number }) => {
    if (!selectedBattalion) return;


    try {
      const result = await assignToBattalion({
        botType: data.botType,
        quantity: data.quantity,
        battalionId: selectedBattalion,
      });


      setAssignments(prev => {
        const newAssignments = {
          ...prev,
          [selectedBattalion]: {
            botType: data.botType,
            quantity: data.quantity,
            markLevel: 1,
          },
        };
        return newAssignments;
      });
    } catch (error) {
      console.error('Failed to assign bots:', error);
    }
    setSelectorVisible(false);
  }, [selectedBattalion, assignToBattalion, botCounts, assignments]);

  const resetBattalions = React.useCallback(async () => {
    try {
      await Promise.all([
        assignToBattalion({ botType: 'breacher', quantity: 0, battalionId: 'A' }),
        assignToBattalion({ botType: 'breacher', quantity: 0, battalionId: 'B' }),
      ]);
    } catch (error) {
      console.error('Failed to reset battalions:', error);
    }
  }, [assignToBattalion]);

  // Convert assignments to battalion data format
  const convertAssignmentsToBattalionData = React.useCallback((assignments: Record<string, BattalionAssignment>) => {
    const battalionData: Array<{type: BotType, quantity: number}> = [];
    
    // Convert assignments to battalion data format
    Object.entries(assignments).forEach(([battalionId, assignment]) => {
      if (assignment && assignment.quantity > 0) {
        battalionData.push({
          type: assignment.botType as BotType,
          quantity: assignment.quantity
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
  }, []);

  const battleStartData = React.useMemo(() => {
    const isHackRigBattle = !defenderId && !defenderNpcSlug;
    return {
      userBattalions,
      screenWidth: SCREEN_WIDTH,
      screenHeight: SCREEN_HEIGHT,
      defenderId,
      defenderNpcSlug: isHackRigBattle ? undefined : defenderNpcSlug,
      unlockHackRigOnWin: isHackRigBattle,
      defenderNpcInstanceId,
    };
  }, [userBattalions, defenderId, defenderNpcSlug, defenderNpcInstanceId]);

  const { clearHighlight } = useTaskGuideHighlight();
  
  // Handle battle start - check for shield warning first
  const handleBattleStart = React.useCallback(async () => {
    // Prevent double-clicks
    if (isStartingBattle) {
      return;
    }

    const validation = validateDeployment(assignments);
    
    if (!validation.isValid && !isDeployPurgeHighlight) {
      console.error('Deployment validation failed:', validation.message);
      return;
    }

    if (isDeployPurgeHighlight) {
      clearHighlight();
    }

    const isShieldActive = (isActuallyUnlocked && shieldData?.isActive) || false;
    const isDefendingUser = !!defenderId && !defenderNpcSlug;
    
    // If attacking user has shield activated AND defending entity is another user, show modal
    if (isShieldActive && isDefendingUser) {
      setShieldCheckModalVisible(true);
      return;
    }

    setIsStartingBattle(true);

    try {
      // Otherwise proceed directly with battle start
      const result = await startBattle(battleStartData).unwrap();
      onBattleStart(result.battleId);
    } catch (error) {
      console.error('Failed to start battle:', error);
      onBattleStart();
    } finally {
      setIsStartingBattle(false);
    }
  }, [assignments, isActuallyUnlocked, shieldData?.isActive, defenderId, defenderNpcSlug, battleStartData, startBattle, onBattleStart, validateDeployment, isStartingBattle, isDeployPurgeHighlight, clearHighlight]);

  // Handle continue from shield modal - deactivate shield and proceed to battle
  const handleShieldModalContinue = React.useCallback(async () => {
    setShieldCheckModalVisible(false);
    setIsStartingBattle(true);
    
    try {
      // First deactivate the shield
      await deactivateShield().unwrap();
      
      // Then start the battle
      const result = await startBattle(battleStartData).unwrap();
      onBattleStart(result.battleId);
    } catch (error) {
      console.error('Failed to deactivate shield or start battle:', error);
      onBattleStart();
    } finally {
      setIsStartingBattle(false);
    }
  }, [battleStartData, startBattle, onBattleStart, deactivateShield]);

  // Reset assignments when component mounts - start fresh each battle prep session
  useEffect(() => {
    setAssignments({});
    setSelectedBattalion(null);
  }, []);

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
        <CircleSlot key={index} isEnemy={isEnemy} />
      ))}
    </View>
  ), []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {isFreeHackRig && (
        <TaskGuideHighlightOverlay 
          forBattalionA={isBattalionAHighlight}
          forDeployPurge={isDeployPurgeHighlight}
        />
      )}
      <View style={{ zIndex: (isBattalionAHighlight || isDeployPurgeHighlight) ? 3 : 1000, pointerEvents: (isBattalionAHighlight || isDeployPurgeHighlight) ? 'none' : 'auto' }}>
        <CloseButton onPress={onClose} />
      </View>

      <View style={styles.fixedHeader}>
        <Text style={[styles.title, { color: colors.secondary }]}>BATTLE PREPARATION</Text>
      </View>

      <View style={[styles.mainContainer, isBattalionAHighlight && { zIndex: 1000, elevation: 1000 }]}>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!isBattalionAHighlight}
        >
          {/* User Forces Screen */}
          <View style={styles.screen}>
            <Text style={[styles.subtitle, { color: colors.text.accent }]}>[USER FORCES]</Text>
            <Animated.View style={[styles.swipeIndicator, swipeIndicatorStyle]}>
              <Text style={[styles.swipeArrow, { color: colors.text.accent }]}>⟶</Text>
              <Text style={[styles.swipeText, { color: colors.text.accent }]}>ENEMY FORCES</Text>
            </Animated.View>
            <View style={[styles.battalionsContainer, isBattalionAHighlight && { zIndex: 1001, elevation: 1001 }]}>
              {renderBattalionSlots(['E', 'F'], false, true)}
              {renderBattalionSlots(['C', 'D'], false, true)}
              {renderBattalionSlots(['A', 'B'])}
              {renderCircleSlots(3)}
            </View>
          </View>

          {/* Enemy Forces Screen */}
          <View style={styles.screen}>
            <Text style={[styles.subtitleEnemy, { color: colors.error }]}>[ENEMY FORCES]</Text>
            <View style={[styles.battalionsContainer, styles.battalionsContainerEnemy]}>
              {renderCircleSlots(3, true)}
              {renderBattalionSlots(['A', 'B'], true)}
              {renderBattalionSlots(['C', 'D'], true, true)}
              {renderBattalionSlots(['E', 'F'], true, true)}
            </View>
          </View>
        </ScrollView>
      </View>

      {!isDeployPurgeHighlight && (
        <View>
          <TouchableOpacity
            style={[
              styles.executeButton,
              { 
                backgroundColor: colors.secondary + '1A',
                borderColor: colors.secondary,
                borderWidth: 1,
              },
              (!validateDeployment(assignments).isValid || isStartingBattle) && {
                opacity: 0.5,
                backgroundColor: colors.neutral + '1A',
                borderColor: colors.neutral
              }
            ]}
            onPress={handleBattleStart}
            disabled={!validateDeployment(assignments).isValid || isStartingBattle}
          >
            <Text style={[
              styles.executeText,
              { 
                color: colors.secondary,
              },
              (!validateDeployment(assignments).isValid || isStartingBattle) && {
                color: colors.neutral,
              }
            ]}>
              {isStartingBattle ? 'STARTING...' : 'DEPLOY PURGE'}
            </Text>
          </TouchableOpacity>
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
                }
              ]}
              onPress={handleBattleStart}
              disabled={false}
              activeOpacity={0.7}
            >
              <DeployPurgeHighlightBorder colors={colors} />
              <Text style={[
                styles.executeText,
                { 
                  color: colors.secondary,
                }
              ]}>
                {isStartingBattle ? 'STARTING...' : 'DEPLOY PURGE'}
              </Text>
            </TouchableOpacity>
          </View>
      )}

      <BattalionBotSelector
        isVisible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onSubmit={handleBotAssignment}
        battalionName={selectedBattalion || ''}
        availableBots={availableBots}
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
  screen: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingTop: SIZING.spacing.lg,
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
