/**
 * @file battleUtils.ts
 * @description Client-side utility functions for battle system operations
 */

// Node position mapping utility (eliminates duplicate reduce logic)
export function createNodePositionMap(nodes: Array<{ index: number; position: { x: number; y: number } }>): Record<number, { x: number; y: number }> {
  return nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<number, { x: number; y: number }>);
} 