import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { BattalionSlot } from '../components/battle/BattalionSlot';
import { CircleSlot } from '../components/battle/CircleSlot';
import { BattalionBotSelector } from '../components/battle/BattalionBotSelector';
import { BattalionAssignment } from '../components/battle/BattalionSlot';
import { BotType } from '../types/bots';
import { useAppSelector } from '../store/hooks';
import { useAssignToBattalionMutation } from '../store/api/botsApi';
import { useStartBattleMutation } from '../store/api/battleApi';
import { API_URL } from '../config';

type Props = {
  onClose: () => void;
  onBattleStart: (battleId?: string) => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BattlePreparationScreen = React.memo(({ onClose, onBattleStart }: Props) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedBattalion, setSelectedBattalion] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, BattalionAssignment>>({});
  const token = useAppSelector((state) => state.auth.token);
  const botCounts = useAppSelector((state) => state.bots.botCounts);
  const [assignToBattalion] = useAssignToBattalionMutation();
  const [startBattle] = useStartBattleMutation();

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
    setSelectedBattalion(name);
    setSelectorVisible(true);
  }, []);

  const handleBotAssignment = React.useCallback(async (data: { botType: BotType; quantity: number }) => {
    if (!selectedBattalion) return;

    try {
      await assignToBattalion({
        botType: data.botType,
        quantity: data.quantity,
        battalionId: selectedBattalion,
      });

      setAssignments(prev => ({
        ...prev,
        [selectedBattalion]: {
          botType: data.botType,
          quantity: data.quantity,
          markLevel: 1,
        },
      }));
    } catch (error) {
      console.error('Failed to assign bots:', error);
    }
    setSelectorVisible(false);
  }, [selectedBattalion, assignToBattalion]);

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

  const battleStartData = React.useMemo(() => ({
    userBattalions,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    defenderNpcSlug: 'npc-small-corporation',
  }), [userBattalions]);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setAssignments({});
        const response = await fetch(`${API_URL}/api/bots`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.battalionAssignments?.length > 0) {
          await resetBattalions();
        }
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
      }
    };

    fetchAssignments();
    return () => {
      void resetBattalions();
    };
  }, [token, assignToBattalion]);

  const renderBattalionSlots = React.useCallback((names: string[], isEnemy = false, isLocked = false) => (
    <View style={styles.battalionColumn}>
      {names.map(name => (
        <BattalionSlot
          key={name}
          name={name}
          isEnemy={isEnemy}
          isLocked={isLocked}
          onPress={!isLocked ? () => handleBattalionPress(name) : undefined}
          assignment={!isEnemy && !isLocked ? assignments[name] : undefined}
        />
      ))}
    </View>
  ), [assignments, handleBattalionPress]);

  const renderCircleSlots = React.useCallback((count: number, isEnemy = false) => (
    <View style={isEnemy ? styles.circleColumnEnemy : styles.circleColumn}>
      {Array(count).fill(null).map((_, index) => (
        <CircleSlot key={index} isEnemy={isEnemy} />
      ))}
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />

      <View style={styles.fixedHeader}>
        <Text style={styles.title}>BATTLE PREPARATION</Text>
      </View>

      <View style={styles.mainContainer}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {/* User Forces Screen */}
          <View style={styles.screen}>
            <Text style={styles.subtitle}>[USER FORCES]</Text>
            <Animated.View style={[styles.swipeIndicator, swipeIndicatorStyle]}>
              <Text style={styles.swipeArrow}>⟶</Text>
              <Text style={styles.swipeText}>ENEMY FORCES</Text>
            </Animated.View>
            <View style={styles.battalionsContainer}>
              {renderBattalionSlots(['E', 'F'], false, true)}
              {renderBattalionSlots(['C', 'D'], false, true)}
              {renderBattalionSlots(['A', 'B'])}
              {renderCircleSlots(3)}
            </View>
          </View>

          {/* Enemy Forces Screen */}
          <View style={styles.screen}>
            <Text style={styles.subtitleEnemy}>[ENEMY FORCES]</Text>
            <View style={[styles.battalionsContainer, styles.battalionsContainerEnemy]}>
              {renderCircleSlots(3, true)}
              {renderBattalionSlots(['A', 'B'], true)}
              {renderBattalionSlots(['C', 'D'], true, true)}
              {renderBattalionSlots(['E', 'F'], true, true)}
            </View>
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity
        style={[
          styles.executeButton,
          !validateDeployment(assignments).isValid && styles.executeButtonDisabled
        ]}
        onPress={async () => {
          const validation = validateDeployment(assignments);
          
          if (!validation.isValid) {
            console.log('Deployment validation failed:', validation.message);
            return;
          }

          try {
            const result = await startBattle(battleStartData).unwrap();

            onBattleStart(result.battleId);
          } catch (error) {
            console.error('Failed to start battle:', error);
            onBattleStart();
          }
        }}
        disabled={!validateDeployment(assignments).isValid}
      >
        <Text style={[
          styles.executeText,
          !validateDeployment(assignments).isValid && styles.executeTextDisabled
        ]}>
          DEPLOY PURGE
        </Text>
      </TouchableOpacity>

      <BattalionBotSelector
        isVisible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onSubmit={handleBotAssignment}
        battalionName={selectedBattalion || ''}
        availableBots={botCounts}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: '#4717F6',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#00FF41',
    fontSize: 24,
    marginBottom: SIZING.spacing.sm,
    marginTop: SIZING.spacing.sm * 6,
    marginRight: SIZING.spacing.sm * 14,
  },
  subtitleEnemy: {
    color: '#FF4141',
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
    marginBottom: SIZING.spacing.sm,
    height: 50,
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#4717F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  executeButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(153, 153, 153, 0.1)',
    borderColor: '#999',
  },
  executeText: {
    color: '#4717F6',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  executeTextDisabled: {
    color: '#999',
    textShadowColor: 'transparent',
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
    color: '#00FF41',
    fontSize: 24,
  },
  swipeText: {
    color: '#00FF41',
    fontSize: 12,
    letterSpacing: 1,
  },
});
