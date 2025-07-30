/**
 * @file testUtils.ts
 * @description Shared test utilities and data for server tests
 */

import { IBattalion, INode, NodeOwner, BotType } from '../src/types/battle';
import { NodePosition } from '../../mobile/src/types/battleTypes';

// Shared network configuration (matches server/src/config/networkConfig.ts)
export const TEST_NETWORK_CONNECTIONS = [
  { from: 0, to: 3 }, { from: 0, to: 4 },
  { from: 1, to: 3 }, { from: 1, to: 4 }, { from: 1, to: 5 },
  { from: 2, to: 4 }, { from: 2, to: 5 },
  { from: 6, to: 3 }, { from: 6, to: 4 },
  { from: 7, to: 3 }, { from: 7, to: 4 }, { from: 7, to: 5 },
  { from: 8, to: 4 }, { from: 8, to: 5 }
];

// Test screen dimensions (typical mobile screen)
export const TEST_SCREEN_DIMENSIONS = {
  width: 800,
  height: 600
};

// Shared node positions calculated using actual NodeService logic
// These match the positions that would be calculated by calculateNodePositions(800, 600, 125)
export const TEST_NODE_POSITIONS: NodePosition[] = [
  { x: 96, y: 155 },  // Node 0 (user home) - X_LEFT, Y_TOP
  { x: 96, y: 425 },  // Node 1 (user home) - X_LEFT, Y_MIDDLE  
  { x: 96, y: 695 },  // Node 2 (user home) - X_LEFT, Y_BOTTOM
  { x: 448, y: 155 }, // Node 3 (neutral) - X_CENTER, Y_TOP
  { x: 448, y: 425 }, // Node 4 (neutral) - X_CENTER, Y_MIDDLE
  { x: 448, y: 695 }, // Node 5 (neutral) - X_CENTER, Y_BOTTOM
  { x: 800, y: 155 }, // Node 6 (enemy home) - X_RIGHT, Y_TOP
  { x: 800, y: 425 }, // Node 7 (enemy home) - X_RIGHT, Y_MIDDLE
  { x: 800, y: 695 }  // Node 8 (enemy home) - X_RIGHT, Y_BOTTOM
];

// Shared test nodes
export const createTestNodes = (): INode[] => [
  { index: 0, owner: NodeOwner.USER, tugOfWarProgress: 100, maxCaptureThreshold: 1000, position: { x: 100, y: 100 } },
  { index: 1, owner: NodeOwner.USER, tugOfWarProgress: 100, maxCaptureThreshold: 1000, position: { x: 100, y: 300 } },
  { index: 2, owner: NodeOwner.USER, tugOfWarProgress: 100, maxCaptureThreshold: 1000, position: { x: 100, y: 500 } },
  { index: 3, owner: NodeOwner.NEUTRAL, tugOfWarProgress: 0, maxCaptureThreshold: 1000, position: { x: 400, y: 100 } },
  { index: 4, owner: NodeOwner.NEUTRAL, tugOfWarProgress: 0, maxCaptureThreshold: 1000, position: { x: 400, y: 300 } },
  { index: 5, owner: NodeOwner.NEUTRAL, tugOfWarProgress: 0, maxCaptureThreshold: 1000, position: { x: 400, y: 500 } },
  { index: 6, owner: NodeOwner.ENEMY, tugOfWarProgress: -100, maxCaptureThreshold: 1000, position: { x: 700, y: 100 } },
  { index: 7, owner: NodeOwner.ENEMY, tugOfWarProgress: -100, maxCaptureThreshold: 1000, position: { x: 700, y: 300 } },
  { index: 8, owner: NodeOwner.ENEMY, tugOfWarProgress: -100, maxCaptureThreshold: 1000, position: { x: 700, y: 500 } }
];

// Bot stats from BotService (single source of truth)
export const TEST_BOT_STATS = {
  guardian: { health: 14, speed: 9, range: 4, offense: 8, defense: 6 },
  breacher: { health: 18, speed: 5, range: 5, offense: 7, defense: 8 },
  phreak: { health: 12, speed: 7, range: 9, offense: 6, defense: 5 }
};

// Shared test battalion factory
export const createTestBattalion = (
  id: string,
  nodeIndex: number,
  owner: NodeOwner = NodeOwner.USER,
  type: BotType = BotType.GUARDIAN
): IBattalion => ({
  id,
  type,
  quantity: 10,
  currentHealth: 1000,
  maxHealth: 1000,
  baseHealthPerUnit: 100,
  isDestroyed: false,
  position: { 
    x: TEST_NODE_POSITIONS[nodeIndex].x, 
    y: TEST_NODE_POSITIONS[nodeIndex].y, 
    nodeIndex 
  },
  owner,
  mark: 1,
  stats: TEST_BOT_STATS[type]
});

// Helper function to check if a point lies on a line segment
export function isPointOnLineSegment(
  point: NodePosition, 
  lineStart: NodePosition, 
  lineEnd: NodePosition
): boolean {
  const tolerance = 0.001; // Small tolerance for floating point precision
  
  // Calculate distances
  const d1 = Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  const d2 = Math.sqrt((point.x - lineEnd.x) ** 2 + (point.y - lineEnd.y) ** 2);
  const lineLength = Math.sqrt((lineEnd.x - lineStart.x) ** 2 + (lineEnd.y - lineStart.y) ** 2);
  
  // Point is on line if sum of distances equals line length (within tolerance)
  return Math.abs(d1 + d2 - lineLength) < tolerance;
} 