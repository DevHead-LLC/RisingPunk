import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { marchTileCenter, parseMarchTimeMs } from './attackMarchMapFrame';
import type { TransferRunListItem } from '../../store/api/transferRunApi';

const TRANSFER_ICON_SIZE = 64;
const TRANSFER_ICON = require('../../assets/images/hackMap/sharing/gifting.png');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Reanimated typing mismatch with RN types.
const ReanimatedView = Animated.View as any;

function computeTransferFrame(run: TransferRunListItem, nowMs: number): { x: number; y: number } | null {
  if (run.state !== 'outbound') {
    return null;
  }
  const departMs = parseMarchTimeMs(run.departAt);
  const arriveMs = parseMarchTimeMs(run.arriveAt);
  if (departMs == null || arriveMs == null || arriveMs <= departMs) {
    return null;
  }
  const progress = Math.min(1, Math.max(0, (nowMs - departMs) / (arriveMs - departMs)));
  const start = marchTileCenter(run.originX, run.originY);
  const end = marchTileCenter(run.targetX, run.targetY);
  return {
    x: start.cx + (end.cx - start.cx) * progress,
    y: start.cy + (end.cy - start.cy) * progress,
  };
}

type Props = {
  runs: TransferRunListItem[];
  animatedMapStyle?: Record<string, unknown>;
};

export const TransferRunAnimationLayer: React.FC<Props> = ({ runs, animatedMapStyle }) => {
  const runsRef = useRef(runs);
  const nowRef = useRef(Date.now());
  const [, setPaintGeneration] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastPaintWallMsRef = useRef(0);

  useEffect(() => {
    runsRef.current = runs;
  }, [runs]);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const runLoop = useCallback(() => {
    const tick = () => {
      const list = runsRef.current;
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
    if (runs.length === 0) {
      stopLoop();
      return;
    }
    runLoop();
    return () => stopLoop();
  }, [runs, runLoop, stopLoop]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (runsRef.current.length === 0) return;
      runLoop();
    });
    return () => sub?.remove();
  }, [runLoop]);

  if (runs.length === 0) {
    return null;
  }

  const nowMs = nowRef.current;

  return (
    <ReanimatedView
      style={[
        StyleSheet.absoluteFill,
        ...(animatedMapStyle != null ? [animatedMapStyle as any] : []),
        { zIndex: 10, elevation: 10 },
      ]}
      pointerEvents="none"
    >
      {runs.map((run) => {
        const frame = computeTransferFrame(run, nowMs);
        if (!frame) return null;
        const start = marchTileCenter(run.originX, run.originY);
        const end = marchTileCenter(run.targetX, run.targetY);
        const dx = end.cx - start.cx;
        const dy = end.cy - start.cy;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        const angle = Math.atan2(dy, dx);
        const midX = (start.cx + end.cx) / 2;
        const midY = (start.cy + end.cy) / 2;
        return (
          <View
            key={run.transferRunId}
            style={{
              ...StyleSheet.absoluteFillObject,
            }}
            pointerEvents="none"
          >
            <View
              style={{
                position: 'absolute',
                left: midX - length / 2,
                top: midY - 0.5,
                width: length,
                height: 1,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#00FF41',
                borderRadius: 0.5,
                opacity: 0.72,
                transform: [{ rotate: `${angle}rad` }],
              }}
            />
            <View
              style={{
              position: 'absolute',
              left: frame.x - TRANSFER_ICON_SIZE / 2,
              top: frame.y - TRANSFER_ICON_SIZE / 2,
              width: TRANSFER_ICON_SIZE,
              height: TRANSFER_ICON_SIZE,
            }}
          >
            <Image source={TRANSFER_ICON} style={{ width: TRANSFER_ICON_SIZE, height: TRANSFER_ICON_SIZE }} resizeMode="contain" />
          </View>
          </View>
        );
      })}
    </ReanimatedView>
  );
};

