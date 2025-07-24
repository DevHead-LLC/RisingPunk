/**
 * @file networkConfig.ts
 * @description Network configuration and calculations for battle system
 */

import { NodeIndex } from '../services/NodeService';

export interface NetworkConnection {
  from: NodeIndex;
  to: NodeIndex;
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