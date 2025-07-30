import { NodePosition } from '../types/battleTypes';

export function createNodePositionMap(nodes: Array<{ index: number; position: NodePosition }>): Record<number, NodePosition> {
  return nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<number, NodePosition>);
} 