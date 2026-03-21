/**
 * Reserved system sender IDs for DMs that are not from a real user.
 * Must match server src/constants/systemSenders.ts (same value as *.toString()).
 * Replies to these IDs always fail (no User document). Key on this, not username.
 */
export const PROBE_REPORT_SENDER_ID = '000000000000000000000001';
export const BATTLE_REPORT_SENDER_ID = '000000000000000000000002';
