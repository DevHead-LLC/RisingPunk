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