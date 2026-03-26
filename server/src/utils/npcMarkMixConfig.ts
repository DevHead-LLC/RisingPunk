/**
 * Authoritative mark-mix **tier** (1–21) → mark share table (see taskItems/ios/hackMap/npc/npc-mark-mix-roadmap.md).
 *
 * **Not** `userLevelAssociation` (1–99): that field scales combat stats and must not be used as the table index.
 */

export type NpcMarkShareRow = { m1: number; m2: number; m3: number; m4: number };

/** Row index 1–21 → target % of each family’s troops per mark (sums to 100). */
export const NPC_MARK_MIX_BY_LEVEL: Record<number, NpcMarkShareRow> = {
  1: { m1: 100, m2: 0, m3: 0, m4: 0 },
  2: { m1: 100, m2: 0, m3: 0, m4: 0 },
  3: { m1: 100, m2: 0, m3: 0, m4: 0 },
  4: { m1: 100, m2: 0, m3: 0, m4: 0 },
  5: { m1: 75, m2: 25, m3: 0, m4: 0 },
  6: { m1: 50, m2: 50, m3: 0, m4: 0 },
  7: { m1: 25, m2: 75, m3: 0, m4: 0 },
  8: { m1: 0, m2: 100, m3: 0, m4: 0 },
  9: { m1: 0, m2: 100, m3: 0, m4: 0 },
  10: { m1: 0, m2: 100, m3: 0, m4: 0 },
  11: { m1: 0, m2: 75, m3: 25, m4: 0 },
  12: { m1: 0, m2: 50, m3: 50, m4: 0 },
  13: { m1: 0, m2: 25, m3: 75, m4: 0 },
  14: { m1: 0, m2: 0, m3: 100, m4: 0 },
  15: { m1: 0, m2: 0, m3: 100, m4: 0 },
  16: { m1: 0, m2: 0, m3: 75, m4: 25 },
  17: { m1: 0, m2: 0, m3: 50, m4: 50 },
  18: { m1: 0, m2: 0, m3: 25, m4: 75 },
  19: { m1: 0, m2: 0, m3: 0, m4: 100 },
  20: { m1: 0, m2: 0, m3: 0, m4: 100 },
  21: { m1: 0, m2: 0, m3: 0, m4: 100 },
};

export function getNpcMarkMixRowForTier(markMixTier: number): NpcMarkShareRow {
  const tier = Math.min(21, Math.max(1, Math.floor(markMixTier)));
  const row = NPC_MARK_MIX_BY_LEVEL[tier];
  if (!row) {
    throw new Error(`npcMarkMixConfig: missing row for markMixTier ${tier}`);
  }
  return { ...row };
}

/**
 * Which row (1–21) in `NPC_MARK_MIX_BY_LEVEL` applies to this NPC.
 *
 * - If `npcMarkMixTier` is set on the NPC (1–21), that is the **authority** (game tier / progression step).
 * - Otherwise derive from `userLevelAssociation` by spreading **ULA 1–99** across **tiers 1–21** so high ULA
 *   does **not** collapse to tier 21 for every NPC (the bug when ULA was clamped to 21).
 */
export function resolveNpcMarkMixTierForTable(
  userLevelAssociation: number,
  npcMarkMixTier?: number | null
): number {
  if (npcMarkMixTier !== undefined && npcMarkMixTier !== null) {
    if (typeof npcMarkMixTier !== 'number' || !Number.isFinite(npcMarkMixTier)) {
      throw new Error(`npcMarkMixTier must be a finite number in 1–21 when set, got ${npcMarkMixTier}`);
    }
    const t = Math.floor(npcMarkMixTier);
    if (t < 1 || t > 21) {
      throw new Error(`npcMarkMixTier must be between 1 and 21, got ${t}`);
    }
    return t;
  }

  const ula = Math.floor(Number(userLevelAssociation));
  if (!Number.isFinite(ula)) {
    throw new Error(`resolveNpcMarkMixTierForTable: invalid userLevelAssociation ${userLevelAssociation}`);
  }
  const u = Math.min(99, Math.max(1, ula));
  const mapped = Math.round(1 + ((u - 1) * 20) / 98);
  return Math.min(21, Math.max(1, mapped));
}

/**
 * Marks above `highestAvailableMark` are folded into that mark (see roadmap §4).
 * `highestAvailableMark` 1–4.
 */
export function collapseNpcMarkSharesToHighestAvailable(
  row: NpcMarkShareRow,
  highestAvailableMark: number
): NpcMarkShareRow {
  const cap = Math.min(4, Math.max(1, Math.floor(highestAvailableMark)));
  const out: NpcMarkShareRow = { m1: 0, m2: 0, m3: 0, m4: 0 };
  let overflow = 0;
  const keys: (keyof NpcMarkShareRow)[] = ['m1', 'm2', 'm3', 'm4'];
  for (let i = 0; i < keys.length; i++) {
    const markNum = i + 1;
    const v = row[keys[i]];
    if (markNum <= cap) {
      out[keys[i]] = v;
    } else {
      overflow += v;
    }
  }
  const capKey = keys[cap - 1];
  out[capKey] += overflow;
  return out;
}

export function getEffectiveNpcMarkShares(
  markMixTier: number,
  highestAvailableMark: number
): NpcMarkShareRow {
  return collapseNpcMarkSharesToHighestAvailable(
    getNpcMarkMixRowForTier(markMixTier),
    highestAvailableMark
  );
}

/** Largest-remainder split of `total` across four nonnegative weights (need not sum to 100). */
export function allocateIntegerQuantitiesByWeights(
  total: number,
  weights: [number, number, number, number]
): [number, number, number, number] {
  if (total <= 0) {
    return [0, 0, 0, 0];
  }
  const wsum = weights[0] + weights[1] + weights[2] + weights[3];
  if (wsum <= 0) {
    return [0, 0, 0, 0];
  }
  const exact = weights.map((w) => (w / wsum) * total);
  const base = exact.map((x) => Math.floor(x));
  let rem = total - base.reduce((a, b) => a + b, 0);
  const order = [0, 1, 2, 3].sort((i, j) => exact[j] - base[j] - (exact[i] - base[i]));
  const out: [number, number, number, number] = [base[0], base[1], base[2], base[3]];
  for (let k = 0; k < rem; k++) {
    out[order[k]]++;
  }
  return out;
}

export function normalizeNpcBattalionMarkLevel(raw: unknown): 1 | 2 | 3 | 4 {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 1;
  }
  const n = Math.floor(raw);
  if (n < 1) {
    return 1;
  }
  if (n > 4) {
    return 4;
  }
  return n as 1 | 2 | 3 | 4;
}
