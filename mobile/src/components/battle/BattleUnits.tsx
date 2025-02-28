import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BattalionDeploymentZone } from './BattalionDeploymentZone';
import { AnimatedBattalion } from './AnimatedBattalion';
import { BattalionPosition } from '../../types/battle';
import { BOT_CATEGORIES } from '../../screens/DigitalBarracksScreen';

type Props = {
  deploymentOpacity?: Animated.Value;
  battalionOpacity: Animated.Value;
  userBattalions: BattalionPosition[];
  enemyBattalions: BattalionPosition[];
  battalionRefs: React.MutableRefObject<{
    [key: string]: {
      triggerAttackAnimation: () => void;
      triggerDamageAnimation: () => void;
    } | null;
  }>;
  setupAttacks: (
    battalion: BattalionPosition,
    targetBattalion: BattalionPosition,
    isUser: boolean
  ) => void;
};

export const BattleUnits = React.memo(({
  deploymentOpacity,
  battalionOpacity,
  userBattalions,
  enemyBattalions,
  battalionRefs,
  setupAttacks,
}: Props) => {
  return (
    <>
      {/* Deployment zones */}
      {deploymentOpacity && (
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
      )}

      {/* Animated battalions */}
      <View style={styles.overlayContainer}>
        <Animated.View style={{ opacity: battalionOpacity }}>
          {userBattalions.filter(battalion => battalion.quantity > 0).map((battalion, index) => {
            const healthPercent = battalion.currentHealth !== undefined ? 
              (battalion.currentHealth / (BOT_CATEGORIES[battalion.type].stats.health * battalion.quantity)) * 100 : 100;
            
            return (
              <AnimatedBattalion
                key={`user-${battalion.nodeIndex}`}
                ref={el => battalionRefs.current[`user-${battalion.nodeIndex}`] = el}
                type={battalion.type}
                quantity={battalion.quantity}
                position={battalion.position}
                isUser={true}
                health={healthPercent}
                mark={battalion.mark || 1}
                onTargetBattalion={(targetBattalion) => {
                  setupAttacks(battalion, targetBattalion, true);
                }}
              />
            );
          })}
          
          {enemyBattalions.filter(battalion => battalion.quantity > 0).map((battalion, index) => {
            const healthPercent = battalion.currentHealth !== undefined ? 
              (battalion.currentHealth / (BOT_CATEGORIES[battalion.type].stats.health * battalion.quantity)) * 100 : 100;
            
            return (
              <AnimatedBattalion
                key={`enemy-${battalion.nodeIndex}`}
                ref={el => battalionRefs.current[`enemy-${battalion.nodeIndex}`] = el}
                type={battalion.type}
                quantity={battalion.quantity}
                position={battalion.position}
                isUser={false}
                health={healthPercent}
                mark={battalion.mark || 1}
                onTargetBattalion={(targetBattalion) => {
                  setupAttacks(battalion, targetBattalion, false);
                }}
              />
            );
          })}
        </Animated.View>
      </View>
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