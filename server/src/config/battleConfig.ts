// Battle configuration constants from intentions documents
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