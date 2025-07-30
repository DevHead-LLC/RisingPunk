/**
 * @file BattleBattalion.tsx
 * @description Battalion visualization component with shapes, health bars, and bot type indicators
 */

import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MovementState } from '../../types/battleTypes';
import { ANIMATION_CONFIG } from '../../config';

interface Props {
  battalion: {
    id: string;
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    currentHealth: number;
    maxHealth: number;
    nodeIndex: number;
    isUser: boolean;
    mark: number;
    stats: {
      health: number;
      speed: number;
      range: number;
      offense: number;
      defense: number;
    };
  };
  position: { x: number; y: number };
  movementState?: MovementState; // Shared movement state interface
  size?: number;
  showHealthBar?: boolean;
}

const BOT_TYPE_LABELS: Record<string, string> = {
  phreak: 'Ph',
  breacher: 'Br',
  guardian: 'Gn',
};

export const BattleBattalion = React.memo(({
  battalion,
  position,
  movementState,
  size = 30, // Shrunk by 25%
  showHealthBar = true,
}: Props) => {
  // Animated values for smooth interpolation
  const animatedPosition = React.useRef(new Animated.ValueXY(position)).current;
  
  // Calculate smooth position using client-side interpolation
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  const [clientStartTime, setClientStartTime] = React.useState<number | null>(null);
  
  // Update current time every 16ms for smooth 60fps animation
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, ANIMATION_CONFIG.FPS_60_INTERVAL_MS); // 60fps
    
    return () => clearInterval(interval);
  }, []);
  
  // Set client start time when movement first detected or when movement state changes (fixes server/client timing sync)
  React.useEffect(() => {
    if (movementState?.movementStatus === 'moving') {
      // Reset client start time for new movements or when movement state changes
      setClientStartTime(Date.now());
    }
    // Don't reset clientStartTime when movement stops - keep it for smooth final positioning
  }, [movementState?.startTime, movementState?.movementStatus]); // React to startTime changes (new movements)
  
  // Calculate smooth interpolated position
  const calculateSmoothPosition = () => {
    if (!movementState) {
      return position; // Default to node position if no movement data
    }
    
    // If battalion has arrived, stay at the target position (attack range position)
    if (movementState.movementStatus === 'arrived') {
      return movementState.targetPosition;
    }

    // If battalion is not moving or no client start time, use current position
    if (movementState.movementStatus !== 'moving' || !clientStartTime) {
      return position; // Default to node position
    }
    
    const elapsed = currentTime - clientStartTime; // Use client start time instead of server time
    const progress = Math.min(elapsed / movementState.estimatedDuration, 1.0);
    
    // When very close to completion (>95%), ease into final position to prevent warping
    let adjustedProgress = progress;
    if (progress > 0.95) {
      // Smooth transition to final position in last 5% to prevent sudden server/client conflicts
      const finalEaseProgress = (progress - 0.95) / 0.05; // 0-1 over final 5%
      adjustedProgress = 0.95 + (0.05 * Math.min(finalEaseProgress, 1.0));
    }
    
    // Smooth interpolation between start and target
    const smoothX = movementState.startPosition.x + 
      (movementState.targetPosition.x - movementState.startPosition.x) * adjustedProgress;
    const smoothY = movementState.startPosition.y + 
      (movementState.targetPosition.y - movementState.startPosition.y) * adjustedProgress;
    
    return { x: smoothX, y: smoothY };
  };
  
  const smoothPosition = calculateSmoothPosition();
  
  // Animate to smooth position for additional easing
  React.useEffect(() => {
    Animated.timing(animatedPosition, {
      toValue: smoothPosition,
      duration: ANIMATION_CONFIG.QUICK_SYNC_DURATION_MS, // Quick sync with smooth calculation
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [smoothPosition.x, smoothPosition.y, animatedPosition]);
  
  // Get current animated position for rendering
  const [displayPosition, setDisplayPosition] = React.useState(position);
  
  React.useEffect(() => {
    const listener = animatedPosition.addListener(({ x, y }) => {
      setDisplayPosition({ x, y });
    });
    
    return () => animatedPosition.removeListener(listener);
  }, [animatedPosition]);

  // Position tracking for smooth animation

  // Health percentage
  const healthPercentage = battalion.maxHealth > 0 ? (battalion.currentHealth / battalion.maxHealth) * 100 : 0;

  // Border color by side
  const borderColor = battalion.isUser ? '#4717F6' : '#FF4141';

  // Calculate attack range radius (scale the range stat to pixels)
  const attackRangeRadius = battalion.stats.range * 8; // Scale factor: 8 pixels per range unit

  // Shape style
  const getShapeStyle = () => {
    const base = {
      width: size,
      height: size,
      left: displayPosition.x - size / 2, // Use displayPosition
      top: displayPosition.y - size / 2,  // Use displayPosition
      borderWidth: 3,
      borderColor,
      backgroundColor: 'transparent',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      position: 'absolute' as const,
    };
    switch (battalion.type) {
      case 'guardian':
        return { ...base, borderRadius: size / 2 };
      case 'breacher':
        return { ...base, borderRadius: 6 };
      case 'phreak':
        return { ...base, borderRadius: 0, transform: [{ rotate: '45deg' }] };
      default:
        return base;
    }
  };

  // Health bar color
  const getHealthBarColor = () => {
    if (healthPercentage > 60) {return '#4CAF50';}
    if (healthPercentage > 30) {return '#FF9800';}
    return '#F44336';
  };

  // Bot type label (2 chars)
  const botTypeLabel = BOT_TYPE_LABELS[battalion.type] || '';
  // For phreaks, rotate number back but NOT the background
  const quantityTextStyle = battalion.type === 'phreak' ? [styles.quantityText, { fontSize: 12 }, { transform: [{ rotate: '-45deg' }] }] : [styles.quantityText, { fontSize: 12 }];
  const botTypeLabelStyle = [styles.botTypeText, { color: borderColor, fontSize: 11 }];
  // Mark label (always Mk I for now)
  const markLabel = 'Mk I';
  const markLabelStyle = [styles.markText, { color: borderColor, fontSize: 11 }];

  // Calculate health bar and label row Y offsets to match diamond tip clearance for all shapes
  const healthBarOffset = size / 2 + 15; // 6px above the top tip
  const labelRowOffset = size / 2 + 10;  // 6px below the bottom tip

  return (
    <View style={styles.container}>
      {/* Attack Range Circle - Show when moving OR when arrived at attack position */}
      {(movementState?.movementStatus === 'moving' || movementState?.movementStatus === 'arrived') && (
        <View style={[
          styles.attackRangeCircle,
          {
            left: displayPosition.x - attackRangeRadius,
            top: displayPosition.y - attackRangeRadius,
            width: attackRangeRadius * 2,
            height: attackRangeRadius * 2,
            borderRadius: attackRangeRadius,
            borderWidth: 2,
            borderColor: borderColor,
            backgroundColor: 'transparent',
            opacity: 0.3,
          }
        ]} />
      )}
      
      {/* Shape with quantity in center */}
      <View style={getShapeStyle()}>
        <View style={styles.quantityBackground}>
          <Text style={quantityTextStyle}>{battalion.quantity}</Text>
        </View>
      </View>
      {/* Health bar, just above the shape, clears diamond tip */}
      {showHealthBar && (
        <View style={[
          styles.healthBarContainer,
          {
            left: displayPosition.x - (size + 10) / 2, // Use displayPosition
            top: displayPosition.y - healthBarOffset,  // Use displayPosition
            width: size + 10,
          },
        ]}>
          <View style={styles.healthBarBackground}>
            <View
              style={[
                styles.healthBarFill,
                {
                  width: `${healthPercentage}%`,
                  backgroundColor: getHealthBarColor(),
                },
              ]}
            />
          </View>
        </View>
      )}
      {/* Bot type and Mark label on the same line, just below the shape */}
      <View style={[
        styles.labelRow,
        {
          left: displayPosition.x - size / 2 - 2, // Use displayPosition
          top: displayPosition.y + labelRowOffset, // Use displayPosition
        },
      ]}>
        <Text style={botTypeLabelStyle}>{botTypeLabel}</Text>
        <View style={{ width: 12 }} />
        <Text style={markLabelStyle}>{markLabel}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  healthBarContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
    height: 4,
  },
  healthBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  quantityBackground: {
    backgroundColor: '#000',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  quantityText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  labelRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  botTypeText: {
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  markText: {
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  attackRangeCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    opacity: 0.3,
  },
});
