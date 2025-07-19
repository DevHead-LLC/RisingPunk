// Battle configuration constants from intentions documents

// Network types (moved from client for server authority)
export type NodeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type NodeOwner = 'user' | 'enemy' | 'neutral';

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

export const BATTLE_CONFIG = {
  // Timer durations (in seconds)
  COUNTDOWN_DURATION: 3,
  BATTLE_DURATION: 20,
  
  // Update intervals (in milliseconds)
  UPDATE_INTERVAL: 100, // Server calculates every 100ms
  SYNC_INTERVAL: 1000,  // Client receives updates every 1s
  
  // Network connections (matching client useBattleLines.ts format)
  NETWORK_CONNECTIONS: [
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
  ],

  // Node positioning calculations (moved from client for server authority)
  calculateNodePositions: (width: number, height: number, topMargin: number = 125) => {
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
  },

  // Line property calculations (moved from client for server authority)
  calculateLineProperties: (fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => {
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
  },
  
  // Bot stats (copied from BattleService.ts)
  BOT_STATS: {
    guardian: {
      role: 'Cavalry',
      stats: {
        health: 14,
        speed: 9,
        range: 4,
        offense: 8,
        defense: 6,
      },
    },
    breacher: {
      role: 'Infantry',
      stats: {
        health: 18,
        speed: 5,
        range: 5,
        offense: 7,
        defense: 8,
      },
    },
    phreak: {
      role: 'Ranged',
      stats: {
        health: 12,
        speed: 7,
        range: 9,
        offense: 6,
        defense: 5,
      },
    },
  },
  
  // Enemy bot stats (4x higher attack for testing)
  ENEMY_BOT_STATS: {
    guardian: {
      role: 'Cavalry',
      stats: {
        health: 14,
        speed: 9,
        range: 4,
        offense: 32,
        defense: 6,
      },
    },
    breacher: {
      role: 'Infantry',
      stats: {
        health: 18,
        speed: 5,
        range: 5,
        offense: 28,
        defense: 8,
      },
    },
    phreak: {
      role: 'Ranged',
      stats: {
        health: 12,
        speed: 7,
        range: 9,
        offense: 24,
        defense: 5,
      },
    },
  },
} as const; 