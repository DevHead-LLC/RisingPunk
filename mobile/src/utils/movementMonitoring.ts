import { isNeutral } from './nodeOwnership';

export interface MovementMonitoringConfig {
  battalionId: string;
  target: any;
  isUser: boolean;
  userBattalions?: any[];
  enemyBattalions?: any[];
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[];
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void;
  battalion: any;
}

export const createMovementMonitoring = (config: MovementMonitoringConfig): NodeJS.Timeout | null => {
  const {
    battalionId,
    target,
    isUser,
    userBattalions,
    enemyBattalions,
    findAvailableTargets,
    moveBattalionAlongPath,
    battalion
  } = config;

  if (!target || !findAvailableTargets || !moveBattalionAlongPath) {
    return null;
  }

  let checkCount = 0;
  
  const monitoringInterval = setInterval(() => {
    checkCount++;
    
    // Check if target is still valid
    let targetDefeated = false;
    
    if (target.type === 'node') {
      // Check if node is still neutral
      if (!isNeutral(target.index)) {
        targetDefeated = true;
      }
    } else if (target.type === 'battalion') {
      // Check if enemy battalion is still alive
      const enemyBatts = isUser ? enemyBattalions : userBattalions;
      const enemyBattalion = enemyBatts?.[target.index];
      if (!enemyBattalion || enemyBattalion.quantity <= 0 || (enemyBattalion.currentHealth ?? 0) <= 0) {
        targetDefeated = true;
      }
    }
    
    if (targetDefeated) {
      // Clear monitoring interval
      clearInterval(monitoringInterval);
      
      // Find new target and retarget immediately
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
      if (newTargets.length > 0) {
        moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
      }
    }
  }, 2000); // Check every 2 seconds during movement

  return monitoringInterval;
};

export const clearMovementMonitoring = (interval: NodeJS.Timeout | null): void => {
  if (interval) {
    clearInterval(interval);
  }
}; 