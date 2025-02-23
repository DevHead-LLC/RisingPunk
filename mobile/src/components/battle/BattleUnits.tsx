import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { BattalionDeploymentZone } from './BattalionDeploymentZone';
import { AnimatedBattalion } from './AnimatedBattalion';
import { BattalionPosition } from '../../types/battle';

type Props = {
  deploymentOpacity: Animated.Value;
  battalionOpacity: Animated.Value;
  userBattalions: BattalionPosition[];
  enemyBattalions: BattalionPosition[];
  battalionRefs: React.MutableRefObject<{
    [key: string]: {
      triggerAttackAnimation: () => void;
    } | null;
  }>;
};

export const BattleUnits = React.memo(({
  deploymentOpacity,
  battalionOpacity,
  userBattalions,
  enemyBattalions,
  battalionRefs,
}: Props) => {
  return (
    <>
      {/* Deployment zones */}
      <Animated.View style={[styles.overlayContainer, { opacity: deploymentOpacity }]}>
        <BattalionDeploymentZone
          side="user"
          battalions={[
            { type: 'breacher', quantity: 5 },
            { type: 'guardian', quantity: 3 },
            { type: 'phreak', quantity: 4 }
          ]}
        />
        <BattalionDeploymentZone
          side="enemy"
          battalions={[
            { type: 'breacher', quantity: 4 },
            { type: 'guardian', quantity: 4 },
            { type: 'phreak', quantity: 3 }
          ]}
        />
      </Animated.View>

      {/* Animated battalions */}
      <Animated.View style={[styles.overlayContainer, { opacity: battalionOpacity }]}>
        {userBattalions.map((battalion, index) => (
          <AnimatedBattalion
            key={`user-${index}`}
            ref={el => battalionRefs.current[`user-${battalion.nodeIndex}`] = el}
            type={battalion.type}
            quantity={battalion.quantity}
            position={battalion.position}
            isUser={true}
          />
        ))}
        
        {enemyBattalions.map((battalion, index) => (
          <AnimatedBattalion
            key={`enemy-${index}`}
            ref={el => battalionRefs.current[`enemy-${battalion.nodeIndex}`] = el}
            type={battalion.type}
            quantity={battalion.quantity}
            position={battalion.position}
            isUser={false}
          />
        ))}
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
}); 