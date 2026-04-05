/**
 * @file BattleBattalion.tsx
 * @description Battalion visualization component with shapes, health bars, and bot type indicators
 */

import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MovementState } from '../../types/battleTypes';
import { ANIMATION_CONFIG } from '../../config';
import { useThemeColors } from '../../hooks/useThemeColors';
import { battleGridAbbrevFor, effectiveMarkFromBattalionMark } from '../../utils/botInventory';

/** Above this, `startTime` is treated as Unix ms (live battle), not virtual replay ms (headless). */
const REPLAY_WALL_CLOCK_START_TIME_THRESHOLD_MS = 1_000_000_000_000;

interface Props {
  battalion: {
    id: string;
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    currentHealth: number;
    maxHealth: number;
    position: { x: number; y: number };
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
  movementState?: MovementState;
  size?: number;
  showHealthBar?: boolean;
  /** Replay: virtual battle ms (snapshot `t` + wall delta) for movement interpolation vs `startTime`. */
  replayMovementVirtualNowMs?: number;
  /**
   * Persisted replay `recordingEpochMs`: subtract from wall-clock `movementState.startTime` so elapsed matches
   * frame `t` (live capture uses Unix `Date.now()`; headless uses virtual ms — below threshold, no subtract).
   */
  replayMovementEpochMs?: number;
  /**
   * Replay: snapshot index from `useReplayPlayback`. Used to apply the same **`Animated.timing`** blend live gets
   * on each poll only when a **new snapshot** arrives; intra-snapshot motion stays **`setValue`** (~60fps) so timings don’t stack.
   */
  replaySnapshotFrameIndex?: number;
}

export const BattleBattalion = React.memo(({
  battalion,
  position,
  movementState,
  size = 30,
  showHealthBar = true,
  replayMovementVirtualNowMs,
  replayMovementEpochMs,
  replaySnapshotFrameIndex,
}: Props) => {
  const colors = useThemeColors();
  const animatedPosition = React.useRef(new Animated.ValueXY(position)).current;
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  const [clientStartTime, setClientStartTime] = React.useState<number | null>(null);
  const [displayPosition, setDisplayPosition] = React.useState(position);
  const replayMotionFrameRef = React.useRef<number>(-1);
  /** Stable for effect deps — virtual `now` updates ~60fps in replay; undefined-vs-number is enough to gate live timers. */
  const hasReplayVirtualClock = replayMovementVirtualNowMs !== undefined;

  // Bugbot: no 60fps tick in replay — smoothPosition uses replayMovementVirtualNowMs only.
  React.useEffect(() => {
    if (hasReplayVirtualClock) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, ANIMATION_CONFIG.FPS_60_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasReplayVirtualClock]);

  React.useEffect(() => {
    if (hasReplayVirtualClock) return;
    if (movementState?.movementStatus === 'moving') {
      setClientStartTime(Date.now());
    }
  }, [movementState?.startTime, movementState?.movementStatus, hasReplayVirtualClock]);

  const smoothPosition = React.useMemo(() => {
    if (!movementState) return position;
    
    if (movementState.movementStatus === 'arrived') {
      return movementState.targetPosition;
    }

    if (movementState.movementStatus !== 'moving') {
      return position;
    }

    let elapsed: number;
    if (
      replayMovementVirtualNowMs !== undefined &&
      Number.isFinite(movementState.startTime) &&
      Number.isFinite(replayMovementVirtualNowMs)
    ) {
      let moveStartMs = movementState.startTime;
      if (
        replayMovementEpochMs != null &&
        Number.isFinite(replayMovementEpochMs) &&
        moveStartMs >= REPLAY_WALL_CLOCK_START_TIME_THRESHOLD_MS
      ) {
        moveStartMs = moveStartMs - replayMovementEpochMs;
      }
      elapsed = Math.max(0, replayMovementVirtualNowMs - moveStartMs);
    } else if (clientStartTime != null) {
      elapsed = currentTime - clientStartTime;
    } else {
      return position;
    }

    const progress = Math.min(elapsed / movementState.estimatedDuration, 1.0);
    
    let adjustedProgress = progress;
    if (progress > 0.95) {
      const finalEaseProgress = (progress - 0.95) / 0.05;
      adjustedProgress = 0.95 + (0.05 * Math.min(finalEaseProgress, 1.0));
    }
    
    const smoothX = movementState.startPosition.x + 
      (movementState.targetPosition.x - movementState.startPosition.x) * adjustedProgress;
    const smoothY = movementState.startPosition.y + 
      (movementState.targetPosition.y - movementState.startPosition.y) * adjustedProgress;
    
    return { x: smoothX, y: smoothY };
  }, [movementState, position, currentTime, clientStartTime, replayMovementVirtualNowMs, replayMovementEpochMs]);

  // Live: timing every smoothPosition tick (~60fps + polls). Replay: timing only when snapshot index advances
  // (like a live poll boundary); otherwise setValue so virtual-clock lerp does not stack 32ms animations (Bugbot).
  React.useEffect(() => {
    if (!hasReplayVirtualClock) {
      Animated.timing(animatedPosition, {
        toValue: smoothPosition,
        duration: ANIMATION_CONFIG.QUICK_SYNC_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      return;
    }

    const idx = replaySnapshotFrameIndex;
    const snapshotBoundary =
      typeof idx === 'number' &&
      idx !== replayMotionFrameRef.current;

    if (snapshotBoundary) {
      replayMotionFrameRef.current = idx;
      Animated.timing(animatedPosition, {
        toValue: smoothPosition,
        duration: ANIMATION_CONFIG.QUICK_SYNC_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
      return;
    }

    animatedPosition.setValue(smoothPosition);
    setDisplayPosition(smoothPosition);
  }, [
    smoothPosition.x,
    smoothPosition.y,
    animatedPosition,
    hasReplayVirtualClock,
    replaySnapshotFrameIndex,
  ]);

  React.useEffect(() => {
    const listener = animatedPosition.addListener(({ x, y }) => {
      setDisplayPosition({ x, y });
    });
    
    return () => animatedPosition.removeListener(listener);
  }, [animatedPosition]);

  const healthPercentage = React.useMemo(() => 
    battalion.maxHealth > 0 ? (battalion.currentHealth / battalion.maxHealth) * 100 : 0
  , [battalion.currentHealth, battalion.maxHealth]);

  const borderColor = React.useMemo(() => 
    battalion.isUser ? colors.secondary : colors.error
  , [battalion.isUser, colors]);

  const attackRangeRadius = React.useMemo(() => battalion.stats.range * 8, [battalion.stats.range]);

  const botTypeLabel = React.useMemo(
    () => battleGridAbbrevFor(battalion.type, battalion.mark),
    [battalion.type, battalion.mark]
  );

  const markShortLabel = React.useMemo(() => {
    const ml = effectiveMarkFromBattalionMark(battalion.mark);
    return ml === 2 ? 'Mk II' : 'Mk I';
  }, [battalion.mark]);

  const shouldShowAttackRange = React.useMemo(() => 
    movementState?.movementStatus === 'moving' || movementState?.movementStatus === 'arrived'
  , [movementState?.movementStatus]);

  const getShapeStyle = React.useMemo(() => {
    const base = {
      width: size,
      height: size,
      left: displayPosition.x - size / 2,
      top: displayPosition.y - size / 2,
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
  }, [size, displayPosition.x, displayPosition.y, borderColor, battalion.type]);

  const getHealthBarColor = React.useMemo(() => {
    return healthPercentage > 60 ? '#4CAF50' : healthPercentage > 30 ? '#FF9800' : '#F44336';
  }, [healthPercentage]);

  const quantityTextStyle = React.useMemo(() => 
    [styles.quantityText, { fontSize: 10 }]
  , []);

  const formatQuantity = (quantity: number): string => {
    if (quantity >= 1000) {
      const kValue = quantity / 1000;
      if (kValue >= 10) {
        return `${Math.floor(kValue)}K`;
      }
      return `${kValue.toFixed(1)}K`;
    }
    return quantity.toString();
  };

  const botTypeLabelStyle = React.useMemo(() => [
    styles.botTypeText, 
    { color: borderColor, fontSize: 11 }
  ], [borderColor]);

  const markLabelStyle = React.useMemo(() => [
    styles.markText, 
    { color: borderColor, fontSize: 11 }
  ], [borderColor]);

  const healthBarOffset = React.useMemo(() => size / 2 + 15, [size]);
  const labelRowOffset = React.useMemo(() => size / 2 + 10, [size]);

  const attackRangeStyle = React.useMemo(() => [
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
  ], [displayPosition.x, displayPosition.y, attackRangeRadius, borderColor]);

  const healthBarContainerStyle = React.useMemo(() => [
    styles.healthBarContainer,
    {
      left: displayPosition.x - (size + 10) / 2,
      top: displayPosition.y - healthBarOffset,
      width: size + 10,
    },
  ], [displayPosition.x, displayPosition.y, size, healthBarOffset]);

  const healthBarFillStyle = React.useMemo(() => [
    styles.healthBarFill,
    {
      width: `${healthPercentage}%` as any,
      backgroundColor: getHealthBarColor,
    },
  ], [healthPercentage, getHealthBarColor]);

  const labelRowStyle = React.useMemo(() => [
    styles.labelRow,
    {
      left: displayPosition.x - size / 2 - 2,
      top: displayPosition.y + labelRowOffset,
    },
  ], [displayPosition.x, displayPosition.y, size, labelRowOffset]);

  return (
    <View style={styles.container}>
      {shouldShowAttackRange && (
        <View style={attackRangeStyle} />
      )}
      
      <View style={getShapeStyle}>
        <View style={[
          styles.quantityBackground, 
          { 
            backgroundColor: '#2A2A2A',
            transform: battalion.type === 'phreak' ? [{ rotate: '-45deg' }] : []
          }
        ]}>
          <Text style={[quantityTextStyle, { color: '#FFFFFF' }]}>{formatQuantity(battalion.quantity)}</Text>
        </View>
      </View>
      
      {showHealthBar && (
        <View style={healthBarContainerStyle}>
          <View style={[styles.healthBarBackground, { backgroundColor: colors.neutral }]}>
            <View
              style={healthBarFillStyle}
            />
          </View>
        </View>
      )}
      
      <View style={labelRowStyle}>
        <Text style={botTypeLabelStyle}>{botTypeLabel}</Text>
        <View style={{ width: 12 }} />
        <Text style={markLabelStyle}>{markShortLabel}</Text>
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
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  quantityBackground: {
    borderRadius: 10,
    width: 28,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  quantityText: {
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
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  markText: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
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
