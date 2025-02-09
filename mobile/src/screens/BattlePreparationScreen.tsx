import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { BattalionSlot } from '../components/battle/BattalionSlot';
import { CircleSlot } from '../components/battle/CircleSlot';
import { BattalionBotSelector } from '../components/battle/BattalionBotSelector';
import { BattalionAssignment } from '../components/battle/BattalionSlot';
import { BotType } from '../types/bots';
import { useBots } from '../context/BotsContext';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Props = {
  onClose: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BattalionDeployment = {
  [battalion: string]: {
    [botType in BotType]?: number;
  };
};

export const BattlePreparationScreen = React.memo(({ onClose }: Props) => {
  const { botCounts, assignToBattalion, getAvailableBots } = useBots();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedBattalion, setSelectedBattalion] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, BattalionAssignment>>({});
  const { token } = useAuth();
  
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
        outputRange: [0, -10]
      })
    }]
  };

  const handleBattalionPress = (name: string) => {
    setSelectedBattalion(name);
    setSelectorVisible(true);
  };

  const handleBotAssignment = async (data: { botType: BotType; quantity: number }) => {
    if (!selectedBattalion) return;

    try {
      await assignToBattalion({
        botType: data.botType,
        quantity: data.quantity,
        battalionId: selectedBattalion
      });

      setAssignments(prev => ({
        ...prev,
        [selectedBattalion]: {
          botType: data.botType,
          quantity: data.quantity,
          markLevel: 1
        }
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
            battalionId: 'A'
          });
          
          // Then reset battalion B
          await assignToBattalion({
            botType: 'breacher',
            quantity: 0,
            battalionId: 'B'
          });
        } catch (error) {
          console.error('Failed to reset battalions:', error);
        }
      };
      
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
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        // If there are any existing assignments, clear them first
        if (data.battalionAssignments?.length > 0) {
          await Promise.all([
            assignToBattalion({
              botType: 'breacher',
              quantity: 0,
              battalionId: 'A'
            }),
            assignToBattalion({
              botType: 'breacher',
              quantity: 0,
              battalionId: 'B'
            })
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

      <ScrollView 
        horizontal 
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
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
                assignment={assignments['A']}
              />
              <BattalionSlot 
                name="B" 
                onPress={() => handleBattalionPress('B')}
                assignment={assignments['B']}
              />
            </View>
            <View style={styles.circleColumn}>
              <CircleSlot />
              <CircleSlot />
              <CircleSlot />
            </View>
          </View>
        </View>
        <View style={styles.screen}>
          <Text style={styles.subtitleEnemy}>[ENEMY FORCES]</Text>
          <View style={styles.battalionsContainer}>
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

      <TouchableOpacity 
        style={styles.executeButton}
        onPress={() => console.log('Execute battle')}
      >
        <Text style={styles.executeText}>EXECUTE BATTLE SEQUENCE</Text>
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
  scrollView: {
    flex: 1,
    marginTop: 40,
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
    textAlign: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  subtitleEnemy: {
    color: '#FF4141',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  battalionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
    gap: SIZING.spacing.lg,
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
    paddingRight: SIZING.spacing.lg,
    marginTop: -SIZING.spacing.lg, // Position it closer to top
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