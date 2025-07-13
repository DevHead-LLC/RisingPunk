// Battle configuration constants from intentions documents
export const BATTLE_CONFIG = {
  // Timer durations (in seconds)
  COUNTDOWN_DURATION: 3,
  BATTLE_DURATION: 20,
  
  // Update intervals (in milliseconds)
  UPDATE_INTERVAL: 100, // Server calculates every 100ms
  SYNC_INTERVAL: 1000,  // Client receives updates every 1s
  
  // Network connections (from networkConstants.ts)
  NETWORK_CONNECTIONS: {
    0: [3, 4],    // Node 0 connects to nodes 3, 4
    1: [3, 4, 5], // Node 1 connects to nodes 3, 4, 5
    2: [4, 5],    // Node 2 connects to nodes 4, 5
    3: [0, 1, 6, 7], // Node 3 connects to nodes 0, 1, 6, 7
    4: [0, 1, 2, 6, 7, 8], // Node 4 connects to nodes 0, 1, 2, 6, 7, 8
    5: [1, 2, 7, 8], // Node 5 connects to nodes 1, 2, 7, 8
    6: [3, 4],    // Node 6 connects to nodes 3, 4
    7: [3, 4, 5], // Node 7 connects to nodes 3, 4, 5
    8: [4, 5],    // Node 8 connects to nodes 4, 5
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