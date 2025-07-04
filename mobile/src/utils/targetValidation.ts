import { isNeutral } from './nodeOwnership';

/**
 * Validates if a target is still valid and handles retargeting if needed
 * @param battalion - The battalion to validate for
 * @param target - The current target to validate
 * @param nodes - Array of node positions
 * @param currentPos - Current battalion position
 * @param range - Battalion's attack range
 * @param isUser - Whether this is a user battalion
 * @param userBattalions - Array of user battalions
 * @param enemyBattalions - Array of enemy battalions
 * @param findAvailableTargets - Function to find new targets
 * @param moveBattalionAlongPath - Function to move battalion to new target
 * @param cleanupBattalion - Function to cleanup battalion
 * @param battalionId - Battalion ID
 * @param attackIntervals - Attack intervals object
 * @returns Object with validation result and action taken
 */
export const validateAndRetarget = (
  battalion: any,
  target: any,
  nodes: any[],
  currentPos: { x: number; y: number },
  range: number,
  isUser: boolean,
  userBattalions: any[],
  enemyBattalions: any[],
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  battalionId: string,
  attackIntervals: any
): { 
  isValid: boolean; 
  shouldRetarget: boolean; 
  actionTaken: 'none' | 'retargeted' | 'cleaned_up';
  newTarget?: any;
} => {
  // Check if battalion is still alive
  if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
    cleanupBattalion(battalionId, attackIntervals);
    return { isValid: false, shouldRetarget: false, actionTaken: 'cleaned_up' };
  }

  // Validate target based on type
  if (target.type === 'node') {
    // Check if node is still neutral
    if (!isNeutral(target.index)) {
      battalion.targetNode = undefined;
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions, enemyBattalions);
      if (newTargets.length > 0) {
        const validTarget = newTargets.find(t => 
          t.type === 'node' ? isNeutral(t.index) : true
        );
        if (validTarget) {
          moveBattalionAlongPath(battalion, validTarget, isUser, userBattalions, enemyBattalions);
          return { isValid: false, shouldRetarget: true, actionTaken: 'retargeted', newTarget: validTarget };
        }
      }
      return { isValid: false, shouldRetarget: false, actionTaken: 'none' };
    }
  } else if (target.type === 'battalion') {
    // Check if enemy battalion still exists and is alive
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];
    
    if (!enemyBattalion || enemyBattalion.quantity <= 0 || (enemyBattalion.currentHealth ?? 0) <= 0) {
      battalion.targetNode = undefined;
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions, enemyBattalions);
      if (newTargets.length > 0) {
        moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
        return { isValid: false, shouldRetarget: true, actionTaken: 'retargeted', newTarget: newTargets[0] };
      }
      return { isValid: false, shouldRetarget: false, actionTaken: 'none' };
    }
  }

  // Target is valid
  return { isValid: true, shouldRetarget: false, actionTaken: 'none' };
};

/**
 * Checks if a battalion is in range of its target
 * @param currentPos - Current battalion position
 * @param target - Target to check range against
 * @param range - Battalion's attack range
 * @param isUser - Whether this is a user battalion
 * @param userBattalions - Array of user battalions
 * @param enemyBattalions - Array of enemy battalions
 * @returns Whether battalion is in range
 */
export const isInRange = (
  currentPos: { x: number; y: number },
  target: any,
  range: number,
  isUser: boolean,
  userBattalions: any[],
  enemyBattalions: any[]
): boolean => {
  if (target.type === 'battalion') {
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];
    
    if (!enemyBattalion) return false;
    
    const enemyPos = {
      x: (enemyBattalion.position.x as any)._value || 0,
      y: (enemyBattalion.position.y as any)._value || 0
    };
    
    const distance = Math.sqrt(
      Math.pow(enemyPos.x - currentPos.x, 2) + 
      Math.pow(enemyPos.y - currentPos.y, 2)
    );
    
    return distance <= range;
  }
  
  // For nodes, use the target's position
  const distance = Math.sqrt(
    Math.pow(target.position.x - currentPos.x, 2) + 
    Math.pow(target.position.y - currentPos.y, 2)
  );
  
  return distance <= range;
}; 