import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { COLORS } from '../../styles/theme';

type Props = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active?: boolean;
};

// TODO: This component currently only provides a visual particle animation and does not conditionally render anything.
// TODO: The 'active' prop is not relevant at this time; all particles use the same opacity and animation. If conditional rendering or different opacity/animation is needed in the future, update logic here.
export const DataStream = React.memo(({ startX, startY, endX, endY, active = false }: Props) => {
  // TODO: If we ever want to use the 'active' flag for conditional logic (e.g., different opacity or animation for active/inactive), implement that here.
  const progress = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const flow = Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      })
    ]);

    Animated.loop(flow).start();
  }, []);

  // Calculate angle and distance for the particle movement
  const angle = Math.atan2(endY - startY, endX - startX);
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          opacity: active ? 0.8 : 0.3,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, distance * Math.cos(angle)]
              })
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, distance * Math.sin(angle)]
              })
            }
          ]
        }
      ]}
    />
  );
});

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  }
}); 