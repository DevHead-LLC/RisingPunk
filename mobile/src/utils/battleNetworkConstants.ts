/**
 * @file battleNetworkConstants.ts
 * @description Network topology constants for the battle system
 * @maintainer Single source of truth for network connections
 */

import { NodeIndex } from '../types/battleTypes';

/**
 * Network topology defining connections between battle nodes
 *
 * User:   0 (top left), 1 (middle left), 2 (bottom left)
 * Neutral: 3 (top center), 4 (middle center), 5 (bottom center)
 * Enemy:  6 (top right), 7 (middle right), 8 (bottom right)
 */
export const BATTLE_NETWORK_CONNECTIONS: [NodeIndex, NodeIndex][] = [
  // Example: connect vertically and horizontally as needed
  [0, 1], [1, 2], // User column
  [3, 4], [4, 5], // Neutral column
  [6, 7], [7, 8], // Enemy column
  [0, 3], [3, 6], // Top row
  [1, 4], [4, 7], // Middle row
  [2, 5], [5, 8], // Bottom row
];

/**
 * Node positions in the battle grid (3 columns: left, center, right)
 * Coordinates are relative to screen center
 */
const X_LEFT = -150;
const X_CENTER = 0;
const X_RIGHT = 150;
const Y_TOP = -120;
const Y_MIDDLE = 0;
const Y_BOTTOM = 120;

export const NODE_POSITIONS: Record<NodeIndex, { x: number; y: number }> = {
  0: { x: X_LEFT, y: Y_TOP },    // User top
  1: { x: X_LEFT, y: Y_MIDDLE },// User middle
  2: { x: X_LEFT, y: Y_BOTTOM },// User bottom
  3: { x: X_CENTER, y: Y_TOP }, // Neutral top
  4: { x: X_CENTER, y: Y_MIDDLE }, // Neutral middle
  5: { x: X_CENTER, y: Y_BOTTOM }, // Neutral bottom
  6: { x: X_RIGHT, y: Y_TOP },  // Enemy top
  7: { x: X_RIGHT, y: Y_MIDDLE },// Enemy middle
  8: { x: X_RIGHT, y: Y_BOTTOM },// Enemy bottom
};

/**
 * Get all nodes connected to a given node
 * @param nodeIndex - The node to find connections for
 * @returns Array of connected node indices
 */
export const getConnectedNodes = (nodeIndex: NodeIndex): NodeIndex[] => {
  return BATTLE_NETWORK_CONNECTIONS
    .filter(([from, to]) => from === nodeIndex || to === nodeIndex)
    .map(([from, to]) => from === nodeIndex ? to : from);
};

/**
 * Check if two nodes are directly connected
 * @param nodeA - First node index
 * @param nodeB - Second node index
 * @returns True if nodes are directly connected
 */
export const areNodesConnected = (nodeA: NodeIndex, nodeB: NodeIndex): boolean => {
  return BATTLE_NETWORK_CONNECTIONS.some(
    ([from, to]) =>
      (from === nodeA && to === nodeB) ||
      (from === nodeB && to === nodeA)
  );
}; 