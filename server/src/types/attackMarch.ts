/**
 * Attack march (Phase 1) — persisted job from origin tile → target tile.
 * Authoritative timing uses {@link MarchTimingService} (DU + secondsPerDu).
 */

export type AttackMarchState =
  | 'outbound'
  | 'arrived'
  | 'queued'
  | 'resolving'
  | 'returning'
  | 'done'
  | 'cancelled';

/** Marches that should appear on the global HackMap feed (excludes `done`, `cancelled`). */
export const MAP_VISIBLE_ATTACK_MARCH_STATES: AttackMarchState[] = [
  'outbound',
  'arrived',
  'queued',
  'resolving',
  'returning',
];

/** Rows removed from `Bot.battalionAssignments` at launch; restored on outbound cancel. */
export interface ConsumedBattalionAssignmentRow {
  battalionId: string;
  botType: string;
  quantity: number;
  markLevel: number;
}

/** Snapshot at launch: same battalion shape as `POST /api/battle/start` body (before full battle setup). */
export interface AttackMarchArmySnapshot {
  screenWidth: number;
  screenHeight: number;
  battalions: Array<{
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    nodeIndex?: number;
    markLevel?: number;
  }>;
}
