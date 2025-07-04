import { Animated } from 'react-native';
import { BOT_CATEGORIES } from './battleConstants';
import { calculateMovementDuration } from '../utils/battleUtils';
import { createMovementMonitoring, clearMovementMonitoring } from '../utils/movementMonitoring';

/**
 * Executes battalion movement with cleanup and monitoring
 * @param battalion - The battalion to move
 * @param rangePosition - Target position to move to
 * @param moveDistance - Distance to move
 * @param battalionId - Battalion ID
 * @param attackIntervals - Attack intervals object
 * @param cleanupBattalion - Function to cleanup battalion
 * @param onMovementComplete - Callback when movement completes
 * @param target - Optional target for monitoring
 * @param isUser - Whether this is a user battalion
 * @param userBattalions - Array of user battalions
 * @param enemyBattalions - Array of enemy battalions
 * @param findAvailableTargets - Function to find available targets
 * @param moveBattalionAlongPath - Function to move battalion along path
 * @returns Promise that resolves when movement completes
 */
export const executeMovementWithCleanup = (
  battalion: { position: any; type: string; quantity: number; currentHealth?: number },
  rangePosition: { x: number; y: number },
  moveDistance: number,
  battalionId: string,
  attackIntervals: any,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  onMovementComplete: () => void,
  target?: any,
  isUser?: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[],
  findAvailableTargets?: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath?: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Clean up existing attack intervals
    cleanupBattalion(battalionId, attackIntervals);

    // Calculate movement duration based on speed and distance
    const speed = BOT_CATEGORIES?.[battalion.type]?.stats?.speed || 5;
    const baseDuration = calculateMovementDuration(speed);
    const movementDuration = (moveDistance / 100) * baseDuration;
    
    // Set up periodic target monitoring during movement
    let monitoringInterval: NodeJS.Timeout | null = null;
    
    // Set up periodic target monitoring during movement
    if (target && findAvailableTargets && moveBattalionAlongPath) {
      monitoringInterval = createMovementMonitoring({
        battalionId,
        target,
        isUser: isUser!,
        userBattalions,
        enemyBattalions,
        findAvailableTargets,
        moveBattalionAlongPath,
        battalion
      });
    }
    
    // Execute the movement animation
    Animated.timing(battalion.position, {
      toValue: rangePosition,
      duration: movementDuration,
      useNativeDriver: true
    }).start(({ finished }) => {
      // Clear monitoring interval when movement completes
      clearMovementMonitoring(monitoringInterval);
      
      // Only reject if movement was explicitly cancelled, not just if it didn't finish
      // Many movements might not "finish" due to normal game events
      // No logging needed - this is normal battle behavior
      
      // Check if battalion is still alive
      if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
        cleanupBattalion(battalionId, attackIntervals);
        // Don't log or warn - battalion death during movement is expected
        reject(new Error('Battalion died during movement'));
        return;
      }
      
      // Call completion callback and resolve promise
      onMovementComplete();
      resolve();
    });
  });
}; 