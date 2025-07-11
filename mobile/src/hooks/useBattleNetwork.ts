/**
 * @file useBattleNetwork.ts
 * @description Hook for managing battle network connections and line calculations
 */

import { useMemo } from 'react';
import { NodeIndex } from '../types/battleTypes';

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

// Pure function for network connections (for testing)
export function getNetworkConnections(): NetworkConnection[] {
  // Network topology with proper neighbor connections
  return [
    // Node 0 connections (top-left)
    { from: 0, to: 3 },
    { from: 0, to: 4 },

    // Node 1 connections (middle-left)
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },

    // Node 2 connections (bottom-left)
    { from: 2, to: 4 },
    { from: 2, to: 5 },

    // Node 6 connections (top-right)
    { from: 6, to: 3 },
    { from: 6, to: 4 },

    // Node 7 connections (middle-right)
    { from: 7, to: 3 },
    { from: 7, to: 4 },
    { from: 7, to: 5 },

    // Node 8 connections (bottom-right)
    { from: 8, to: 4 },
    { from: 8, to: 5 },
  ];
}

export function useBattleNetworkConnections(): NetworkConnection[] {
  return useMemo(() => getNetworkConnections(), []);
}

export function calculateLineProperties(
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number }
): LineProperties {
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
}
