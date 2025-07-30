/**
 * @file testUtils.ts
 * @description Shared test utilities and data for mobile tests
 */

import { BattleState } from '../src/store/api/battleApi';

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

// Shared test nodes with realistic positions
export const createTestNodes = () => [
  { index: 0, owner: 'user', tugOfWarProgress: 100, maxCaptureThreshold: 1000, position: { x: 96, y: 155 } },
  { index: 1, owner: 'user', tugOfWarProgress: 100, maxCaptureThreshold: 1000, position: { x: 96, y: 425 } },
  { index: 2, owner: 'user', tugOfWarProgress: 100, maxCaptureThreshold: 1000, position: { x: 96, y: 695 } },
  { index: 3, owner: 'neutral', tugOfWarProgress: 0, maxCaptureThreshold: 1000, position: { x: 448, y: 155 } },
  { index: 4, owner: 'neutral', tugOfWarProgress: 0, maxCaptureThreshold: 1000, position: { x: 448, y: 425 } },
  { index: 5, owner: 'neutral', tugOfWarProgress: 0, maxCaptureThreshold: 1000, position: { x: 448, y: 695 } },
  { index: 6, owner: 'enemy', tugOfWarProgress: -100, maxCaptureThreshold: 1000, position: { x: 800, y: 155 } },
  { index: 7, owner: 'enemy', tugOfWarProgress: -100, maxCaptureThreshold: 1000, position: { x: 800, y: 425 } },
  { index: 8, owner: 'enemy', tugOfWarProgress: -100, maxCaptureThreshold: 1000, position: { x: 800, y: 695 } }
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
  isUser: boolean = true,
  type: 'guardian' | 'breacher' | 'phreak' = 'guardian'
) => ({
  id,
  type,
  quantity: 10,
  currentHealth: 1000,
  maxHealth: 1000,
  nodeIndex,
  isUser,
  mark: 1,
  stats: TEST_BOT_STATS[type]
});

// Shared battle state factory
export const createMockBattleState = (battalions: any[] = []): BattleState => ({
  battleId: 'test-battle-1',
  phase: 'battle',
  timeRemaining: 20,
  battalions: battalions.length > 0 ? battalions : [
    createTestBattalion('user-battalion-1', 0, true),
    createTestBattalion('enemy-battalion-1', 6, false)
  ],
  nodes: createTestNodes(),
  networkConnections: TEST_NETWORK_CONNECTIONS,
  lineProperties: []
});

// Helper function to check if a point lies on a line segment
export function isPointOnLineSegment(
  point: { x: number; y: number }, 
  lineStart: { x: number; y: number }, 
  lineEnd: { x: number; y: number }
): boolean {
  const tolerance = 0.001; // Small tolerance for floating point precision
  
  // Calculate distances
  const d1 = Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  const d2 = Math.sqrt((point.x - lineEnd.x) ** 2 + (point.y - lineEnd.y) ** 2);
  const lineLength = Math.sqrt((lineEnd.x - lineStart.x) ** 2 + (lineEnd.y - lineStart.y) ** 2);
  
  // Point is on line if sum of distances equals line length (within tolerance)
  return Math.abs(d1 + d2 - lineLength) < tolerance;
} 