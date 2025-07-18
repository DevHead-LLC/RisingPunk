/**
 * @file BattleBattalionManager.tsx
 * @description Manages and renders multiple battalions on the network
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Battalion } from '../../types/battle';
import { BattleBattalion } from './BattleBattalion';
import { BattleNodeState } from '../../hooks/useBattleNodes';

interface Props {
  battalions: Battalion[];
  nodes: BattleNodeState[];
  battalionSize?: number;
  showHealthBars?: boolean;
  showQuantities?: boolean;
  showBotTypes?: boolean;
}

export const BattleBattalionManager = React.memo(({
  battalions,
  nodes,
  battalionSize = 40,
  showHealthBars = true,
  showQuantities = true,
  showBotTypes = true,
}: Props) => {


  // Create a map of node positions for quick lookup
  const nodePositions = nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<number, { x: number; y: number }>);

  // Filter out battalions that don't have valid node positions
  const validBattalions = battalions.filter(battalion => {
    return nodePositions[battalion.nodeIndex] !== undefined;
  });



  return (
    <View style={styles.container}>
      {validBattalions.map((battalion) => {
        const nodePosition = nodePositions[battalion.nodeIndex];
        if (!nodePosition) {return null;}

        return (
          <BattleBattalion
            key={battalion.id}
            battalion={battalion}
            position={nodePosition}
            size={battalionSize}
            showHealthBar={showHealthBars}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none', // Allow touches to pass through to underlying components
  },
});
