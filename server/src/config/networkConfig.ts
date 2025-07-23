/**
 * @file networkConfig.ts
 * @description Network configuration and calculations for battle system
 */

import { NodeOwner } from '../types/battle';

// Network types (server authority)
export type NodeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface NetworkConnection {
  from: NodeIndex;
  to: NodeIndex;
}

export interface BattleNodeState {
  index: NodeIndex;
  position: { x: number; y: number };
  owner: NodeOwner;
}

export interface LineProperties {
  length: number;
  angle: number;
  left: number;
  top: number;
}

// Network connections (matching client useBattleLines.ts format)
export const NETWORK_CONNECTIONS: NetworkConnection[] = [
  // Node 0 connections (top-left user territory)
  { from: 0, to: 3 }, // Connects to top-center neutral
  { from: 0, to: 4 }, // Connects to middle-center neutral

  // Node 1 connections (middle-left user territory)  
  { from: 1, to: 3 }, // Connects to top-center neutral
  { from: 1, to: 4 }, // Connects to middle-center neutral
  { from: 1, to: 5 }, // Connects to bottom-center neutral

  // Node 2 connections (bottom-left user territory)
  { from: 2, to: 4 }, // Connects to middle-center neutral
  { from: 2, to: 5 }, // Connects to bottom-center neutral

  // Node 6 connections (top-right enemy territory)
  { from: 6, to: 3 }, // Connects to top-center neutral
  { from: 6, to: 4 }, // Connects to middle-center neutral

  // Node 7 connections (middle-right enemy territory)
  { from: 7, to: 3 }, // Connects to top-center neutral
  { from: 7, to: 4 }, // Connects to middle-center neutral
  { from: 7, to: 5 }, // Connects to bottom-center neutral

  // Node 8 connections (bottom-right enemy territory)
  { from: 8, to: 4 }, // Connects to middle-center neutral
  { from: 8, to: 5 }, // Connects to bottom-center neutral
];

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

// Line property calculations (server authority)
export const calculateLineProperties = (fromPos: { x: number; y: number }, toPos: { x: number; y: number }): LineProperties => {
  const deltaX = toPos.x - fromPos.x;
  const deltaY = toPos.y - fromPos.y;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  return {
    length,
    angle,
    left: fromPos.x,
    top: fromPos.y,
  };
}; 