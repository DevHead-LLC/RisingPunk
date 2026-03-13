/**
 * Race Condition Heist — level config, packet/exploit types, tier params, Guardian (Cavalry) rewards.
 * Same tier/level structure as Packet Breach: 21 tiers, 5 levels per tier (1.1–21.5). See taskItems/mini-games/race-condition-heist.md.
 */

export type LevelId = string; // e.g. "1.1", "6.1"

export interface LevelParams {
  levelId: LevelId;
  tier: number;
  /** Match duration in ms. Tier 1 starts at 3 min (180000). */
  matchDurationMs: number;
  /** Words shown one at a time; last word is a "secure" word (Lock, Encrypt, Secure, Shield, etc.). Tap when the word before it is shown. Tiers 1–3: 3-word cycle; tier 4: 4-word cycle. */
  wordRotation: string[];
  /** Duration in ms each word is displayed before rotating to the next. */
  wordDurationMs: number;
  /** Packet count for this tier (1–13). Matches getPacketCountForTier; used for display/docs. Session packet list is built by route generators. */
  maxPackets: number;
  /** Score required to complete level (claim). */
  scoreThreshold: number;
}

/**
 * Word array rule: indices 0..length-1. Index length-1 = secure word. Index length-2 = exploit word
 * (player taps when this word is displayed to capture). Cells 0 and length-3 are just sequence.
 * Start offset random so the cycle can begin on any cell, keeping the puzzle random.
 */

/**
 * Secure words: the last word in each cycle. Player must tap the action when the word *before* this is shown.
 * Expanded for tier 4+ to include more protect/harden-themed terms (hacking/programming).
 */
export const SECURE_WORDS = [
  'Lock',
  'Encrypt',
  'Secure',
  'Shield',
  'Harden',
  'Sanitize',
  'Seal',
  'Guard',
  'Validate',
  'Fortify',
  'Defend',
  'Protect',
  'Isolate',
  'Throttle',
  'Filter',
] as const;

/**
 * Word groups for Race Condition Heist (tiers 1–3).
 * Each group is a 3-word cycle: [action, action, secureWord].
 * The last word is always a secure word. The player must tap when the word *before* the secure word is displayed.
 */
const WORD_GROUPS_TIERS_1_3: readonly string[][] = [
  ['Read', 'Write', 'Lock'],
  ['Read', 'Write', 'Encrypt'],
  ['Read', 'Write', 'Secure'],
  ['Log in', 'Fetch email', 'Lock'],
  ['Log in', 'Log out', 'Secure'],
  ['Fetch email', 'Send reply', 'Lock'],
  ['Query', 'Write', 'Encrypt'],
  ['Connect', 'Transfer', 'Secure'],
  ['Log in', 'Fetch email', 'Encrypt'],
  ['Read', 'Query', 'Shield'],
  ['Connect', 'Transfer', 'Harden'],
  ['Log in', 'Fetch email', 'Guard'],
  ['Read', 'Hijack', 'Defend'],
  ['Query', 'Sniff', 'Protect'],
  ['Connect', 'Replay', 'Isolate'],
  ['Log in', 'Decrypt', 'Throttle'],
  ['Fetch email', 'Clone', 'Filter'],
  ['Transfer', 'Escalate', 'Lock'],
  ['Log out', 'Pivot', 'Shield'],
  ['Send reply', 'Tunnel', 'Guard'],
];

/**
 * Tier 4: 4-word cycles [action, action, action, secureWord].
 * Longer cycle = smaller timing window relative to cycle length. Uses expanded secure words.
 */
const WORD_GROUPS_TIER_4: readonly string[][] = [
  ['Read', 'Write', 'Query', 'Lock'],
  ['Log in', 'Fetch email', 'Send reply', 'Encrypt'],
  ['Connect', 'Transfer', 'Query', 'Secure'],
  ['Read', 'Write', 'Log out', 'Shield'],
  ['Query', 'Write', 'Connect', 'Harden'],
  ['Fetch email', 'Log in', 'Send reply', 'Sanitize'],
  ['Transfer', 'Connect', 'Read', 'Seal'],
  ['Log out', 'Fetch email', 'Query', 'Guard'],
  ['Read', 'Connect', 'Transfer', 'Validate'],
  ['Log in', 'Write', 'Fetch email', 'Fortify'],
  ['Send reply', 'Query', 'Log out', 'Lock'],
  ['Connect', 'Read', 'Write', 'Encrypt'],
  ['Read', 'Query', 'Hijack', 'Defend'],
  ['Connect', 'Transfer', 'Sniff', 'Protect'],
  ['Log in', 'Fetch email', 'Replay', 'Isolate'],
  ['Query', 'Log out', 'Decrypt', 'Throttle'],
  ['Fetch email', 'Read', 'Dump', 'Filter'],
  ['Transfer', 'Query', 'Clone', 'Seal'],
  ['Read', 'Connect', 'Escalate', 'Guard'],
  ['Log out', 'Fetch email', 'Overflow', 'Fortify'],
  ['Send reply', 'Read', 'Pivot', 'Validate'],
  ['Connect', 'Transfer', 'Scrape', 'Lock'],
];

/**
 * Tier 6: 5-word cycles. array[0]–[2] = other words (tap = incorrect + cooldown); array[3] = success word; array[4] = secure word (tap = fatal).
 */
const WORD_GROUPS_TIER_6: readonly string[][] = [
  ['Read', 'Query', 'Log in', 'Write', 'Lock'],
  ['Connect', 'Transfer', 'Fetch email', 'Capture', 'Secure'],
  ['Log in', 'Send reply', 'Read', 'Exfiltrate', 'Shield'],
  ['Query', 'Log out', 'Connect', 'Bypass', 'Harden'],
  ['Fetch email', 'Read', 'Transfer', 'Write', 'Sanitize'],
  ['Transfer', 'Query', 'Log in', 'Patch', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Exfiltrate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Bypass', 'Validate'],
  ['Send reply', 'Read', 'Log in', 'Write', 'Fortify'],
  ['Connect', 'Transfer', 'Log out', 'Inject', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Exfiltrate', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Bypass', 'Secure'],
  ['Read', 'Query', 'Log in', 'Hijack', 'Defend'],
  ['Connect', 'Transfer', 'Fetch email', 'Sniff', 'Protect'],
  ['Log in', 'Send reply', 'Read', 'Replay', 'Isolate'],
  ['Query', 'Log out', 'Connect', 'Decrypt', 'Throttle'],
  ['Fetch email', 'Read', 'Transfer', 'Dump', 'Filter'],
  ['Transfer', 'Query', 'Log in', 'Clone', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Escalate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Overflow', 'Fortify'],
  ['Send reply', 'Read', 'Log in', 'Pivot', 'Validate'],
  ['Connect', 'Transfer', 'Log out', 'Tunnel', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Scrape', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Forge', 'Secure'],
];

/** Cooldown (ms) after tapping a wrong word (array[0] or [1]) on tier 5. 4-word cycles; index 2 = exploit, 3 = secure. */
export const RCH_WRONG_WORD_COOLDOWN_MS_TIER_5 = 1500;

/** Cooldown (ms) after tapping a wrong word (array[0], [1], or [2]) on tier 6. */
export const RCH_WRONG_WORD_COOLDOWN_MS_TIER_6 = 1650;

/**
 * Tier 7: 6-word cycles. array[0]–[3] = other words (tap = incorrect + cooldown); array[4] = success word; array[5] = secure word (tap = fatal).
 */
const WORD_GROUPS_TIER_7: readonly string[][] = [
  ['Read', 'Query', 'Log in', 'Connect', 'Write', 'Lock'],
  ['Connect', 'Transfer', 'Fetch email', 'Send reply', 'Capture', 'Secure'],
  ['Log in', 'Read', 'Log out', 'Query', 'Exfiltrate', 'Shield'],
  ['Query', 'Log out', 'Connect', 'Fetch email', 'Bypass', 'Harden'],
  ['Fetch email', 'Read', 'Transfer', 'Log in', 'Write', 'Sanitize'],
  ['Transfer', 'Query', 'Log in', 'Read', 'Patch', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Log out', 'Exfiltrate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Transfer', 'Bypass', 'Validate'],
  ['Send reply', 'Read', 'Log in', 'Connect', 'Write', 'Fortify'],
  ['Connect', 'Transfer', 'Log out', 'Query', 'Inject', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Send reply', 'Exfiltrate', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Read', 'Bypass', 'Secure'],
  ['Read', 'Query', 'Log in', 'Connect', 'Hijack', 'Defend'],
  ['Connect', 'Transfer', 'Fetch email', 'Send reply', 'Sniff', 'Protect'],
  ['Log in', 'Read', 'Log out', 'Query', 'Replay', 'Isolate'],
  ['Query', 'Log out', 'Connect', 'Fetch email', 'Decrypt', 'Throttle'],
  ['Fetch email', 'Read', 'Transfer', 'Log in', 'Dump', 'Filter'],
  ['Transfer', 'Query', 'Log in', 'Read', 'Clone', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Log out', 'Escalate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Transfer', 'Overflow', 'Fortify'],
  ['Send reply', 'Read', 'Log in', 'Connect', 'Pivot', 'Validate'],
  ['Connect', 'Transfer', 'Log out', 'Query', 'Tunnel', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Send reply', 'Scrape', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Read', 'Forge', 'Secure'],
];

/** Cooldown (ms) after tapping a wrong word (array[0], [1], [2], or [3]) on tier 7. */
export const RCH_WRONG_WORD_COOLDOWN_MS_TIER_7 = 1800;

/** Cooldown (ms) after tapping a wrong word (array[0]–[4]) on tier 8. Same as tier 7 for 7-word sets (slightly gentler than tier 9’s 1200). */
export const RCH_WRONG_WORD_COOLDOWN_MS_TIER_8 = 1950;

/**
 * Tier 8: 7-word cycles. array[0]–[4] = other words; array[5] = success word; array[6] = secure word (tap = fatal).
 */
const WORD_GROUPS_TIER_8: readonly string[][] = [
  ['Read', 'Query', 'Log in', 'Connect', 'Fetch email', 'Write', 'Lock'],
  ['Connect', 'Transfer', 'Send reply', 'Log out', 'Query', 'Capture', 'Secure'],
  ['Log in', 'Read', 'Query', 'Transfer', 'Connect', 'Exfiltrate', 'Shield'],
  ['Query', 'Log out', 'Fetch email', 'Read', 'Send reply', 'Bypass', 'Harden'],
  ['Fetch email', 'Read', 'Transfer', 'Log in', 'Connect', 'Write', 'Sanitize'],
  ['Transfer', 'Query', 'Log in', 'Read', 'Log out', 'Patch', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Log out', 'Fetch email', 'Exfiltrate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Transfer', 'Read', 'Bypass', 'Validate'],
  ['Send reply', 'Read', 'Log in', 'Connect', 'Query', 'Write', 'Fortify'],
  ['Connect', 'Transfer', 'Log out', 'Query', 'Log in', 'Inject', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Exfiltrate', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Read', 'Fetch email', 'Bypass', 'Secure'],
  ['Read', 'Query', 'Log in', 'Connect', 'Fetch email', 'Hijack', 'Defend'],
  ['Connect', 'Transfer', 'Send reply', 'Log out', 'Query', 'Sniff', 'Protect'],
  ['Log in', 'Read', 'Query', 'Transfer', 'Connect', 'Replay', 'Isolate'],
  ['Query', 'Log out', 'Fetch email', 'Read', 'Send reply', 'Decrypt', 'Throttle'],
  ['Fetch email', 'Read', 'Transfer', 'Log in', 'Connect', 'Dump', 'Filter'],
  ['Transfer', 'Query', 'Log in', 'Read', 'Log out', 'Clone', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Log out', 'Fetch email', 'Escalate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Transfer', 'Read', 'Overflow', 'Fortify'],
  ['Send reply', 'Read', 'Log in', 'Connect', 'Query', 'Pivot', 'Validate'],
  ['Connect', 'Transfer', 'Log out', 'Query', 'Log in', 'Tunnel', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Scrape', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Read', 'Fetch email', 'Forge', 'Secure'],
];

/**
 * Tier 9: 8-word cycles. array[0]–[5] = other words (tap = wrong_word + cooldown); array[6] = success word; array[7] = secure word (tap = fatal).
 */
const WORD_GROUPS_TIER_9: readonly string[][] = [
  ['Read', 'Query', 'Log in', 'Connect', 'Fetch email', 'Send reply', 'Write', 'Lock'],
  ['Connect', 'Transfer', 'Send reply', 'Log out', 'Query', 'Log in', 'Capture', 'Secure'],
  ['Log in', 'Read', 'Query', 'Transfer', 'Connect', 'Fetch email', 'Exfiltrate', 'Shield'],
  ['Query', 'Log out', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Bypass', 'Harden'],
  ['Fetch email', 'Read', 'Transfer', 'Log in', 'Connect', 'Query', 'Write', 'Sanitize'],
  ['Transfer', 'Query', 'Log in', 'Read', 'Log out', 'Connect', 'Patch', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Log out', 'Fetch email', 'Query', 'Exfiltrate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Transfer', 'Read', 'Send reply', 'Bypass', 'Validate'],
  ['Send reply', 'Read', 'Log in', 'Connect', 'Query', 'Transfer', 'Write', 'Fortify'],
  ['Connect', 'Transfer', 'Log out', 'Query', 'Log in', 'Read', 'Inject', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Log out', 'Exfiltrate', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Read', 'Fetch email', 'Transfer', 'Bypass', 'Secure'],
  ['Read', 'Query', 'Log in', 'Connect', 'Fetch email', 'Send reply', 'Hijack', 'Defend'],
  ['Connect', 'Transfer', 'Send reply', 'Log out', 'Query', 'Log in', 'Sniff', 'Protect'],
  ['Log in', 'Read', 'Query', 'Transfer', 'Connect', 'Fetch email', 'Replay', 'Isolate'],
  ['Query', 'Log out', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Decrypt', 'Throttle'],
  ['Fetch email', 'Read', 'Transfer', 'Log in', 'Connect', 'Query', 'Dump', 'Filter'],
  ['Transfer', 'Query', 'Log in', 'Read', 'Log out', 'Connect', 'Clone', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Log out', 'Fetch email', 'Query', 'Escalate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Transfer', 'Read', 'Send reply', 'Overflow', 'Fortify'],
  ['Send reply', 'Read', 'Log in', 'Connect', 'Query', 'Transfer', 'Pivot', 'Validate'],
  ['Connect', 'Transfer', 'Log out', 'Query', 'Log in', 'Read', 'Tunnel', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Log out', 'Scrape', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Read', 'Fetch email', 'Transfer', 'Forge', 'Secure'],
];

/** Cooldown (ms) after tapping a wrong word (array[0]–[5]) on tier 9. */
export const RCH_WRONG_WORD_COOLDOWN_MS_TIER_9 = 2100;

/**
 * Tier 10–21: 10-word cycles. array[0]–[7] = other words; array[8] = success word; array[9] = secure word (tap = fatal).
 * Each row must have exactly 10 elements so getPreSecureIndex = 8 and wrong_word = 0–7.
 * Each row must have unique words (no duplicates); server fallback uses wordRotation.indexOf(labelFromClient).
 */
const WORD_GROUPS_TIER_10: readonly string[][] = [
  ['Read', 'Query', 'Log in', 'Connect', 'Fetch email', 'Send reply', 'Log out', 'Transfer', 'Write', 'Lock'],
  ['Connect', 'Transfer', 'Send reply', 'Log out', 'Query', 'Log in', 'Read', 'Fetch email', 'Capture', 'Secure'],
  ['Log in', 'Read', 'Query', 'Transfer', 'Connect', 'Fetch email', 'Send reply', 'Log out', 'Exfiltrate', 'Shield'],
  ['Query', 'Log out', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Connect', 'Log in', 'Bypass', 'Harden'],
  ['Fetch email', 'Read', 'Transfer', 'Log in', 'Connect', 'Query', 'Log out', 'Send reply', 'Write', 'Sanitize'],
  ['Transfer', 'Query', 'Log in', 'Read', 'Log out', 'Connect', 'Fetch email', 'Send reply', 'Patch', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Log out', 'Fetch email', 'Query', 'Transfer', 'Log in', 'Exfiltrate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Transfer', 'Read', 'Send reply', 'Log in', 'Connect', 'Bypass', 'Validate'],
  ['Send reply', 'Read', 'Log in', 'Connect', 'Query', 'Transfer', 'Fetch email', 'Log out', 'Write', 'Fortify'],
  ['Connect', 'Transfer', 'Log out', 'Query', 'Log in', 'Read', 'Send reply', 'Fetch email', 'Inject', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Log out', 'Connect', 'Log in', 'Exfiltrate', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Read', 'Fetch email', 'Transfer', 'Query', 'Log out', 'Bypass', 'Secure'],
  ['Read', 'Query', 'Log in', 'Connect', 'Fetch email', 'Send reply', 'Log out', 'Transfer', 'Hijack', 'Defend'],
  ['Connect', 'Transfer', 'Send reply', 'Log out', 'Query', 'Log in', 'Read', 'Fetch email', 'Sniff', 'Protect'],
  ['Log in', 'Read', 'Query', 'Transfer', 'Connect', 'Fetch email', 'Send reply', 'Log out', 'Replay', 'Isolate'],
  ['Query', 'Log out', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Connect', 'Log in', 'Decrypt', 'Throttle'],
  ['Fetch email', 'Read', 'Transfer', 'Log in', 'Connect', 'Query', 'Log out', 'Send reply', 'Dump', 'Filter'],
  ['Transfer', 'Query', 'Log in', 'Read', 'Log out', 'Connect', 'Fetch email', 'Send reply', 'Clone', 'Seal'],
  ['Read', 'Connect', 'Send reply', 'Log out', 'Fetch email', 'Query', 'Transfer', 'Log in', 'Escalate', 'Guard'],
  ['Log out', 'Fetch email', 'Query', 'Transfer', 'Read', 'Send reply', 'Log in', 'Connect', 'Overflow', 'Fortify'],
  ['Send reply', 'Read', 'Log in', 'Connect', 'Query', 'Transfer', 'Fetch email', 'Log out', 'Pivot', 'Validate'],
  ['Connect', 'Transfer', 'Log out', 'Query', 'Log in', 'Read', 'Send reply', 'Fetch email', 'Tunnel', 'Lock'],
  ['Query', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Log out', 'Connect', 'Log in', 'Scrape', 'Encrypt'],
  ['Log in', 'Connect', 'Send reply', 'Read', 'Fetch email', 'Transfer', 'Query', 'Log out', 'Forge', 'Secure'],
  ['Read', 'Query', 'Log in', 'Connect', 'Fetch email', 'Send reply', 'Log out', 'Transfer', 'Impersonate', 'Defend'],
  ['Connect', 'Transfer', 'Send reply', 'Log out', 'Query', 'Log in', 'Read', 'Fetch email', 'Probe', 'Protect'],
  ['Log in', 'Read', 'Query', 'Transfer', 'Connect', 'Fetch email', 'Send reply', 'Log out', 'Spoof', 'Isolate'],
  ['Query', 'Log out', 'Fetch email', 'Read', 'Send reply', 'Transfer', 'Connect', 'Log in', 'Relay', 'Throttle'],
];

/** Wrong-word cooldown (ms) for tiers 10–21. Tier 10 = 2250 ms, +150 ms per tier through 21 (21 = 3900 ms). */
export function getWrongWordCooldownMsTier10Plus(tier: number): number {
  if (tier >= 10 && tier <= 21) {
    return 1500 + (tier - 5) * 150;
  }
  throw new Error(`getWrongWordCooldownMsTier10Plus only supports tier 10–21, got ${tier}`);
}

/** Default word rotation for fallback. */
const WORD_ROTATION_DEFAULT = ['Read', 'Write', 'Lock'];
const WORD_DURATION_MS = 1500;

/** Return a random word group for the given tier. Tiers 1–3: 3-word. Tiers 4–5: 4-word. Tier 6: 5-word. Tier 7: 6-word. Tier 8: 7-word. Tier 9: 8-word. Tiers 10–21: 10-word (same WORD_GROUPS_TIER_10 for all). */
export function getRandomWordGroupForTier(tier: number): string[] {
  if (tier >= 10 && tier <= 21) {
    const idx = Math.floor(Math.random() * WORD_GROUPS_TIER_10.length);
    return [...WORD_GROUPS_TIER_10[idx]];
  }
  if (tier === 9) {
    const idx = Math.floor(Math.random() * WORD_GROUPS_TIER_9.length);
    return [...WORD_GROUPS_TIER_9[idx]];
  }
  if (tier === 8) {
    const idx = Math.floor(Math.random() * WORD_GROUPS_TIER_8.length);
    return [...WORD_GROUPS_TIER_8[idx]];
  }
  if (tier === 7) {
    const idx = Math.floor(Math.random() * WORD_GROUPS_TIER_7.length);
    return [...WORD_GROUPS_TIER_7[idx]];
  }
  if (tier === 6) {
    const idx = Math.floor(Math.random() * WORD_GROUPS_TIER_6.length);
    return [...WORD_GROUPS_TIER_6[idx]];
  }
  if (tier === 4 || tier === 5) {
    const idx = Math.floor(Math.random() * WORD_GROUPS_TIER_4.length);
    return [...WORD_GROUPS_TIER_4[idx]];
  }
  if (tier >= 1 && tier <= 3) {
    const idx = Math.floor(Math.random() * WORD_GROUPS_TIERS_1_3.length);
    return [...WORD_GROUPS_TIERS_1_3[idx]];
  }
  return [...WORD_ROTATION_DEFAULT];
}

/** Deterministic word group for a tier (first group). Used in LevelParams so fallback sessionDoc.wordRotation ?? params.wordRotation is valid per tier. */
function getDefaultWordGroupForTier(tier: number): string[] {
  if (tier >= 10 && tier <= 21) return [...WORD_GROUPS_TIER_10[0]];
  if (tier === 9) return [...WORD_GROUPS_TIER_9[0]];
  if (tier === 8) return [...WORD_GROUPS_TIER_8[0]];
  if (tier === 7) return [...WORD_GROUPS_TIER_7[0]];
  if (tier === 6) return [...WORD_GROUPS_TIER_6[0]];
  if (tier === 4 || tier === 5) return [...WORD_GROUPS_TIER_4[0]];
  if (tier >= 1 && tier <= 3) return [...WORD_GROUPS_TIERS_1_3[0]];
  return [...WORD_ROTATION_DEFAULT];
}

/** Packet count per tier (matches packet generators in raceConditionHeist routes). */
export function getPacketCountForTier(tier: number): number {
  if (tier === 1) return 1;
  if (tier === 2) return 2;
  if (tier === 3) return 3;
  if (tier === 4 || tier === 5) return 4;
  if (tier === 6) return 5;
  if (tier === 7) return 6;
  if (tier === 8) return 7;
  if (tier === 9 || tier === 10 || tier === 11) return 8;
  if (tier === 12 || tier === 13) return 9;
  if (tier === 14 || tier === 15) return 10;
  if (tier === 16 || tier === 17) return 11;
  if (tier === 18 || tier === 19) return 12;
  if (tier === 20 || tier === 21) return 13;
  return 1;
}

/** Points per packet (must match PACKET_TYPES.USER_DATA — all RCH packets use USER_DATA). Required score = packets × this. */
export const RCH_SCORE_PER_PACKET = 50;

/** Required score to pass = packet count × points per packet. Matches the score earned when all packets are hijacked (base, no combo). */
export function getScoreThresholdForTier(tier: number): number {
  return getPacketCountForTier(tier) * RCH_SCORE_PER_PACKET;
}

/** Build all 105 levels from tier params. */
function buildAllLevels(): LevelParams[] {
  const levels: LevelParams[] = [];
  for (let tier = 1; tier <= 21; tier++) {
    /** Match duration (ms) per tier: 2–4 = 3:00, 5 = 2:30, 6 = 2:00, 7 = 1:50, 8 = 1:45, 9–12 = 1:40, 13–16 = 1:35, 17 = 1:30, 18 = 1:25, 19 = 1:20, 20 = 1:15, 21 = 1:10. */
    const matchDurationMs =
      tier === 1
        ? 180000
        : tier === 2 || tier === 3 || tier === 4
          ? 180000
          : tier === 5
            ? 150000
            : tier === 6
              ? 120000
              : tier === 7
                ? 110000
                : tier === 8
                  ? 105000
                  : tier === 9 || tier === 10 || tier === 11 || tier === 12
                    ? 100000
                    : tier === 13 || tier === 14 || tier === 15 || tier === 16
                      ? 95000
                      : tier === 17
                        ? 90000
                        : tier === 18
                          ? 85000
                          : tier === 19
                            ? 80000
                            : tier === 20
                              ? 75000
                                : tier === 21
                                ? 70000
                                : Math.max(70000, 180000 - (tier - 1) * 2000);
    const wordRotation = getDefaultWordGroupForTier(tier);
    /** Word duration (ms) per tier: 1–2 = 1500, then −50 ms per tier (3=1450, 4=1400, … 21=550). */
    const wordDurationMs =
      tier >= 2 && tier <= 21
        ? 1600 - 50 * tier
        : WORD_DURATION_MS;
    const maxPackets = getPacketCountForTier(tier);
    const scoreThreshold = getScoreThresholdForTier(tier);
    for (let y = 1; y <= 5; y++) {
      levels.push({
        levelId: `${tier}.${y}`,
        tier,
        matchDurationMs,
        wordRotation,
        wordDurationMs,
        maxPackets,
        scoreThreshold,
      });
    }
  }
  return levels;
}

const ALL_LEVELS = buildAllLevels();
const LEVEL_MAP = new Map<LevelId, LevelParams>(ALL_LEVELS.map((l) => [l.levelId, l]));

export function getLevelParams(levelId: LevelId): LevelParams | null {
  return LEVEL_MAP.get(levelId) ?? null;
}

/** Cost per run: same formula as Packet Breach — ((X-1)*5 + Y) * 100. */
export function getCostForLevel(levelId: LevelId): number {
  const match = /^(\d+)\.(\d+)$/.exec(levelId);
  if (!match) return 0;
  const X = parseInt(match[1], 10);
  const Y = parseInt(match[2], 10);
  return ((X - 1) * 5 + Y) * 100;
}

export function getTierLevels(tier: number): LevelId[] {
  return ALL_LEVELS.filter((l) => l.tier === tier).map((l) => l.levelId);
}

/** All level IDs in unlock order (1.1–21.5). */
export function getAllLevelIds(): LevelId[] {
  return ALL_LEVELS.map((l) => l.levelId);
}

/** Packet types and point values (design doc). */
export const PACKET_TYPES = {
  USER_DATA: 50,
  ACCESS_TOKEN: 100,
  API_KEYS: 200,
  ADMIN_TOKEN: 400,
  ROOT_CREDENTIALS: 800,
} as const;

export type PacketTypeKey = keyof typeof PACKET_TYPES;

/** Exploit types: cooldown ms and reward multiplier. Pass 1 uses BUFFER_OVERFLOW only. */
export const EXPLOIT_TYPES = {
  BUFFER_OVERFLOW: { cooldownMs: 800, multiplier: 1 },
  SESSION_HIJACK: { cooldownMs: 1500, multiplier: 1.25 },
  PRIVILEGE_ESCALATION: { cooldownMs: 2500, multiplier: 2 },
} as const;

export type ExploitKey = keyof typeof EXPLOIT_TYPES;

/** Combo thresholds: 2 packets = 1.2x, 4 = 1.5x, 6 = 2x (design doc). */
export const COMBO_MULTIPLIERS: { count: number; multiplier: number }[] = [
  { count: 2, multiplier: 1.2 },
  { count: 4, multiplier: 1.5 },
  { count: 6, multiplier: 2 },
];

export function getComboMultiplier(comboCount: number): number {
  let mult = 1;
  for (const { count, multiplier } of COMBO_MULTIPLIERS) {
    if (comboCount >= count) mult = multiplier;
  }
  return mult;
}

/** Guardian (Cavalry) tier rewards — same shape as armyBonus; applied to guardian only. */
export interface GuardianBonusDelta {
  strength: number;
  defense: number;
  speed: number;
  health: number;
}

const RCH_TIER_REWARDS: GuardianBonusDelta[] = [
  { strength: 0.5, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 1 },
  { strength: 0, defense: 0.001, speed: 0, health: 0 },
  { strength: 1, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 2 },
  { strength: 0, defense: 0.003, speed: 0, health: 0 },
  { strength: 1.5, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 3 },
  { strength: 0, defense: 0.005, speed: 0, health: 0 },
  { strength: 2, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 4 },
  { strength: 0, defense: 0.007, speed: 0, health: 0 },
  { strength: 2.5, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 5 },
  { strength: 0, defense: 0.009, speed: 0, health: 0 },
  { strength: 3, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 6 },
  { strength: 0, defense: 0.011, speed: 0, health: 0 },
  { strength: 3.5, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 7 },
  { strength: 0, defense: 0.013, speed: 0, health: 0 },
];

/**
 * Compute Race Condition Heist contribution to guardianBonus from levelsCompleted.
 * Used for Cavalry (Guardian) only.
 */
export function computeRaceConditionHeistGuardianBonus(levelsCompleted: string[]): GuardianBonusDelta {
  const set = new Set(levelsCompleted);
  let strength = 0;
  let defense = 0;
  let speed = 0;
  let health = 0;
  for (let tier = 1; tier <= RCH_TIER_REWARDS.length; tier++) {
    const required = getTierLevels(tier);
    if (required.length > 0 && required.every((id) => set.has(id))) {
      const r = RCH_TIER_REWARDS[tier - 1];
      strength += r.strength;
      defense += r.defense;
      speed += r.speed;
      health += r.health;
    }
  }
  return { strength, defense, speed, health };
}
