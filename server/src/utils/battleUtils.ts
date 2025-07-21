/**
 * @file battleUtils.ts
 * @description Reusable utility functions for battle system operations
 */

// Node position mapping utility (eliminates duplicate reduce logic)
export function createNodePositionMap(nodes: Array<{ index: number; position: { x: number; y: number } }>): Record<number, { x: number; y: number }> {
  return nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<number, { x: number; y: number }>);
}

// Battalion health calculation utility (eliminates duplicate stats.health * quantity logic)
export function calculateBattalionHealth(healthPerBot: number, quantity: number): number {
  return healthPerBot * quantity;
} 