/**
 * @file battleUtils.ts
 * @description Reusable utility functions for battle system operations
 */

import { NodePosition } from '../../../mobile/src/types/battleTypes';

// Node position mapping utility (eliminates duplicate reduce logic)
export function createNodePositionMap(nodes: Array<{ index: number; position: NodePosition }>): Record<number, NodePosition> {
  return nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<number, NodePosition>);
}

// Battalion health calculation utility (eliminates duplicate stats.health * quantity logic)
export function calculateBattalionHealth(healthPerBot: number, quantity: number): number {
  return healthPerBot * quantity;
} 