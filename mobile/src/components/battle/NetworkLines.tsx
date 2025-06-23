import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../../styles/theme';
import { DataStream } from './DataStream';
import { NETWORK_CONNECTIONS, ACTIVE_CONNECTIONS } from '../../utils/networkConstants';

type Props = {
  nodes: Array<{ x: number; y: number }>;
  width: number;
  height: number;
};

export const NetworkLines = React.memo(({ nodes, width, height }: Props) => {
  // Node positions should always remain the same height, width, and (x, y) coordinate locations throughout the battle.
  // Only the appearance (color/ownership) should change, not the positions.
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