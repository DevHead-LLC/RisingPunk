import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Animated } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { NetworkNode } from '../components/battle/NetworkNode';
import { NetworkLines } from '../components/battle/NetworkLines';
import { BattleHeader } from '../components/battle/BattleHeader';
import { BattalionDeploymentZone } from '../components/battle/BattalionDeploymentZone';
import { BattleResultsOverlay } from '../components/battle/BattleResultsOverlay';
import { AnimatedBattalion } from '../components/battle/AnimatedBattalion';
import { CountdownOverlay } from '../components/battle/CountdownOverlay';

import { BOT_CATEGORIES } from './DigitalBarracksScreen';
import { checkRangeIntersection } from '../utils/battleCalculator';
type Props = {
  onClose: () => void;
  onBattleComplete?: (winner: 'user' | 'enemy') => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BattalionPosition {
  type: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  nodeIndex: number;
  position: Animated.ValueXY;
}

interface BattleNode {
  x: number;
  y: number;
  controlState: 'user' | 'enemy' | 'neutral';
  health?: number;
  controlProgress?: number;
  isLocked?: boolean;
}

export const BattleScreen = React.memo(({ onClose, onBattleComplete }: Props) => {
  const networkOpacity = useRef(new Animated.Value(0)).current;
  const [timeRemaining, setTimeRemaining] = useState(20);
  const timerRef = useRef<NodeJS.Timeout>();
  const [showResults, setShowResults] = useState(false);
  const [battleWinner, setBattleWinner] = useState<'user' | 'enemy'>('user');
  const resultsOpacity = useRef(new Animated.Value(0)).current;
  const [userBattalions, setUserBattalions] = useState<BattalionPosition[]>([
    {
      type: 'breacher',
      quantity: 5,
      nodeIndex: 0,
      position: new Animated.ValueXY({ 
        x: 20,
        y: SCREEN_HEIGHT * 0.225
      })
    },
    {
      type: 'guardian',
      quantity: 3,
      nodeIndex: 1,
      position: new Animated.ValueXY({ 
        x: 20,
        y: SCREEN_HEIGHT * 0.5
      })
    },
    {
      type: 'phreak',
      quantity: 4,
      nodeIndex: 2,
      position: new Animated.ValueXY({ 
        x: 20,
        y: SCREEN_HEIGHT * 0.775
      })
    }
  ]);

  const [enemyBattalions, setEnemyBattalions] = useState<BattalionPosition[]>([
    {
      type: 'breacher',
      quantity: 4,
      nodeIndex: 6,
      position: new Animated.ValueXY({ 
        x: SCREEN_WIDTH - 165,
        y: SCREEN_HEIGHT * 0.225
      })
    },
    {
      type: 'guardian',
      quantity: 4,
      nodeIndex: 7,
      position: new Animated.ValueXY({ 
        x: SCREEN_WIDTH - 165,
        y: SCREEN_HEIGHT * 0.5
      })
    },
    {
      type: 'phreak',
      quantity: 3,
      nodeIndex: 8,
      position: new Animated.ValueXY({ 
        x: SCREEN_WIDTH - 165,
        y: SCREEN_HEIGHT * 0.775
      })
    }
  ]);

  const [battleStarted, setBattleStarted] = useState(false);
  const deploymentOpacity = useRef(new Animated.Value(1)).current;
  const battalionOpacity = useRef(new Animated.Value(0)).current;
  const [controlledNodes, setControlledNodes] = useState<number[]>([0, 1, 2]); // User starts controlling left nodes
  const [countdown, setCountdown] = useState(3);
  const countdownOpacity = useRef(new Animated.Value(1)).current;

  // Convert nodes from const to state
  const [nodes, setNodes] = useState<BattleNode[]>([
    // Left side (user) nodes
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.25, controlState: 'user' },     // 0
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.525, controlState: 'user' },    // 1
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.8, controlState: 'user' },      // 2
    
    // Middle nodes (neutral)
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.375, controlState: 'neutral' },  // 3
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.525, controlState: 'neutral' },  // 4
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.675, controlState: 'neutral' },  // 5
    
    // Right side (enemy) nodes
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.25, controlState: 'enemy' },    // 6
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.525, controlState: 'enemy' },   // 7
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.8, controlState: 'enemy' },     // 8
  ]);

  const battalionRefs = useRef<{[key: string]: { triggerAttackAnimation: () => void } | null}>({});
  const attackIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const nodeRefs = useRef<{[key: string]: {
    triggerDamageAnimation: () => void;
    applyDamage: (damage: number, isUser: boolean) => boolean;
  } | null}>({});

  useEffect(() => {
    // Show battlefield immediately
    networkOpacity.setValue(1);
    
    // Initial countdown
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 2) { // Start transition on 1
          clearInterval(countdownTimer);
          // Coordinate all animations
          Animated.parallel([
            // Fade out countdown
            Animated.timing(countdownOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            // Transition battalions
            Animated.parallel([
              Animated.timing(deploymentOpacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(battalionOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              })
            ])
          ]).start(() => {
            setBattleStarted(true);
            startBattleTimer();
          });
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, []);

  useEffect(() => {
    if (battleStarted) {
      // Base duration for slowest speed (speed stat of 5)
      const BASE_DURATION = 5000; // 3 seconds for base movement
      
      userBattalions.forEach(battalion => {
        let availableNodes: number[] = [];
        switch (battalion.nodeIndex) {
          case 0: availableNodes = [3, 4]; break;
          case 1: availableNodes = [3, 4, 5]; break;
          case 2: availableNodes = [4, 5]; break;
        }
        
        const targetNodeIndex = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        const targetNode = nodes[targetNodeIndex];
        const startNode = nodes[battalion.nodeIndex];
        const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
        
        // Calculate duration based on speed stat
        const speedStat = BOT_CATEGORIES[battalion.type].stats.speed;
        const duration = BASE_DURATION * (5 / speedStat); // 5 is the lowest speed stat
        
        const anim = Animated.timing(battalion.position, {
          toValue: { 
            x: targetNode.x - 10,
            y: targetNode.y - 10
          },
          duration: duration,
          useNativeDriver: true
        });

        const listener = battalion.position.addListener(({ x, y }) => {
          const battalionCenter = {
            x: x + 10,
            y: y + 10
          };
          
          const inRange = checkRangeIntersection(
            battalionCenter,
            { x: targetNode.x, y: targetNode.y },
            range
          );

          if (inRange) {
            anim.stop();
            battalion.position.removeListener(listener);
            
            // Clear any existing attack interval for this battalion
            if (attackIntervals.current[`user-${battalion.nodeIndex}`]) {
              clearInterval(attackIntervals.current[`user-${battalion.nodeIndex}`]);
            }

            // Start continuous attack with a small initial delay
            const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
            const attackInterval = 2000 * (5 / attackSpeed); // Base 2 seconds, scaled by speed
            
            // Trigger first attack after 150ms
            setTimeout(() => {
              battalionRefs.current[`user-${battalion.nodeIndex}`]?.triggerAttackAnimation();
              
              // Calculate damage with quantity
              const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
              const totalDamage = attackPower * battalion.quantity;
              
              // Apply damage after attack animation
              setTimeout(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  nodeRef.triggerDamageAnimation();
                  const damageApplied = nodeRef.applyDamage(totalDamage, true);
                  // If damage wasn't applied (node is captured/locked), clear the interval
                  if (!damageApplied) {
                    clearInterval(attackIntervals.current[`user-${battalion.nodeIndex}`]);
                    delete attackIntervals.current[`user-${battalion.nodeIndex}`];
                  }
                }
              }, 100);
              
              // Same for the interval
              attackIntervals.current[`user-${battalion.nodeIndex}-${targetNodeIndex}`] = setInterval(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  battalionRefs.current[`user-${battalion.nodeIndex}`]?.triggerAttackAnimation();
                  setTimeout(() => {
                    nodeRef.triggerDamageAnimation();
                    const damageApplied = nodeRef.applyDamage(totalDamage, true);
                    // If damage wasn't applied (node is captured/locked), clear the interval
                    if (!damageApplied) {
                      clearInterval(attackIntervals.current[`user-${battalion.nodeIndex}-${targetNodeIndex}`]);
                      delete attackIntervals.current[`user-${battalion.nodeIndex}-${targetNodeIndex}`];
                    }
                  }, 100);
                }
              }, attackInterval);
            }, 150);
          }
        });

        anim.start();
      });

      // Similar speed calculation for enemy battalions
      enemyBattalions.forEach(battalion => {
        let availableNodes: number[] = [];
        switch (battalion.nodeIndex) {
          case 6: availableNodes = [3, 4]; break;
          case 7: availableNodes = [3, 4, 5]; break;
          case 8: availableNodes = [4, 5]; break;
        }
        
        const targetNodeIndex = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        const targetNode = nodes[targetNodeIndex];
        const startNode = nodes[battalion.nodeIndex];
        const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
        
        const speedStat = BOT_CATEGORIES[battalion.type].stats.speed;
        const duration = BASE_DURATION * (5 / speedStat);
        
        const anim = Animated.timing(battalion.position, {
          toValue: { 
            x: targetNode.x - 10,
            y: targetNode.y - 10
          },
          duration: duration,
          useNativeDriver: true
        });

        const enemyListener = battalion.position.addListener(({ x, y }) => {
          const battalionCenter = {
            x: x + 10,
            y: y + 10
          };
          
          const inRange = checkRangeIntersection(
            battalionCenter,
            { x: targetNode.x, y: targetNode.y },
            range
          );

          if (inRange) {
            anim.stop();
            battalion.position.removeListener(enemyListener);
            
            // Clear any existing attack interval
            if (attackIntervals.current[`enemy-${battalion.nodeIndex}`]) {
              clearInterval(attackIntervals.current[`enemy-${battalion.nodeIndex}`]);
            }

            // Start continuous attack with a small initial delay
            const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
            const attackInterval = 2000 * (5 / attackSpeed);
            
            // Trigger first attack after 150ms
            setTimeout(() => {
              battalionRefs.current[`enemy-${battalion.nodeIndex}`]?.triggerAttackAnimation();
              
              // Calculate damage with quantity
              const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
              const totalDamage = attackPower * battalion.quantity;
              
              // Apply damage after attack animation
              setTimeout(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  nodeRef.triggerDamageAnimation();
                  const damageApplied = nodeRef.applyDamage(totalDamage, false);
                  // If damage wasn't applied (node is captured/locked), clear the interval
                  if (!damageApplied) {
                    clearInterval(attackIntervals.current[`enemy-${battalion.nodeIndex}`]);
                    delete attackIntervals.current[`enemy-${battalion.nodeIndex}`];
                  }
                }
              }, 100);
              
              attackIntervals.current[`enemy-${battalion.nodeIndex}-${targetNodeIndex}`] = setInterval(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  battalionRefs.current[`enemy-${battalion.nodeIndex}`]?.triggerAttackAnimation();
                  setTimeout(() => {
                    nodeRef.triggerDamageAnimation();
                    const damageApplied = nodeRef.applyDamage(totalDamage, false);
                    // If damage wasn't applied (node is captured/locked), clear the interval
                    if (!damageApplied) {
                      clearInterval(attackIntervals.current[`enemy-${battalion.nodeIndex}-${targetNodeIndex}`]);
                      delete attackIntervals.current[`enemy-${battalion.nodeIndex}-${targetNodeIndex}`];
                    }
                  }, 100);
                }
              }, attackInterval);
            }, 150);
          }
        });

        anim.start();
      });

      return () => {
        // Clear all intervals and listeners on cleanup
        Object.values(attackIntervals.current).forEach(interval => clearInterval(interval));
        attackIntervals.current = {};
        userBattalions.forEach(battalion => battalion.position.removeAllListeners());
        enemyBattalions.forEach(battalion => battalion.position.removeAllListeners());
      };
    }
  }, [battleStarted]);

  const startBattleTimer = () => {
    setTimeRemaining(20);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleBattleComplete('user');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBattleComplete = (winner: 'user' | 'enemy') => {
    setBattleWinner(winner);
    Animated.timing(resultsOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    setShowResults(true);
    onBattleComplete?.(winner);
  };

  // Movement animation function
  const moveBattalion = (battalion: BattalionPosition, targetNode: number) => {
    const targetX = nodes[targetNode].x;
    const targetY = nodes[targetNode].y;

    return Animated.timing(battalion.position, {
      toValue: { x: targetX, y: targetY },
      duration: 1000,
      useNativeDriver: true,
    });
  };

  const findAvailableNodes = (currentNodeIndex: number): number[] => {
    // Get connections from NetworkLines
    const connections = [
      // Horizontal connections
      [0, 3], [3, 6], // Top row
      [1, 4], [4, 7], // Middle row
      [2, 5], [5, 8], // Bottom row
      // Diagonal connections
      [0, 4], [1, 3], [1, 5], [2, 4],
      [3, 7], [4, 6], [4, 8], [5, 7]
    ];

    // Find all connections that include our current node
    return connections
      .filter(([from, to]) => from === currentNodeIndex || to === currentNodeIndex)
      .map(([from, to]) => from === currentNodeIndex ? to : from);
  };

  const calculateMovementDuration = (startNode: BattleNode, targetNode: BattleNode, speedStat: number) => {
    // Calculate distance between nodes
    const dx = targetNode.x - startNode.x;
    const dy = targetNode.y - startNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Base speed (pixels per millisecond) adjusted by speed stat
    const baseSpeed = 0.1; // Adjust this value to tune overall movement speed
    const speed = baseSpeed * (speedStat / 5); // Normalize by lowest speed stat
    
    // Calculate duration based on distance and speed
    return distance / speed;
  };

  // Add this function to calculate total army health
  const calculateTotalArmyHealth = () => {
    let total = 0;
    
    userBattalions.forEach(battalion => {
      total += BOT_CATEGORIES[battalion.type].stats.health * battalion.quantity;
    });
    
    enemyBattalions.forEach(battalion => {
      total += BOT_CATEGORIES[battalion.type].stats.health * battalion.quantity;
    });
    
    return Math.floor(total * 0.75); // 75% of total army health
  };

  // Modify the countdown effect to initialize node health
  useEffect(() => {
    if (countdown === 3) {
      const nodeHealth = calculateTotalArmyHealth();
      // Initialize neutral nodes with health and control progress
      setNodes(prevNodes => prevNodes.map(node => ({
        ...node,
        health: node.controlState === 'neutral' ? nodeHealth : undefined,
        controlProgress: node.controlState === 'neutral' ? 0 : undefined,
        isLocked: false
      })));
    }
  }, [countdown]);

  const handleNodeControlChange = (nodeIndex: number, newState: 'user' | 'enemy') => {
    setNodes(prevNodes => {
      const updatedNodes = [...prevNodes];
      updatedNodes[nodeIndex] = {
        ...updatedNodes[nodeIndex],
        controlState: newState,
        isLocked: true
      };
      return updatedNodes;
    });

    // Stop only battalions attacking this specific node
    Object.entries(attackIntervals.current).forEach(([battalionKey, interval]) => {
      // Extract target node from the key (format: "user-battalionIndex-targetNode" or "enemy-battalionIndex-targetNode")
      const [side, , targetNode] = battalionKey.split('-');
      if (parseInt(targetNode) === nodeIndex) {
        clearInterval(interval);
        delete attackIntervals.current[battalionKey];
      }
    });

    if (newState === 'user') {
      setControlledNodes(prev => [...prev, nodeIndex]);
    } else if (newState === 'enemy') {
      setControlledNodes(prev => prev.filter(n => n !== nodeIndex));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BattleHeader 
        timeRemaining={battleStarted ? timeRemaining : 20} 
        isCountdown={false}
      />
      
      <View style={styles.networkContainer}>
        <Animated.View style={{ opacity: networkOpacity }}>
          <NetworkLines 
            nodes={nodes}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT * 0.8}
          />
          {nodes.map((node, index) => (
            <NetworkNode 
              key={index}
              ref={(el) => nodeRefs.current[index] = el}
              x={node.x}
              y={node.y}
              isActive={controlledNodes.includes(index)}
              controlState={node.controlState}
              health={node.health}
              controlProgress={node.controlProgress}
              isLocked={node.isLocked}
              onControlStateChange={(newState) => handleNodeControlChange(index, newState)}
            />
          ))}
        </Animated.View>

        {/* Deployment zones */}
        <Animated.View style={[styles.overlayContainer, { opacity: deploymentOpacity }]}>
          <BattalionDeploymentZone
            side="user"
            battalions={[
              { type: 'breacher', quantity: 5 },
              { type: 'guardian', quantity: 3 },
              { type: 'phreak', quantity: 4 }
            ]}
          />
          <BattalionDeploymentZone
            side="enemy"
            battalions={[
              { type: 'breacher', quantity: 4 },
              { type: 'guardian', quantity: 4 },
              { type: 'phreak', quantity: 3 }
            ]}
          />
        </Animated.View>

        {/* Animated battalions */}
        <Animated.View style={[styles.overlayContainer, { opacity: battalionOpacity }]}>
          {userBattalions.map((battalion, index) => (
            <AnimatedBattalion
              key={`user-${index}`}
              ref={(el) => battalionRefs.current[`user-${index}`] = el}
              type={battalion.type}
              quantity={battalion.quantity}
              position={battalion.position}
              isUser={true}
            />
          ))}
          
          {enemyBattalions.map((battalion, index) => (
            <AnimatedBattalion
              key={`enemy-${battalion.nodeIndex}`}
              ref={(el) => battalionRefs.current[`enemy-${battalion.nodeIndex}`] = el}
              type={battalion.type}
              quantity={battalion.quantity}
              position={battalion.position}
              isUser={false}
            />
          ))}
        </Animated.View>

        {/* Countdown Overlay */}
        {countdown > 0 && (
          <CountdownOverlay 
            countdown={countdown}
            opacity={countdownOpacity}
          />
        )}
      </View>
      {showResults && (
        <BattleResultsOverlay
          winner={battleWinner}
          opacity={resultsOpacity}
          onContinue={onClose}
        />
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  networkContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});