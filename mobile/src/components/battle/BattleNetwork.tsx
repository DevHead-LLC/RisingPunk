/**
 * @component BattleNetwork
 * @description Renders battle network connections and handles network animations
 * 
 * @important This component manages network visualization
 * @maintainer Keep network rendering logic isolated here
 * @performance Critical for battle visualization performance
 */

import React from 'react';
import { StyleSheet, Animated } from 'react-native';
import { NetworkNode } from './NetworkNode';
import { NetworkLines } from './NetworkLines';
import { BattleNode } from '../../types/battle';
import { BattlePhase } from '../../hooks/useBattleStateMachine';
import { isNeutral, isUserControlled } from '../../utils/nodeOwnership';

// Props for the network component
type Props = {
  nodes: BattleNode[];
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

// Main component that draws the network of connected nodes and lines
export const BattleNetwork = React.memo(({ 
  nodes,
  opacity,
  width,
  height,
  onNodeControlChange,
  nodeRefs,
  phase
}: Props) => {
  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {/* Draws the connection lines between network nodes */}
      <NetworkLines 
        nodes={nodes}
        width={width}
        height={height}
      />
      {/* Creates each individual network node */}
      {nodes.map((node, index) => {
        // Only pass health and controlProgress for neutral nodes (3, 4, 5) while they are neutral
        const shouldShowHealth = isNeutral(index);
        
        return (
          <NetworkNode 
            key={index}
            ref={(el) => nodeRefs.current[index] = el}
            x={node.x}
            y={node.y}
            isActive={isUserControlled(index)}
            nodeIndex={index}
            health={shouldShowHealth ? node.health : undefined}
            controlProgress={shouldShowHealth ? node.controlProgress : 0}
            isLocked={node.isLocked}
            onControlStateChange={(newState) => onNodeControlChange(index, newState)}
          />
        );
      })}
    </Animated.View>
  );
});

// Styles for the network container - positions it at the bottom layer
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1 // Network should be at the bottom of the stack
  }
}); 