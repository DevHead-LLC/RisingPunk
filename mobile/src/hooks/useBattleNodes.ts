/**
 * @file useBattleNodes.ts
 * @description Single source of truth for battle node state, positions, and rendering
 */

import { useMemo } from 'react';
import { NodeIndex } from '../types/battleTypes';

export type NodeOwner = 'user' | 'enemy' | 'neutral';

export interface BattleNodeState {
  index: NodeIndex;
  position: { x: number; y: number };
  owner: NodeOwner;
}

interface GetInitialNodesParams {
  width: number;
  height: number;
}

export function useInitialBattleNodes({ width, height }: GetInitialNodesParams) {
  // Padding for safe area
  const H_PADDING = 64;
  const V_PADDING = 40;

  return useMemo(() => {
    const colWidth = (width - 2 * H_PADDING) / 2;
    const rowHeight = (height - 2 * V_PADDING) / 2;

    const X_LEFT = H_PADDING;
    const X_CENTER = H_PADDING + colWidth;
    const X_RIGHT = H_PADDING + 2 * colWidth;
    const Y_TOP = V_PADDING;
    const Y_MIDDLE = V_PADDING + rowHeight;
    const Y_BOTTOM = V_PADDING + 2 * rowHeight;

    const initialNodes: BattleNodeState[] = [
      { index: 0, position: { x: X_LEFT, y: Y_TOP }, owner: 'user' },
      { index: 1, position: { x: X_LEFT, y: Y_MIDDLE }, owner: 'user' },
      { index: 2, position: { x: X_LEFT, y: Y_BOTTOM }, owner: 'user' },
      { index: 3, position: { x: X_CENTER, y: Y_TOP }, owner: 'neutral' },
      { index: 4, position: { x: X_CENTER, y: Y_MIDDLE }, owner: 'neutral' },
      { index: 5, position: { x: X_CENTER, y: Y_BOTTOM }, owner: 'neutral' },
      { index: 6, position: { x: X_RIGHT, y: Y_TOP }, owner: 'enemy' },
      { index: 7, position: { x: X_RIGHT, y: Y_MIDDLE }, owner: 'enemy' },
      { index: 8, position: { x: X_RIGHT, y: Y_BOTTOM }, owner: 'enemy' },
    ];
    return initialNodes;
  }, [width, height]);
}

// Node rendering utilities
export function getNodeColor(owner: NodeOwner): string {
  switch (owner) {
    case 'user':
      return '#4717F6'; // User blue
    case 'enemy':
      return '#FF4141'; // Enemy red
    default:
      return '#666666'; // Neutral gray
  }
}

export function getNodeBorderColor(owner: NodeOwner): string {
  switch (owner) {
    case 'user':
      return '#7C3AED'; // Lighter blue border
    case 'enemy':
      return '#EF4444'; // Lighter red border
    default:
      return '#9CA3AF'; // Light gray border
  }
} 