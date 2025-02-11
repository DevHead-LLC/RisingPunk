import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../../styles/theme';
import { DataStream } from './DataStream';

type Props = {
  nodes: Array<{ x: number; y: number }>;
  width: number;
  height: number;
};

export const NetworkLines = React.memo(({ nodes, width, height }: Props) => {
  const connections = [
    // Horizontal connections
    [0, 3], [3, 6], // Top row
    [1, 4], [4, 7], // Middle row
    [2, 5], [5, 8], // Bottom row
    // Diagonal connections
    [0, 4], [1, 3], [1, 5], [2, 4],
    [3, 7], [4, 6], [4, 8], [5, 7]
  ];

  return (
    <Svg style={[StyleSheet.absoluteFill, { width, height }]}>
      {connections.map(([from, to], index) => (
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
      ))}
      {connections.map(([from, to], index) => (
        <DataStream
          key={`stream-${index}`}
          startX={nodes[from].x}
          startY={nodes[from].y}
          endX={nodes[to].x}
          endY={nodes[to].y}
          active={from < 3 || to < 3} // Active for user's side
        />
      ))}
    </Svg>
  );
}); 