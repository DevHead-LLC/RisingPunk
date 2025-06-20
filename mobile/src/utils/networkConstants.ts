/**
 * @file networkConstants.ts
 * @description Centralized network topology constants for the battle system
 * 
 * @important This file contains the single source of truth for network connections
 * @maintainer Keep all network topology configuration here
 * @performance Critical for battle network structure and pathfinding
 */

/**
 * Network topology defining connections between battle nodes
 * 
 * Node layout:
 * 0 1 2
 * 3 4 5  
 * 6 7 8
 * 
 * Connections:
 * - Horizontal: [0,3], [3,6], [1,4], [4,7], [2,5], [5,8]
 * - Diagonal: [0,4], [1,3], [1,5], [2,4], [3,7], [4,6], [4,8], [5,7]
 */
export const NETWORK_CONNECTIONS: [number, number][] = [
  // Horizontal connections
  [0, 3], [3, 6], // Top row
  [1, 4], [4, 7], // Middle row
  [2, 5], [5, 8], // Bottom row
  // Diagonal connections
  [0, 4], [1, 3], [1, 5], [2, 4],
  [3, 7], [4, 6], [4, 8], [5, 7]
];

/**
 * Active connections for data streams (connections involving user-controlled nodes 0,1,2)
 */
export const ACTIVE_CONNECTIONS = new Set(
  NETWORK_CONNECTIONS
    .filter(([from, to]) => from < 3 || to < 3)
    .map((_, i) => i)
);

/**
 * Get all nodes connected to a given node
 * @param nodeIndex - The node to find connections for
 * @returns Array of connected node indices
 */
export const getConnectedNodes = (nodeIndex: number): number[] => {
  return NETWORK_CONNECTIONS
    .filter(([from, to]) => from === nodeIndex || to === nodeIndex)
    .map(([from, to]) => from === nodeIndex ? to : from);
}; 