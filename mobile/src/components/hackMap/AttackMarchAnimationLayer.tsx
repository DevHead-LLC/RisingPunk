/**
 * Global attack-march overlay on HackMap: interpolates position from server timestamps
 * (probe-style dashed leg + icon). Geometry must stay aligned with HackMapScreen.
 *
 * Mount as a **sibling above** `GestureDetector` with the same `animatedMapStyle` as the map `Animated.View`
 * so icon taps are not consumed by `Gesture.Tap` → tile handler (parity with `ProbeAnimationLayer`).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, AppState, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AttackMarchListItem } from '../../store/api/attackApi';
import type { useThemeColors } from '../../hooks/useThemeColors';
import { computeMarchFrame } from './attackMarchMapFrame';

/** Reanimated typing mismatch with RN types (same pattern as HackMapScreen probe layer). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Reanimated View vs RN JSX types
const ReanimatedView = Animated.View as any;

const MARCH_ICON_SIZE = 72;

type ThemeColors = ReturnType<typeof useThemeColors>;

const MarchIconTapTarget: React.FC<{
  marchId: string;
  onPress: (marchId: string) => void;
  hitLeft: number;
  hitTop: number;
  hitSize: number;
  children: React.ReactNode;
}> = ({ marchId, onPress, hitLeft, hitTop, hitSize, children }) => (
  <View
    pointerEvents="box-none"
    style={{
      position: 'absolute',
      left: hitLeft,
      top: hitTop,
      width: hitSize,
      height: hitSize,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <Pressable
      style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
      onPress={() => onPress(marchId)}
    >
      {children}
    </Pressable>
  </View>
);

export type AttackMarchAnimationLayerProps = {
  marches: AttackMarchListItem[];
  colors: ThemeColors;
  /** Same Reanimated style as the map surface — required when the layer is a sibling outside `GestureDetector`. */
  animatedMapStyle?: Record<string, unknown>;
  currentUserId?: string | null;
  /** Owner’s **outbound** or **returning** march (modal: cancel vs “returning home”). */
  onOwnerMarchPress?: (marchId: string) => void;
};

export const AttackMarchAnimationLayer: React.FC<AttackMarchAnimationLayerProps> = ({
  marches,
  colors,
  animatedMapStyle,
  currentUserId,
  onOwnerMarchPress,
}) => {
  const marchesRef = useRef(marches);
  const nowRef = useRef(Date.now());
  /** Bumps version to re-render; throttled below so we do not reconcile at 60fps (Bugbot). */
  const [, setPaintGeneration] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastPaintWallMsRef = useRef(0);

  useEffect(() => {
    marchesRef.current = marches;
  }, [marches]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const runLoop = useCallback(() => {
    const tick = () => {
      const list = marchesRef.current;
      if (list.length === 0) {
        stopLoop();
        return;
      }
      const now = Date.now();
      nowRef.current = now;
      const lastPaint = lastPaintWallMsRef.current;
      if (lastPaint === 0 || now - lastPaint >= 32) {
        lastPaintWallMsRef.current = now;
        setPaintGeneration((n) => n + 1);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    stopLoop();
    lastPaintWallMsRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop]);

  useEffect(() => {
    if (marches.length === 0) {
      stopLoop();
      return;
    }
    runLoop();
    return () => stopLoop();
  }, [marches, runLoop, stopLoop]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (marchesRef.current.length === 0) return;
      runLoop();
    });
    return () => sub?.remove();
  }, [runLoop]);

  if (marches.length === 0) {
    return null;
  }

  const now = nowRef.current;
  const matrixColor = colors.matrix ?? '#00ff00';

  return (
    <ReanimatedView
      style={[
        StyleSheet.absoluteFill,
        ...(animatedMapStyle != null ? [animatedMapStyle as any] : []),
        { zIndex: 9, elevation: 9 },
      ]}
      pointerEvents="box-none"
    >
      {marches.map((m) => {
        const frame = computeMarchFrame(m, now);
        if (!frame) return null;
        const { px, py, seg, lineOpacity, iconOpacity } = frame;
        const dx = seg.ex - seg.sx;
        const dy = seg.ey - seg.sy;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy, dx);
        const midX = (seg.sx + seg.ex) / 2;
        const midY = (seg.sy + seg.ey) / 2;
        const left = px - MARCH_ICON_SIZE / 2;
        const top = py - MARCH_ICON_SIZE / 2;
        const isOwnerTappable =
          onOwnerMarchPress != null &&
          currentUserId != null &&
          String(m.attackerId) === String(currentUserId) &&
          (m.state === 'outbound' || m.state === 'returning');

        const iconInner = (
          <Image
            source={require('../../assets/images/hackMap/botArmyMarch.png')}
            style={{ width: MARCH_ICON_SIZE, height: MARCH_ICON_SIZE }}
            resizeMode="contain"
          />
        );

        return (
          <View
            key={m.marchId}
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, { left: 0, top: 0, right: 0, bottom: 0 }]}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                // Bugbot: RN rotates around the view center — anchor at segment midpoint so the dashed line
                // matches (sx,sy)→(ex,ey); translateX(-L/2)+rotate+translateX(L/2) at top-left (sx,sy) is wrong.
                left: midX - length / 2,
                top: midY - 0.5,
                width: length,
                height: 1,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: matrixColor,
                borderRadius: 0.5,
                opacity: lineOpacity,
                transform: [{ rotate: `${angle}rad` }],
              }}
            />
            {isOwnerTappable ? (
              <MarchIconTapTarget
                marchId={m.marchId}
                onPress={onOwnerMarchPress!}
                hitLeft={left}
                hitTop={top}
                hitSize={MARCH_ICON_SIZE}
              >
                <View style={{ opacity: iconOpacity }}>{iconInner}</View>
              </MarchIconTapTarget>
            ) : (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: MARCH_ICON_SIZE,
                  height: MARCH_ICON_SIZE,
                  opacity: iconOpacity,
                }}
              >
                {iconInner}
              </View>
            )}
          </View>
        );
      })}
    </ReanimatedView>
  );
};
