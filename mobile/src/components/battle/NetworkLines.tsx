import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../../styles/theme';
import { DataStream } from './DataStream';
import { BattlePerformanceMonitor } from '../../battle/core/BattlePerformanceMonitor';

const NETWORK_CONNECTIONS = [
  [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8], // Horizontal
  [0, 4], [1, 3], [1, 5], [2, 4], [3, 7], [4, 6], [4, 8], [5, 7] // Diagonal
];

const ACTIVE_CONNECTIONS = new Set(NETWORK_CONNECTIONS.filter(([from, to]) => from < 3 || to < 3).map((_, i) => i));

type Props = {
  nodes: Array<{ x: number; y: number }>;
  width: number;
  height: number;
};

export const NetworkLines = React.memo(({ nodes, width, height }: Props) => {
  const performanceMonitor = BattlePerformanceMonitor.getInstance();
  const frameIdRef = useRef<number>();
  const renderStartTimeRef = useRef(0);

  const { lines, dataStreams } = useMemo(() => {
    const startTime = performance.now();
    
    const lineElements = NETWORK_CONNECTIONS.map(([from, to], index) => (
      <Line
        key={index}
        x1={nodes[from].x}
        y1={nodes[from].y}
        x2={nodes[to].x}
        y2={nodes[to].y}
        stroke={COLORS.primary}
        strokeWidth="1"
        opacity={0.3}
      />
    ));

    const streamElements = NETWORK_CONNECTIONS.map(([from, to], index) => (
      <DataStream
        key={`stream-${index}`}
        startX={nodes[from].x}
        startY={nodes[from].y}
        endX={nodes[to].x}
        endY={nodes[to].y}
        active={ACTIVE_CONNECTIONS.has(index)}
      />
    ));

    performanceMonitor.recordJSThreadUsage((performance.now() - startTime) / 16.67);
    return { lines: lineElements, dataStreams: streamElements };
  }, [nodes]);

  useEffect(() => {
    const renderTime = performance.now() - renderStartTimeRef.current;
    performanceMonitor.recordJSThreadUsage(renderTime / 16.67);
  });

  useEffect(() => {
    let frameId: number;
    const monitorFrame = () => {
      performanceMonitor.recordFrame();
      frameId = requestAnimationFrame(monitorFrame);
    };
    
    frameId = requestAnimationFrame(monitorFrame);
    frameIdRef.current = frameId;

    return () => {
      cancelAnimationFrame(frameId);
      frameIdRef.current = undefined;
    };
  }, []);

  renderStartTimeRef.current = performance.now();

  return (
    <Svg style={StyleSheet.absoluteFill}>
      {lines}
      {dataStreams}
    </Svg>
  );
}); 