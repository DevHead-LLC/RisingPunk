/**
 * @component BattalionVisual
 * @description Renders a single battalion unit with animations
 * 
 * @important This component handles battalion visualization
 * @maintainer Keep battalion rendering logic isolated here
 * @performance Critical for battle performance with multiple battalions
 */

import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BattalionPosition } from '../../types/battle';
import { COLORS } from '../../styles/theme';

type Props = {
  battalion: BattalionPosition;
  isUser: boolean;
  opacity?: number | Animated.Value;
};

export const BattalionVisual = React.memo(({ battalion, isUser, opacity = new Animated.Value(1) }: Props) => {
  // Calculate health percentage
  const maxHealth = battalion.type === 'guardian' ? 14 * battalion.quantity :
                   battalion.type === 'phreak' ? 12 * battalion.quantity :
                   18 * battalion.quantity; // breacher
  const healthPercentage = (battalion.currentHealth / maxHealth) * 100;
  
  // Determine health bar color based on percentage
  const healthColor = healthPercentage > 75 ? '#00ff00' : 
                     healthPercentage > 25 ? '#ffff00' : 
                     '#ff0000';

  // Get battalion type indicator
  const typeIndicator = battalion.type === 'breacher' ? 'B' :
                       battalion.type === 'guardian' ? 'G' :
                       'P'; // Phreak

  return (
    <Animated.View style={[
      styles.battalion,
      {
        backgroundColor: isUser ? COLORS.primary : COLORS.error,
        opacity,
        transform: [
          { translateX: battalion.position.x },
          { translateY: battalion.position.y }
        ]
      }
    ]}>
      {/* Type indicator */}
      <View style={styles.typeIndicator}>
        <Animated.Text style={styles.typeText}>
          {typeIndicator}
        </Animated.Text>
      </View>

      {/* Mark indicator */}
      <View style={styles.markIndicator}>
        <Animated.Text style={styles.typeText}>
          Mk{battalion.mark}
        </Animated.Text>
      </View>

      {/* Health bar */}
      <View style={styles.healthBarContainer}>
        <Animated.View 
          style={[
            styles.healthBar,
            {
              width: `${healthPercentage}%`,
              backgroundColor: healthColor
            }
          ]}
        />
      </View>
      
      <Animated.Text style={styles.quantity}>
        {battalion.quantity}
      </Animated.Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  battalion: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  healthBarContainer: {
    position: 'absolute',
    top: -8,
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  healthBar: {
    height: '100%',
    borderRadius: 2
  },
  typeIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 2,
    minWidth: 16,
    alignItems: 'center'
  },
  markIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 2,
    minWidth: 16,
    alignItems: 'center'
  },
  typeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold'
  }
}); 