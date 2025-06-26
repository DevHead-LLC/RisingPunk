import { useCallback } from 'react';
import { Animated } from 'react-native';

// Infinite loop detection
const loopDetection = new Map<string, { count: number, lastTime: number }>();
const checkForInfiniteLoop = (battalionId: string, action: string) => {
  const key = `${battalionId}-${action}`;
  const now = Date.now();
  const record = loopDetection.get(key);
  
  if (record && now - record.lastTime < 1000) {
    record.count++;
    if (record.count > 10) {
      console.log(`[INFINITE LOOP DETECTED] ${battalionId} - ${action} repeated ${record.count} times`);
      return true;
    }
  } else {
    loopDetection.set(key, { count: 1, lastTime: now });
  }
  return false;
};

// Position calculation
const getAnimatedPosition = (position: Animated.ValueXY) => {
  return {
    x: (position.x as any)._value || 0,
    y: (position.y as any)._value || 0
  };
};

// Cleanup protocol with enhanced validation
const cleanupBattalion = (battalionId: string, attackIntervals: { [key: string]: NodeJS.Timeout }) => {
  // Clean up all intervals related to this battalion
  Object.keys(attackIntervals).forEach(key => {
    if (key.includes(battalionId)) {
      clearInterval(attackIntervals[key]);
      delete attackIntervals[key];
    }
  });
};

export { checkForInfiniteLoop, getAnimatedPosition, cleanupBattalion }; 