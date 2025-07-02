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

// Add a DEBUG flag to control logging verbosity
const DEBUG = false;

// Initial node ownership arrays
// Start with middle nodes as neutral, user gets left side, enemy gets right side
let neutralNodes: number[] = [3, 4, 5];
let userNodes: number[] = [0, 1, 2];
let enemyNodes: number[] = [6, 7, 8];

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
 * Capture a node and transfer ownership
 * @param nodeIndex - The index of the node to capture
 * @param newOwner - The new owner ('user' or 'enemy')
 */
export const captureNode = (nodeIndex: number, newOwner: 'user' | 'enemy'): void => {
  // Get old state before capture
  const oldState = getNodeOwner(nodeIndex);
  
  // Remove from current arrays
  neutralNodes = neutralNodes.filter(node => node !== nodeIndex);
  userNodes = userNodes.filter(node => node !== nodeIndex);
  enemyNodes = enemyNodes.filter(node => node !== nodeIndex);
  
  // Add to new owner's array
  if (newOwner === 'user') {
    userNodes.push(nodeIndex);
  } else {
    enemyNodes.push(nodeIndex);
  }
  

};

/**
 * Get the current owner of a node
 * @param nodeIndex - The index of the node to check
 * @returns 'neutral', 'user', or 'enemy'
 */
export const getNodeOwner = (nodeIndex: number): 'neutral' | 'user' | 'enemy' => {
  if (isUserControlled(nodeIndex)) {
    return 'user';
  } else if (isEnemyControlled(nodeIndex)) {
    return 'enemy';
  } else {
    return 'neutral';
  }
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
 * Reset node ownership to initial state
 * Used for testing and battle reset
 */
export const resetNodeOwnership = (): void => {
  neutralNodes = [3, 4, 5];
  userNodes = [0, 1, 2];
  enemyNodes = [6, 7, 8];
}; 