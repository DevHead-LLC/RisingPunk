/**
 * @component BattleNetwork
 * @description Renders battle network connections and handles network animations
 * 
 * @important This component manages network visualization
 * @maintainer Keep network rendering logic isolated here
 * @performance Critical for battle visualization performance
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { BattleNode } from '../../types/battle';
import { BattlePhase } from '../../hooks/useBattleStateMachine';
import { COLORS } from '../../styles/theme';

// IMPORTANT: Keep network topology configuration here
// DO NOT DELETE - Critical for battle network structure
const NETWORK_CONNECTIONS = [
  [0, 3], [3, 6], // Top row
  [1, 4], [4, 7], // Middle row
  [2, 5], [5, 8], // Bottom row
  [0, 4], [1, 3], [1, 5], [2, 4],
  [3, 7], [4, 6], [4, 8], [5, 7]
];

type Props = {
  nodes: BattleNode[];
  phase: BattlePhase;
};

export const BattleNetwork = React.memo(({ nodes, phase }: Props) => {
  /**
   * @function getLineColor
   * @description Determines line color based on connected nodes' control states
   * @important DO NOT DELETE - Critical for network visualization
   */
  const getLineColor = (fromNode: BattleNode, toNode: BattleNode) => {
    if (fromNode.controlState === toNode.controlState) {
      return fromNode.controlState === 'user' ? COLORS.primary :
             fromNode.controlState === 'enemy' ? COLORS.error :
             COLORS.neutral;
    }
    return COLORS.neutral;
  };

  // Memoize network lines to prevent unnecessary recalculations
  const networkLines = useMemo(() => 
    NETWORK_CONNECTIONS.map(([fromIdx, toIdx], index) => {
      const fromNode = nodes[fromIdx];
      const toNode = nodes[toIdx];
      
      return (
        <Line
          key={`line-${index}`}
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke={getLineColor(fromNode, toNode)}
          strokeWidth={2}
          opacity={['deployment', 'initializing', 'countdown'].includes(phase) ? 0.3 : 1}
        />
      );
    }), [nodes, phase]);

  return (
    <View style={styles.container}>
      <Svg style={StyleSheet.absoluteFill}>
        {networkLines}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1
  }
}); 