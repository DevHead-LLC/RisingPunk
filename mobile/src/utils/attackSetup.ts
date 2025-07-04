import { isInRange } from './targetValidation';

/**
 * Checks if a battalion is in range and sets up attacks if conditions are met
 * @param battalion - The battalion to check
 * @param target - The target to attack
 * @param currentPos - Current battalion position
 * @param range - Battalion's attack range
 * @param isUser - Whether this is a user battalion
 * @param userBattalions - Array of user battalions
 * @param enemyBattalions - Array of enemy battalions
 * @param setupAttacks - Function to set up attacks
 * @param moveBattalionAlongPath - Function to move battalion
 * @param battalionId - Battalion ID
 * @param attackIntervals - Attack intervals object
 * @param cleanupBattalion - Function to cleanup battalion
 * @param nodeRefs - Node references
 * @param nodes - Array of nodes
 * @param findAvailableTargets - Function to find available targets
 * @param setUserBattalions - Function to set user battalions
 * @param setEnemyBattalions - Function to set enemy battalions
 * @returns Object indicating whether attack was set up or movement is needed
 */
export const setupAttackIfInRange = (
  battalion: any,
  target: any,
  currentPos: { x: number; y: number },
  range: number,
  isUser: boolean,
  userBattalions: any[],
  enemyBattalions: any[],
  setupAttacks: (battalion: any, target: any, isUser: boolean, battalionId: string, attackIntervals: any, cleanupBattalion: any, nodeRefs: any, nodes: any, findAvailableTargets: any, moveBattalionAlongPath: any, setUserBattalions?: any, setEnemyBattalions?: any, userBattalions?: any[], enemyBattalions?: any[]) => void,
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  battalionId: string,
  attackIntervals: any,
  cleanupBattalion: any,
  nodeRefs: any,
  nodes: any,
  findAvailableTargets: any,
  setUserBattalions?: any,
  setEnemyBattalions?: any
): { 
  attackSetUp: boolean; 
  shouldMove: boolean; 
  actionTaken: 'attack' | 'move' | 'none';
  updatedTarget?: any;
} => {
  // Check if battalion is in range
  if (isInRange(currentPos, target, range, isUser, userBattalions, enemyBattalions)) {
    // Set up attacks
    setupAttacks(
      battalion,
      target,
      isUser,
      battalionId,
      attackIntervals,
      cleanupBattalion,
      nodeRefs,
      nodes,
      findAvailableTargets,
      moveBattalionAlongPath,
      setUserBattalions,
      setEnemyBattalions,
      userBattalions,
      enemyBattalions
    );
    
    return { 
      attackSetUp: true, 
      shouldMove: false, 
      actionTaken: 'attack' 
    };
  }

  // Not in range, need to move
  if (target.type === 'battalion') {
    // For battalion targets, update target position and move
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];
    
    if (enemyBattalion) {
      const enemyPos = {
        x: (enemyBattalion.position.x as any)._value || 0,
        y: (enemyBattalion.position.y as any)._value || 0
      };
      
      const updatedTarget = { ...target, position: enemyPos };
      moveBattalionAlongPath(battalion, updatedTarget, isUser, userBattalions, enemyBattalions);
      
      return { 
        attackSetUp: false, 
        shouldMove: true, 
        actionTaken: 'move',
        updatedTarget 
      };
    }
  }

  return { 
    attackSetUp: false, 
    shouldMove: false, 
    actionTaken: 'none' 
  };
}; 