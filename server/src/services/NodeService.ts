/**
 * @file NodeService.ts
 * @description Node types and positioning authority
 */

import { NodeOwner } from '../types/battle';

export type NodeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface BattleNodeState {
  index: NodeIndex;
  position: { x: number; y: number };
  owner: NodeOwner;
}

export const calculateNodePositions = (width: number, height: number, topMargin: number = 125): BattleNodeState[] => {
  const availableHeight = height - topMargin;
  const TOP_MARGIN = availableHeight * 0.050;
  const BOTTOM_MARGIN = availableHeight * 0.15;
  const H_PADDING = 96;

  const colWidth = (width - 2 * H_PADDING) / 2;
  const X_LEFT = H_PADDING;
  const X_CENTER = H_PADDING + colWidth;
  const X_RIGHT = H_PADDING + 2 * colWidth;

  const Y_TOP = topMargin + TOP_MARGIN;
  const Y_MIDDLE = topMargin + availableHeight / 2;
  const Y_BOTTOM = topMargin + availableHeight - BOTTOM_MARGIN;

  const nodeConfigs: Array<{ index: NodeIndex; x: number; y: number; owner: NodeOwner }> = [
    { index: 0, x: X_LEFT, y: Y_TOP, owner: NodeOwner.USER },
    { index: 1, x: X_LEFT, y: Y_MIDDLE, owner: NodeOwner.USER },
    { index: 2, x: X_LEFT, y: Y_BOTTOM, owner: NodeOwner.USER },
    { index: 3, x: X_CENTER, y: Y_TOP, owner: NodeOwner.NEUTRAL },
    { index: 4, x: X_CENTER, y: Y_MIDDLE, owner: NodeOwner.NEUTRAL },
    { index: 5, x: X_CENTER, y: Y_BOTTOM, owner: NodeOwner.NEUTRAL },
    { index: 6, x: X_RIGHT, y: Y_TOP, owner: NodeOwner.ENEMY },
    { index: 7, x: X_RIGHT, y: Y_MIDDLE, owner: NodeOwner.ENEMY },
    { index: 8, x: X_RIGHT, y: Y_BOTTOM, owner: NodeOwner.ENEMY },
  ];

  return nodeConfigs.map(({ index, x, y, owner }) => ({
    index,
    position: { x, y },
    owner
  }));
};

export const createNodesWithTugOfWar = (totalArmyHealth: number, screenWidth: number, screenHeight: number) => {
  const positionedNodes = calculateNodePositions(screenWidth, screenHeight, 125);
  
  return positionedNodes.map((nodeTemplate) => ({
    index: nodeTemplate.index,
    position: nodeTemplate.position,
    owner: nodeTemplate.owner,
    tugOfWarProgress: 0,
    maxCaptureThreshold: totalArmyHealth,
  }));
}; 