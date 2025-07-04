/**
 * Handles path progression logic for battalion movement along multi-node paths
 * @param battalion - The battalion with path information
 * @param target - The current target node
 * @param nodes - Array of node positions
 * @param moveBattalionAlongPath - Function to move battalion to next target
 * @param isUser - Whether this is a user battalion
 * @param userBattalions - Array of user battalions
 * @param enemyBattalions - Array of enemy battalions
 * @param debugLog - Function to log debug messages
 * @param battalionId - Battalion ID for logging
 * @returns Object indicating path status and action taken
 */
export const continuePathIfNeeded = (
  battalion: { 
    remainingPath?: number[]; 
    finalTarget?: number; 
    nodeIndex: number;
  },
  target: { type: string; index: number; position: { x: number; y: number } },
  nodes: { x: number; y: number }[],
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  isUser: boolean,
  userBattalions: any[],
  enemyBattalions: any[],
  debugLog: (message: string) => void,
  battalionId: string
): { 
  pathContinued: boolean; 
  pathCompleted: boolean; 
  actionTaken: 'continue' | 'complete' | 'none';
  nextTarget?: any;
} => {
  // Check if battalion has a remaining path to follow
  if (battalion.remainingPath && battalion.remainingPath.length > 0 && battalion.finalTarget !== undefined) {
    const nextNodeIndex = battalion.remainingPath[0];
    const nextNode = nodes[nextNodeIndex];
    
    if (nextNode) {
      debugLog(`[Step 3 Path Following] ${battalionId} - Continuing path: [${battalion.remainingPath.join(' -> ')}] to final target ${battalion.finalTarget}`);
      
      // Update battalion's current node
      battalion.nodeIndex = target.index;
      
      // Remove the current node from the remaining path
      battalion.remainingPath = battalion.remainingPath.slice(1);
      
      debugLog(`[Step 3 Path Update] ${battalionId} - Updated to node ${target.index}, remaining path: [${battalion.remainingPath.join(' -> ')}]`);
      
      // Create next target
      const nextTarget = {
        type: target.type,
        index: nextNodeIndex,
        distance: 0,
        position: { x: nextNode.x, y: nextNode.y }
      };
      
      debugLog(`[Step 3 Movement] ${battalionId} - Moving to next node ${nextNodeIndex} at position (${nextNode.x.toFixed(1)}, ${nextNode.y.toFixed(1)})`);
      
      // Move to next node
      moveBattalionAlongPath(battalion, nextTarget, isUser, userBattalions, enemyBattalions);
      
      return { 
        pathContinued: true, 
        pathCompleted: false, 
        actionTaken: 'continue',
        nextTarget 
      };
    }
  }
  
  // Check if we've reached the final target
  if (battalion.finalTarget !== undefined && target.index === battalion.finalTarget) {
    // Clear path state when final target is reached
    battalion.remainingPath = undefined;
    battalion.finalTarget = undefined;
    
    return { 
      pathContinued: false, 
      pathCompleted: true, 
      actionTaken: 'complete' 
    };
  }
  
  return { 
    pathContinued: false, 
    pathCompleted: false, 
    actionTaken: 'none' 
  };
}; 