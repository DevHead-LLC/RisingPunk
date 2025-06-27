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

// ============================================================================
// TARGET VALIDATION LOGIC
// ============================================================================

/**
 * Validate if a battalion can move and if the target is valid
 */
const validateBattalionAndTarget = (
  battalion: { quantity: number; currentHealth?: number; targetNode?: number },
  target: { type: string; index: number; position?: { x: number; y: number } },
  nodes: { controlState: string }[],
  currentPos: { x: number; y: number },
  range: number,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  battalionId: string,
  attackIntervals: any
): { isValid: boolean; shouldRetarget: boolean; distance: number; inRange: boolean } => {
  // Check if battalion is destroyed
  if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
    cleanupBattalion(battalionId, attackIntervals);
    return { isValid: false, shouldRetarget: false, distance: 0, inRange: false };
  }

  // Validate node target before proceeding
  if (target.type === 'node') {
    const node = nodes[target.index];
    // Only retarget if node is not neutral (captured)
    if (node.controlState !== 'neutral') {
      battalion.targetNode = undefined;
      return { isValid: false, shouldRetarget: true, distance: 0, inRange: false };
    }
  }

  if (!target || !target.position) {
    return { isValid: false, shouldRetarget: false, distance: 0, inRange: false };
  }
  
  // Check target validity before any movement or path calculation
  if (target.type === 'node') {
    const targetNode = nodes[target.index];
    if (targetNode.controlState !== 'neutral') {
      return { isValid: false, shouldRetarget: false, distance: 0, inRange: false };
    }
  }
  
  // Check if battalion is already in attack range before any movement calculations
  const dx = target.position.x - currentPos.x;
  const dy = target.position.y - currentPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const inRange = distance <= range;
  
  // If in range, battalion is valid for attacking but not for moving
  if (inRange) {
    return { isValid: true, shouldRetarget: false, distance, inRange: true };
  }

  return { isValid: true, shouldRetarget: false, distance, inRange: false };
};

export { validateBattalionAndTarget }; 