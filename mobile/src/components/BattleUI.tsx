/**
 * @component BattleUI
 * @description Handles battle visual elements and animations
 * 
 * @important This component centralizes battle UI rendering
 * @maintainer Keep UI logic separate from battle mechanics
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { BattleNode, BattalionPosition } from '../types/battle';
import { BattlePhase } from '../hooks/useBattleStateMachine';
import { NodeVisual } from './battle/NodeVisual';

type Props = {
  phase: BattlePhase;
  nodes: BattleNode[];
  userBattalions: BattalionPosition[];
  enemyBattalions: BattalionPosition[];
  countdown: number;
  // Animation values
  deploymentOpacity: Animated.Value;
  battalionOpacity: Animated.Value;
  networkOpacity: Animated.Value;
  countdownOpacity: Animated.Value;
  resultsOpacity: Animated.Value;
};

export const BattleUI = React.memo(({
  phase,
  nodes,
  userBattalions,
  enemyBattalions,
  countdown,
  deploymentOpacity,
  battalionOpacity,
  networkOpacity,
  countdownOpacity,
  resultsOpacity
}: Props) => {
  return (
    <View style={styles.container}>
      {/* Network Layer */}
      <Animated.View style={[styles.networkLayer, { opacity: networkOpacity }]}>
        {/* Network connections rendered here */}
      </Animated.View>

      {/* Nodes Layer */}
      <View style={styles.nodesLayer}>
        {nodes.map((node, index) => (
          <NodeVisual 
            key={index}
            node={node}
            isActive={phase === 'active'}
          />
        ))}
      </View>

      {/* Battalions Layer */}
      <Animated.View style={[styles.battalionsLayer, { opacity: battalionOpacity }]}>
        {/* Battalions rendered here */}
      </Animated.View>

      {/* Countdown Overlay */}
      {phase === 'countdown' && (
        <Animated.Text style={[styles.countdown, { opacity: countdownOpacity }]}>
          {countdown}
        </Animated.Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // IMPORTANT: Keep z-index ordering for proper layer rendering
    position: 'relative'
  },
  networkLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1
  },
  nodesLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2
  },
  battalionsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3
  },
  countdown: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    fontSize: 48,
    color: '#fff',
    zIndex: 4
  }
}); 