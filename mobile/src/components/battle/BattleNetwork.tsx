/**
 * @component BattleNetwork
 * @description Renders battle network connections and handles network animations
 * 
 * @important This component manages network visualization
 * @maintainer Keep network rendering logic isolated here
 * @performance Critical for battle visualization performance
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { NetworkNode } from './NetworkNode';
import { NetworkLines } from './NetworkLines';
import { BattleNode } from '../../types/battle';
import { BattlePhase } from '../../hooks/useBattleStateMachine';
import { COLORS } from '../../styles/theme';
import { NETWORK_CONNECTIONS } from '../../utils/networkConstants';

type Props = {
  nodes: BattleNode[];
  controlledNodes: number[];
  opacity: Animated.Value;
  width: number;
  height: number;
  onNodeControlChange: (nodeIndex: number, newState: 'user' | 'enemy') => void;
  nodeRefs: React.MutableRefObject<{
    [key: string]: {
      triggerDamageAnimation: () => void;
      applyDamage: (damage: number, isUser: boolean) => boolean;
    } | null;
  }>;
  phase: BattlePhase;
};

export const BattleNetwork = React.memo(({ 
  nodes,
  controlledNodes,
  opacity,
  width,
  height,
  onNodeControlChange,
  nodeRefs,
  phase
}: Props) => {
  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <NetworkLines 
        nodes={nodes}
        width={width}
        height={height}
      />
      {nodes.map((node, index) => (
        <NetworkNode 
          key={index}
          ref={(el) => nodeRefs.current[index] = el}
          x={node.x}
          y={node.y}
          isActive={controlledNodes.includes(index)}
          controlState={node.controlState}
          health={node.health}
          controlProgress={node.controlProgress}
          isLocked={node.isLocked}
          onControlStateChange={(newState) => onNodeControlChange(index, newState)}
        />
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1 // Network should be at the bottom of the stack
  }
}); 