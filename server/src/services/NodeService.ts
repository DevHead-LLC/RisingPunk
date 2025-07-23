/**
 * @file NodeService.ts
 * @description Node types and positioning authority
 */

import { NodeOwner } from '../types/battle';

// Node types (server authority)
export type NodeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface BattleNodeState {
  index: NodeIndex;
  position: { x: number; y: number };
  owner: NodeOwner;
}

// Node positioning calculations (server authority)
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

  return [
    { index: 0, position: { x: X_LEFT, y: Y_TOP }, owner: NodeOwner.USER },
    { index: 1, position: { x: X_LEFT, y: Y_MIDDLE }, owner: NodeOwner.USER },
    { index: 2, position: { x: X_LEFT, y: Y_BOTTOM }, owner: NodeOwner.USER },
    { index: 3, position: { x: X_CENTER, y: Y_TOP }, owner: NodeOwner.NEUTRAL },
    { index: 4, position: { x: X_CENTER, y: Y_MIDDLE }, owner: NodeOwner.NEUTRAL },
    { index: 5, position: { x: X_CENTER, y: Y_BOTTOM }, owner: NodeOwner.NEUTRAL },
    { index: 6, position: { x: X_RIGHT, y: Y_TOP }, owner: NodeOwner.ENEMY },
    { index: 7, position: { x: X_RIGHT, y: Y_MIDDLE }, owner: NodeOwner.ENEMY },
    { index: 8, position: { x: X_RIGHT, y: Y_BOTTOM }, owner: NodeOwner.ENEMY },
  ];
};

// Node creation with tug-of-war system (server authority)
export const createNodesWithTugOfWar = (totalArmyHealth: number, screenWidth: number, screenHeight: number) => {
  // Initialize nodes with server-calculated positions (moved from client for security)
  // Use provided screen dimensions for positioning
  const positionedNodes = calculateNodePositions(
    screenWidth, 
    screenHeight, 
    125
  );
  
  return positionedNodes.map((nodeTemplate) => {
    return {
      index: nodeTemplate.index,
      position: nodeTemplate.position, // Server-calculated position
      owner: nodeTemplate.owner === 'user' ? NodeOwner.USER : 
             nodeTemplate.owner === 'enemy' ? NodeOwner.ENEMY : NodeOwner.NEUTRAL,
      tugOfWarProgress: 0,        // USER REQUIREMENT: Start at 0
      maxCaptureThreshold: totalArmyHealth, // USER REQUIREMENT: Total army health (for damage calculation)
    };
  });
}; 