import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../../styles/theme';
import { DataStream } from './DataStream';

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
  const { lines, dataStreams } = useMemo(() => {
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

    return { lines: lineElements, dataStreams: streamElements };
  }, [nodes]);

  return (
    <Svg style={StyleSheet.absoluteFill}>
      {lines}
      {dataStreams}
    </Svg>
  );
}); 