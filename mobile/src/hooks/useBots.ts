// ============================================================================
// BOT CATEGORIES AND STATS
// ============================================================================

export type BotType = 'guardian' | 'breacher' | 'phreak';

export interface BotStats {
  health: number;
  speed: number;
  range: number;
  offense: number;
  defense: number;
}

export interface BotCategory {
  role: string;
  stats: BotStats;
  advantage: string;
}

export const BOT_CATEGORIES: Record<BotType, BotCategory> = {
  guardian: { // Cavalry
    role: 'Cavalry',
    stats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 8,
      defense: 6,
    },
    advantage: 'Strong vs. Infantry, Weak vs. Ranged',
  },
  breacher: { // Infantry
    role: 'Infantry',
    stats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 7,
      defense: 8,
    },
    advantage: 'Strong vs. Ranged, Weak vs. Cavalry',
  },
  phreak: { // Ranged
    role: 'Ranged',
    stats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 6,
      defense: 5,
    },
    advantage: 'Strong vs. Cavalry, Weak vs. Infantry',
  },
};

// TODO: Enemy bot stats are temporarily increased for quicker battle results during testing. Revisit and clean this up after battle functionality is complete.
export const ENEMY_BOT_CATEGORIES: Record<BotType, BotCategory> = {
  guardian: { // Cavalry
    role: 'Cavalry',
    stats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 32, // 4x higher attack
      defense: 6,
    },
    advantage: 'Strong vs. Infantry, Weak vs. Ranged',
  },
  breacher: { // Infantry
    role: 'Infantry',
    stats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 28, // 4x higher attack
      defense: 8,
    },
    advantage: 'Strong vs. Ranged, Weak vs. Cavalry',
  },
  phreak: { // Ranged
    role: 'Ranged',
    stats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 24, // 4x higher attack
      defense: 5,
    },
    advantage: 'Strong vs. Cavalry, Weak vs. Infantry',
  },
};

/**
 * Get bot stats based on whether it's a user or enemy battalion
 * @param botType - The type of bot (guardian, breacher, phreak)
 * @param isUser - Whether this is a user battalion (true) or enemy battalion (false)
 * @returns The bot stats for the specified type and side
 */
export const getBotStats = (botType: BotType, isUser: boolean): BotCategory | undefined => {
  if (isUser) {
    return BOT_CATEGORIES[botType];
  } else {
    return ENEMY_BOT_CATEGORIES[botType];
  }
};

/**
 * Hook to access bot information and utilities
 */
export const useBots = () => {
  return {
    // Bot categories
    BOT_CATEGORIES,
    ENEMY_BOT_CATEGORIES,

    // Utility functions
    getBotStats,

    // Helper functions
    getBotTypes: (): BotType[] => Object.keys(BOT_CATEGORIES) as BotType[],
    getBotRole: (type: BotType): string => BOT_CATEGORIES[type]?.role || 'Unknown',
    getBotAdvantage: (type: BotType): string => BOT_CATEGORIES[type]?.advantage || 'No advantage data',
    getBotStatsForType: (type: BotType): BotStats | undefined => BOT_CATEGORIES[type]?.stats,
  };
};
