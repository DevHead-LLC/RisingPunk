import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Animated } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../../styles/theme';
import { DataStream } from './DataStream';
import { BattlePerformanceMonitor } from '../../battle/core/BattlePerformanceMonitor';

const AnimatedLine = Animated.createAnimatedComponent(Line);

type Props = {
  nodes: Array<{ x: number; y: number }>;
  width: number;
  height: number;
};

// Pre-define connections array for performance
const NETWORK_CONNECTIONS = [
  // Horizontal connections
  [0, 3], [3, 6], // Top row
  [1, 4], [4, 7], // Middle row
  [2, 5], [5, 8], // Bottom row
  // Diagonal connections
  [0, 4], [1, 3], [1, 5], [2, 4],
  [3, 7], [4, 6], [4, 8], [5, 7]
];

export const NetworkLines = React.memo(({ nodes, width, height }: Props) => {
  const performanceMonitor = useMemo(() => BattlePerformanceMonitor.getInstance(), []);
  
  // Shared animation values for smooth transitions
  const lineOpacity = useMemo(() => new Animated.Value(0.3), []);
  const dataStreamScale = useMemo(() => new Animated.Value(1), []);

  // Memoize line components for performance
  const lines = useMemo(() => {
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

    const renderTime = performance.now() - startTime;
    performanceMonitor.recordJSThreadUsage(renderTime / 16.67);
    
    return lineElements;
  }, [nodes, performanceMonitor]);

  // Memoize data streams for performance
  const dataStreams = useMemo(() => {
    const startTime = performance.now();
    
    const streamElements = NETWORK_CONNECTIONS.map(([from, to], index) => (
      <Animated.View key={`stream-${index}`} style={{ transform: [{ scale: dataStreamScale }] }}>
        <DataStream
          startX={nodes[from].x}
          startY={nodes[from].y}
          endX={nodes[to].x}
          endY={nodes[to].y}
          active={from < 3 || to < 3} // Active for user's side
        />
      </Animated.View>
    ));

    const renderTime = performance.now() - startTime;
    performanceMonitor.recordJSThreadUsage(renderTime / 16.67);
    
    return streamElements;
  }, [nodes, performanceMonitor, dataStreamScale]);

  // Handle smooth transitions
  useEffect(() => {
    const animation = Animated.parallel([
      Animated.sequence([
        Animated.timing(lineOpacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(lineOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true
        })
      ]),
      Animated.sequence([
        Animated.spring(dataStreamScale, {
          toValue: 1.1,
          useNativeDriver: true
        }),
        Animated.spring(dataStreamScale, {
          toValue: 1,
          useNativeDriver: true
        })
      ])
    ]);

    animation.start();

    return () => {
      animation.stop();
      lineOpacity.setValue(0.3);
      dataStreamScale.setValue(1);
    };
  }, [lineOpacity, dataStreamScale]);

  // Record frame for performance monitoring
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      performanceMonitor.recordFrame();
    });
    return () => cancelAnimationFrame(frameId);
  });

  return (
    <Svg style={[StyleSheet.absoluteFill, { width, height }]}>
      {lines}
      {dataStreams}
    </Svg>
  );
}); 