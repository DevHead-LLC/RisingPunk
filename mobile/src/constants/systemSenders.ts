/**
 * Reserved system sender IDs for DMs that are not from a real user.
 * Must match server src/constants/systemSenders.ts (same value as PROBE_REPORT_SENDER_ID.toString()).
 * Replies to this ID always fail (no User document). Key on this, not username, so a user whose
 * handle is "Probe Report" cannot spoof formatted probe reports.
 */
export const PROBE_REPORT_SENDER_ID = '000000000000000000000001';
