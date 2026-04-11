import { NodePosition } from '../types/battleTypes';

export function normalizeUserId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.$oid === 'string') return o.$oid.trim();
    if (o._id != null) return normalizeUserId(o._id);
  }
  const s = String(value);
  return s === 'undefined' || s === 'null' ? '' : s.trim();
}

export function createNodePositionMap(nodes: Array<{ index: number; position: NodePosition }>): Record<number, NodePosition> {
  return nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<number, NodePosition>);
} 