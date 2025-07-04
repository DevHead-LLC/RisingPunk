// ============================================================================
// BATTLE CONSTANTS
// ============================================================================

/** Base duration for slowest speed (speed stat of 5) */
export const BASE_DURATION = 5000; // 5 seconds for base movement

/** Cooldown between retargeting attempts */
export const RETARGET_COOLDOWN = 1000; // 1 second cooldown

/** Duration to remember recently captured nodes */
export const CAPTURE_MEMORY_DURATION = 2000; // 2 seconds memory

/** Delay between attack animation and damage application */
export const ATTACK_DELAY = 100; // 100ms delay

/** Initial delay before first attack */
export const INITIAL_ATTACK_DELAY = 150; // 150ms delay

/** Base attack interval multiplier */
export const ATTACK_INTERVAL_BASE = 2000; // 2 seconds base

/** Range multiplier for bot categories */
export const RANGE_MULTIPLIER = 15;

/** Battalion center offset for positioning */
export const BATTALION_CENTER_OFFSET = 10;

// TODO: CLARIFY CONSTANT RELATIONSHIPS - These constants affect attack range positioning
// RANGE_MULTIPLIER = 15: Multiplies bot base range to get actual attack range in pixels
// BATTALION_CENTER_OFFSET = 10: Offset from battalion visual position to battalion center
// For proper attack positioning: battalion_center should be exactly attack_range distance from target_center
// This means: battalion_position = target_center - attack_range - battalion_center_offset
// The visual range indicator uses bot_range * 30, which is 2x the actual attack range
// This mismatch might be causing the overshooting issue you're observing

// ============================================================================
// BOT CATEGORIES
// ============================================================================

export const BOT_CATEGORIES = {
  guardian: { // Cavalry
    role: 'Cavalry',
    stats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 8,
      defense: 6
    },
    advantage: 'Strong vs. Infantry, Weak vs. Ranged'
  },
  breacher: { // Infantry
    role: 'Infantry',
    stats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 7,
      defense: 8
    },
    advantage: 'Strong vs. Ranged, Weak vs. Cavalry'
  },
  phreak: { // Ranged
    role: 'Ranged',
    stats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 6,
      defense: 5
    },
    advantage: 'Strong vs. Cavalry, Weak vs. Infantry'
  }
};

// TODO: Enemy bot stats are temporarily increased for quicker battle results during testing. Revisit and clean this up after battle functionality is complete.
export const ENEMY_BOT_CATEGORIES = {
  guardian: { // Cavalry
    role: 'Cavalry',
    stats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 32, // 4x higher attack
      defense: 6
    },
    advantage: 'Strong vs. Infantry, Weak vs. Ranged'
  },
  breacher: { // Infantry
    role: 'Infantry',
    stats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 28, // 4x higher attack
      defense: 8
    },
    advantage: 'Strong vs. Ranged, Weak vs. Cavalry'
  },
  phreak: { // Ranged
    role: 'Ranged',
    stats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 24, // 4x higher attack
      defense: 5
    },
    advantage: 'Strong vs. Cavalry, Weak vs. Infantry'
  }
};

/**
 * Get bot stats based on whether it's a user or enemy battalion
 * @param botType - The type of bot (guardian, breacher, phreak)
 * @param isUser - Whether this is a user battalion (true) or enemy battalion (false)
 * @returns The bot stats for the specified type and side
 */
export const getBotStats = (botType: string, isUser: boolean) => {
  if (isUser) {
    return BOT_CATEGORIES[botType as keyof typeof BOT_CATEGORIES];
  } else {
    return ENEMY_BOT_CATEGORIES[botType as keyof typeof ENEMY_BOT_CATEGORIES];
  }
}; 