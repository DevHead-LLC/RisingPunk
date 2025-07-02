/**
 * Node Ownership Utility Functions
 * 
 * This file contains utility functions for managing node ownership using simple arrays
 * instead of the controlState property system. This provides better performance and
 * eliminates redundant checks across the codebase.
 * 
 * The system uses three arrays to track node ownership:
 * - neutralNodes: nodes that can be captured by either player
 * - userNodes: nodes controlled by the user
 * - enemyNodes: nodes controlled by the enemy
 */

import { REGRESSION_DEBUG } from '../config';

// Performance monitoring
let stateChangeCount = 0;
let lastCaptureTime = 0;

// Initial node ownership arrays
// Start with middle nodes as neutral, user gets left side, enemy gets right side
let neutralNodes: number[] = [3, 4, 5];
let userNodes: number[] = [0, 1, 2];
let enemyNodes: number[] = [6, 7, 8];

// Memoization cache for node ownership checks
const ownershipCache = new Map<number, 'neutral' | 'user' | 'enemy'>();

/**
 * Check if a node is neutral (can be captured)
 * @param nodeIndex - The index of the node to check
 * @returns true if the node is neutral, false otherwise
 */
export const isNeutral = (nodeIndex: number): boolean => {
  return neutralNodes.includes(nodeIndex);
};

/**
 * Check if a node is controlled by the user
 * @param nodeIndex - The index of the node to check
 * @returns true if the node is user-controlled, false otherwise
 */
export const isUserControlled = (nodeIndex: number): boolean => {
  return userNodes.includes(nodeIndex);
};

/**
 * Check if a node is controlled by the enemy
 * @param nodeIndex - The index of the node to check
 * @returns true if the node is enemy-controlled, false otherwise
 */
export const isEnemyControlled = (nodeIndex: number): boolean => {
  return enemyNodes.includes(nodeIndex);
};

/**
 * Optimized node ownership update function
 * @param nodeIndex - The index of the node to update
 * @param newOwner - The new owner ('user' or 'enemy')
 * @returns true if ownership changed, false if no change needed
 */
export const updateNodeOwnership = (nodeIndex: number, newOwner: 'user' | 'enemy'): boolean => {
  const startTime = Date.now();
  const currentOwner = getNodeOwner(nodeIndex);
  
  // Early return if no change needed
  if (currentOwner === newOwner) {
    return false;
  }
  
  // Clear cache for this node
  ownershipCache.delete(nodeIndex);
  
  // Remove from current arrays (optimized array operations)
  if (currentOwner === 'neutral') {
    const neutralIndex = neutralNodes.indexOf(nodeIndex);
    if (neutralIndex > -1) {
      neutralNodes.splice(neutralIndex, 1);
    }
  } else if (currentOwner === 'user') {
    const userIndex = userNodes.indexOf(nodeIndex);
    if (userIndex > -1) {
      userNodes.splice(userIndex, 1);
    }
  } else if (currentOwner === 'enemy') {
    const enemyIndex = enemyNodes.indexOf(nodeIndex);
    if (enemyIndex > -1) {
      enemyNodes.splice(enemyIndex, 1);
    }
  }
  
  // Add to new owner's array
  if (newOwner === 'user') {
    userNodes.push(nodeIndex);
  } else {
    enemyNodes.push(nodeIndex);
  }
  
  stateChangeCount++;
  
  if (REGRESSION_DEBUG) {
    const performance = Date.now() - startTime;
    console.log('Update performance:', performance, 'ms');
    console.log('State change count:', stateChangeCount);
  }
  
  return true;
};

/**
 * Capture a node and transfer ownership (with memoization)
 * @param nodeIndex - The index of the node to capture
 * @param newOwner - The new owner ('user' or 'enemy')
 */
export const captureNode = (nodeIndex: number, newOwner: 'user' | 'enemy'): void => {
  const startTime = Date.now();
  
  // Get old state before capture
  const oldState = getNodeOwner(nodeIndex);
  
  // Use optimized update function
  const changed = updateNodeOwnership(nodeIndex, newOwner);
  
  if (changed && REGRESSION_DEBUG) {
    const performance = Date.now() - startTime;
    console.log('Capture performance:', performance, 'ms');
    console.log('Node', nodeIndex, 'captured from', oldState, 'to', newOwner);
  }
  
  lastCaptureTime = Date.now();
};

/**
 * Get the current owner of a node (with memoization)
 * @param nodeIndex - The index of the node to check
 * @returns 'neutral', 'user', or 'enemy'
 */
export const getNodeOwner = (nodeIndex: number): 'neutral' | 'user' | 'enemy' => {
  // Check cache first
  if (ownershipCache.has(nodeIndex)) {
    return ownershipCache.get(nodeIndex)!;
  }
  
  let owner: 'neutral' | 'user' | 'enemy';
  if (isUserControlled(nodeIndex)) {
    owner = 'user';
  } else if (isEnemyControlled(nodeIndex)) {
    owner = 'enemy';
  } else {
    owner = 'neutral';
  }
  
  // Cache the result
  ownershipCache.set(nodeIndex, owner);
  return owner;
};

/**
 * Get all neutral nodes
 * @returns Array of neutral node indices
 */
export const getNeutralNodes = (): number[] => {
  return [...neutralNodes];
};

/**
 * Get all user-controlled nodes
 * @returns Array of user-controlled node indices
 */
export const getUserNodes = (): number[] => {
  return [...userNodes];
};

/**
 * Get all enemy-controlled nodes
 * @returns Array of enemy-controlled node indices
 */
export const getEnemyNodes = (): number[] => {
  return [...enemyNodes];
};

/**
 * Clear ownership cache (useful for testing or when arrays are modified externally)
 */
export const clearOwnershipCache = (): void => {
  ownershipCache.clear();
};

/**
 * Get performance metrics
 * @returns Performance statistics
 */
export const getPerformanceMetrics = () => {
  return {
    stateChangeCount,
    lastCaptureTime,
    cacheSize: ownershipCache.size
  };
};

/**
 * Reset node ownership to initial state
 * Used for testing and battle reset
 */
export const resetNodeOwnership = (): void => {
  neutralNodes = [3, 4, 5];
  userNodes = [0, 1, 2];
  enemyNodes = [6, 7, 8];
  ownershipCache.clear();
  stateChangeCount = 0;
  lastCaptureTime = 0;
  if (REGRESSION_DEBUG) {
    console.log('[Step 1.1] Ownership reset:', {
      neutralNodes: [...neutralNodes],
      userNodes: [...userNodes],
      enemyNodes: [...enemyNodes]
    });
  }
}; 