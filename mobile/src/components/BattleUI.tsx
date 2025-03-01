/**
 * @component BattleUI
 * @description Handles battle visual elements and animations
 * 
 * @important This component centralizes battle UI rendering
 * @maintainer Keep UI logic separate from battle mechanics
 */

import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { BattleNode, BattalionPosition } from '../types/battle';
import { BattlePhase } from '../hooks/useBattleStateMachine';
import { NodeVisual } from './battle/NodeVisual';
import { BattleNetwork } from './battle/BattleNetwork';
import { BattalionVisual } from './battle/BattalionVisual';
import { RangeIndicator } from './battle/RangeIndicator';

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
  nodeRefs: React.MutableRefObject<{
    [key: string]: {
      triggerDamageAnimation: () => void;
      applyDamage: (damage: number, isUser: boolean) => boolean;
    } | null;
  }>;
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
  resultsOpacity,
  nodeRefs
}: Props) => {
  return (
    <View style={styles.container}>
      {/* Network Layer */}
      <Animated.View style={[styles.networkLayer, { opacity: networkOpacity }]}>
        <BattleNetwork 
          nodes={nodes}
          phase={phase}
          controlledNodes={nodes.reduce((acc, node, i) => 
            node.controlState !== 'neutral' ? [...acc, i] : acc, [] as number[]
          )}
          opacity={networkOpacity}
          width={Dimensions.get('window').width}
          height={Dimensions.get('window').height}
          onNodeControlChange={(nodeIndex, newState) => {
            // Handle node control changes if needed
          }}
          nodeRefs={nodeRefs}
        />
      </Animated.View>

      {/* Range Layer */}
      <View style={styles.rangeLayer}>
        {userBattalions.map((battalion, index) => (
          <RangeIndicator
            key={`user-range-${index}`}
            battalion={battalion}
            isUser={true}
            opacity={battalionOpacity}
          />
        ))}
        {enemyBattalions.map((battalion, index) => (
          <RangeIndicator
            key={`enemy-range-${index}`}
            battalion={battalion}
            isUser={false}
            opacity={battalionOpacity}
          />
        ))}
      </View>

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
        {userBattalions.map((battalion, index) => (
          <BattalionVisual
            key={`user-${index}`}
            battalion={battalion}
            isUser={true}
          />
        ))}
        {enemyBattalions.map((battalion, index) => (
          <BattalionVisual
            key={`enemy-${index}`}
            battalion={battalion}
            isUser={false}
          />
        ))}
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
  rangeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2
  },
  nodesLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3
  },
  battalionsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4
  },
  countdown: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    fontSize: 48,
    color: '#fff',
    zIndex: 5
  }
}); 