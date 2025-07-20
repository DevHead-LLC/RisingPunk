import React, { useEffect, useRef, useState } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');



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
    // Run the animation sequence twice
    Animated.sequence([
      ...Array(2).fill(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
      // Finally set to a low, steady opacity
      Animated.timing(pulseAnim, {
        toValue: 0.3,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const swipeIndicatorStyle = {
    opacity: pulseAnim,
    transform: [{
      translateX: pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -35],
      }),
    }],
  };

  const handleBattalionPress = (name: string) => {
    setSelectedBattalion(name);
    setSelectorVisible(true);
  };

  const handleBotAssignment = async (data: { botType: BotType; quantity: number }) => {
    if (!selectedBattalion) {return;}

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
  };

  useEffect(() => {
    return () => {
      // Reset local assignments state
      setAssignments({});

      // Reset server-side assignments for both battalions sequentially
      const resetBattalions = async () => {
        try {
          // Reset battalion A first
          await assignToBattalion({
            botType: 'breacher',
            quantity: 0,
            battalionId: 'A',
          });

          // Then reset battalion B
          await assignToBattalion({
            botType: 'breacher',
            quantity: 0,
            battalionId: 'B',
          });
        } catch (error) {
          // Just log the error instead of showing it to the user
          // This is cleanup code and shouldn't block the user
          console.error('Failed to reset battalions:', error);
        }
      };

      // Use void to indicate we're intentionally not handling the promise
      void resetBattalions();
    };
  }, [assignToBattalion]);

  // Add this effect to fetch initial assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        // First reset all assignments to 0
        setAssignments({});

        // Then fetch current state
        const response = await fetch(`${API_URL}/api/bots`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();

        // If there are any existing assignments, clear them first
        if (data.battalionAssignments?.length > 0) {
          await Promise.all([
            assignToBattalion({
              botType: 'breacher',
              quantity: 0,
              battalionId: 'A',
            }),
            assignToBattalion({
              botType: 'breacher',
              quantity: 0,
              battalionId: 'B',
            }),
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch assignments:', error);
      }
    };

    fetchAssignments();
  }, [token, assignToBattalion]);

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />

      <View style={styles.fixedHeader}>
        <Text style={styles.title}>BATTLE PREPARATION</Text>
      </View>

      <View style={styles.mainContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >
          {/* User Forces Screen */}
          <View style={styles.screen}>
            <Text style={styles.subtitle}>[USER FORCES]</Text>
            <Animated.View style={[styles.swipeIndicator, swipeIndicatorStyle]}>
              <Text style={styles.swipeArrow}>⟶</Text>
              <Text style={styles.swipeText}>ENEMY FORCES</Text>
            </Animated.View>
            <View style={styles.battalionsContainer}>
              <View style={styles.battalionColumn}>
                <BattalionSlot name="E" isLocked />
                <BattalionSlot name="F" isLocked />
              </View>
              <View style={styles.battalionColumn}>
                <BattalionSlot name="C" isLocked />
                <BattalionSlot name="D" isLocked />
              </View>
              <View style={styles.battalionColumn}>
                <BattalionSlot
                  name="A"
                  onPress={() => handleBattalionPress('A')}
                  assignment={assignments.A}
                />
                <BattalionSlot
                  name="B"
                  onPress={() => handleBattalionPress('B')}
                  assignment={assignments.B}
                />
              </View>
              <View style={styles.circleColumn}>
                <CircleSlot />
                <CircleSlot />
                <CircleSlot />
              </View>
            </View>
          </View>

          {/* Enemy Forces Screen */}
          <View style={styles.screen}>
            <Text style={styles.subtitleEnemy}>[ENEMY FORCES]</Text>
            <View style={[styles.battalionsContainer, styles.battalionsContainerEnemy]}>
              <View style={styles.circleColumnEnemy}>
                <CircleSlot isEnemy />
                <CircleSlot isEnemy />
                <CircleSlot isEnemy />
              </View>
              <View style={styles.battalionColumn}>
                <BattalionSlot
                  name="A"
                  isEnemy
                />
                <BattalionSlot
                  name="B"
                  isEnemy
                />
              </View>
              <View style={styles.battalionColumn}>
                <BattalionSlot name="C" isEnemy isLocked />
                <BattalionSlot name="D" isEnemy isLocked />
              </View>
              <View style={styles.battalionColumn}>
                <BattalionSlot name="E" isEnemy isLocked />
                <BattalionSlot name="F" isEnemy isLocked />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.executeButton}
        onPress={async () => {
          try {
            // Start battle with computer opponent
            const result = await startBattle({
              userBattalions: [
                { type: 'guardian', quantity: 10, nodeIndex: 0 },
                { type: 'breacher', quantity: 8, nodeIndex: 1 },
                { type: 'phreak', quantity: 6, nodeIndex: 2 },
              ],
            }).unwrap();


            // Pass battleId to parent component
            onBattleStart(result.battleId);
          } catch (error) {
            console.error('Failed to start battle:', error);
            // Fallback to demo mode
            onBattleStart();
          }
        }}
      >
        <Text style={styles.executeText}>DEPLOY PURGE</Text>
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
  enemyForces: {
    flex: 1,
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
  executeText: {
    color: '#4717F6',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  swipeIndicator: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.xs,
    paddingRight: SIZING.spacing.lg * 5,
    marginTop: -SIZING.spacing.lg * 1.5, // Position it closer to top
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
