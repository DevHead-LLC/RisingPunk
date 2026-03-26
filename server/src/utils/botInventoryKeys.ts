/** Mark I / Mark II inventory keys on Bot.bots (no overlap between marks). */

export const BOT_FAMILY_TYPES = ['breacher', 'guardian', 'phreak'] as const;
export type BotFamily = (typeof BOT_FAMILY_TYPES)[number];

export type BotInventoryKey =
  | 'breacher'
  | 'guardian'
  | 'phreak'
  | 'breacherM2'
  | 'guardianM2'
  | 'phreakM2';

const M1_KEYS: BotInventoryKey[] = ['breacher', 'guardian', 'phreak'];
const M2_KEYS: BotInventoryKey[] = ['breacherM2', 'guardianM2', 'phreakM2'];

/** Map `Bot.bots` inventory key back to family + mark (for stats / battle totals). */
export function parseInventoryKeyToFamilyAndMark(
  key: string
): { family: BotFamily; markLevel: 1 | 2 } | null {
  if (key === 'breacher' || key === 'guardian' || key === 'phreak') {
    return { family: key, markLevel: 1 };
  }
  if (key === 'breacherM2') {
    return { family: 'breacher', markLevel: 2 };
  }
  if (key === 'guardianM2') {
    return { family: 'guardian', markLevel: 2 };
  }
  if (key === 'phreakM2') {
    return { family: 'phreak', markLevel: 2 };
  }
  return null;
}

/**
 * Stat key for `BotStatsService` (Mark I family key or `breacherM2`…`breacherM4` derived keys).
 * Used for NPC/enemy battalions at any supported mark.
 */
export function getFamilyMarkStatsKey(family: BotFamily, markLevel: number): string {
  const m = Math.min(4, Math.max(1, Math.floor(markLevel)));
  if (m === 1) {
    return family;
  }
  return `${family}M${m}`;
}

export function getInventoryKey(botType: string, markLevel: number): BotInventoryKey {
  const ml = markLevel >= 2 ? 2 : 1;
  if (ml === 2) {
    if (botType === 'breacher') return 'breacherM2';
    if (botType === 'guardian') return 'guardianM2';
    if (botType === 'phreak') return 'phreakM2';
  }
  if (botType === 'breacher' || botType === 'guardian' || botType === 'phreak') {
    return botType;
  }
  throw new Error(`Invalid bot family type: ${botType}`);
}

export function defaultBotsInventory(): Record<BotInventoryKey, number> {
  return {
    breacher: 0,
    guardian: 0,
    phreak: 0,
    breacherM2: 0,
    guardianM2: 0,
    phreakM2: 0,
  };
}

export function normalizeBotsObject(raw: Record<string, unknown> | null | undefined): Record<BotInventoryKey, number> {
  const d = defaultBotsInventory();
  if (!raw || typeof raw !== 'object') return d;
  for (const k of [...M1_KEYS, ...M2_KEYS]) {
    const v = raw[k];
    if (typeof v === 'number' && Number.isFinite(v)) {
      d[k] = Math.max(0, Math.floor(v));
    }
  }
  return d;
}

export function buildCostPerUnit(markLevel: number): number {
  return markLevel >= 2 ? 4 : 1;
}

export function buildMillisecondsPerUnit(markLevel: number): number {
  return markLevel >= 2 ? 4000 : 1000;
}

/**
 * Family key for an active build (breacher | guardian | phreak).
 * Prefer `botType`; fall back to legacy BSON `type` (see Bot model `buildQueue` + `strict: false`).
 * If `type` is shadowed on a Mongoose subdocument, `toObject()` is used.
 */
export function parseBuildQueueFamily(
  bq:
    | { botType?: string; type?: string; toObject?: () => Record<string, unknown> }
    | null
    | undefined
): BotFamily | null {
  if (!bq) return null;

  const pick = (o: Record<string, unknown>): unknown => o.botType ?? o.type;

  let t: unknown = pick(bq as Record<string, unknown>);
  if (
    (typeof t !== 'string' || (t !== 'breacher' && t !== 'guardian' && t !== 'phreak')) &&
    typeof bq.toObject === 'function'
  ) {
    try {
      t = pick(bq.toObject());
    } catch {
      /* ignore */
    }
  }
  if (t === 'breacher' || t === 'guardian' || t === 'phreak') {
    return t;
  }
  return null;
}

export function getBuildQueueFamily(
  bq: { botType?: string; type?: string; toObject?: () => Record<string, unknown> } | null | undefined
): BotFamily {
  const f = parseBuildQueueFamily(bq);
  if (f == null) {
    throw new Error('Invalid or missing build queue family (botType/type)');
  }
  return f;
}
