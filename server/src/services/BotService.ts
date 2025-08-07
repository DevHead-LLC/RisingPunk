export const BOT_CONFIG = {
  USER_BOT_STATS: {
    guardian: {
      role: 'Cavalry',
      stats: { health: 14, speed: 9, range: 4, offense: 8, defense: 6 },
    },
    breacher: {
      role: 'Infantry',
      stats: { health: 18, speed: 5, range: 5, offense: 7, defense: 8 },
    },
    phreak: {
      role: 'Ranged',
      stats: { health: 12, speed: 7, range: 9, offense: 6, defense: 5 },
    },
  },
  ENEMY_BOT_STATS: {
    guardian: {
      role: 'Cavalry',
      stats: { health: 14, speed: 9, range: 4, offense: 8, defense: 6 },
    },
    breacher: {
      role: 'Infantry',
      stats: { health: 18, speed: 5, range: 5, offense: 7, defense: 8 },
    },
    phreak: {
      role: 'Ranged',
      stats: { health: 12, speed: 7, range: 9, offense: 6, defense: 5 },
    },
  },
} as const; 