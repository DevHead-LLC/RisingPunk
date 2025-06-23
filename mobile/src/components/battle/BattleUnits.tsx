import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BattalionDeploymentZone } from './BattalionDeploymentZone';
import { AnimatedBattalion } from './AnimatedBattalion';
import { BattalionPosition } from '../../types/battle';
import { BOT_CATEGORIES } from '../../screens/DigitalBarracksScreen';

// CLARIFICATION: This component handles battalion-to-battalion attacks and animations only. Battalion-to-node attack logic is handled elsewhere.
// TODO: Ensure that attack logic for battalions and neutral nodes is set up in a consistent, proximity-based way across the battle system. If not, revisit and refactor for consistency.

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
            battalions={userBattalions.map(b => ({ type: b.type, quantity: b.quantity }))}
          />
          <BattalionDeploymentZone
            side="enemy"
            battalions={enemyBattalions.map(b => ({ type: b.type, quantity: b.quantity }))}
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
                key={`user-${index}`}
                ref={el => battalionRefs.current[`user-${battalion.type}-${index}`] = el}
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
                key={`enemy-${index}`}
                ref={el => battalionRefs.current[`enemy-${battalion.type}-${index}`] = el}
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