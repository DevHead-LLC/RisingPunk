import { isBattalionSlotUnlocked } from './researchFeatureUtils';
import { userHasMark2BotsUnlocked } from './userHasMark2BotsUnlocked';

export type NormalizedBattleBattalion = {
  type: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  markLevel: 1 | 2;
  nodeIndex?: number;
};

export type NormalizeUserBattalionsResult =
  | { ok: true; normalized: NormalizedBattleBattalion[] }
  | { ok: false; status: 400 | 403; error: string };

const MAX_USER_BATTALIONS = 6;

/**
 * Shared by `POST /api/battle/start` and `POST /api/attack/launch` (battalion slots, Mark II, types).
 */
export async function normalizeUserBattalionsForBattleStart(
  userId: string,
  userBattalions: unknown[] | undefined | null
): Promise<NormalizeUserBattalionsResult> {
  if (!userBattalions || userBattalions.length === 0) {
    return { ok: false, status: 400, error: 'userBattalions is required and must contain at least one battalion' };
  }

  const hasValidBattalion = userBattalions.some(
    (b: any) => b && typeof b === 'object' && typeof b.quantity === 'number' && b.quantity > 0
  );
  if (!hasValidBattalion) {
    return {
      ok: false,
      status: 400,
      error: 'userBattalions must contain at least one battalion with quantity > 0',
    };
  }

  if (userBattalions.length > MAX_USER_BATTALIONS) {
    return { ok: false, status: 400, error: `Maximum ${MAX_USER_BATTALIONS} battalions allowed` };
  }

  if (userBattalions.length > 2) {
    const unlockedC = await isBattalionSlotUnlocked(String(userId), 'C');
    if (!unlockedC) {
      return {
        ok: false,
        status: 403,
        error: 'Battalion C is locked. Complete the "Add Battalion C" research feature to unlock it.',
      };
    }
  }

  if (userBattalions.length > 3) {
    const unlockedD = await isBattalionSlotUnlocked(String(userId), 'D');
    if (!unlockedD) {
      return {
        ok: false,
        status: 403,
        error: 'Battalion D is locked. Complete the "Add Battalion D" research feature to unlock it.',
      };
    }
  }

  if (userBattalions.length > 4) {
    const unlockedE = await isBattalionSlotUnlocked(String(userId), 'E');
    if (!unlockedE) {
      return {
        ok: false,
        status: 403,
        error: 'Battalion E is locked. Complete the "Add Battalion E" research feature to unlock it.',
      };
    }
  }

  if (userBattalions.length > 5) {
    const unlockedF = await isBattalionSlotUnlocked(String(userId), 'F');
    if (!unlockedF) {
      return {
        ok: false,
        status: 403,
        error: 'Battalion F is locked. Complete the "Add Battalion F" research feature to unlock it.',
      };
    }
  }

  const normalized: NormalizedBattleBattalion[] = [];
  for (const b of userBattalions) {
    if (!b || typeof b !== 'object') {
      return { ok: false, status: 400, error: 'Invalid userBattalions entry.' };
    }
    const t = (b as { type?: unknown }).type;
    if (t !== 'breacher' && t !== 'guardian' && t !== 'phreak') {
      return { ok: false, status: 400, error: 'Each battalion type must be breacher, guardian, or phreak.' };
    }
    if (typeof (b as { quantity?: unknown }).quantity !== 'number' || !Number.isInteger((b as any).quantity)) {
      continue;
    }
    const qty = (b as { quantity: number }).quantity;
    if (qty <= 0) {
      continue;
    }
    const rawMl = (b as { markLevel?: unknown }).markLevel;
    let markLevel: 1 | 2;
    if (rawMl === undefined || rawMl === null) {
      markLevel = 1;
    } else {
      const v = typeof rawMl === 'string' ? Number(rawMl.trim()) : rawMl;
      if (v !== 1 && v !== 2) {
        return { ok: false, status: 400, error: 'markLevel must be 1 or 2.' };
      }
      markLevel = v;
    }
    if (markLevel === 2) {
      const unlocked = await userHasMark2BotsUnlocked(userId);
      if (!unlocked) {
        return {
          ok: false,
          status: 403,
          error: 'Complete Mark 2 Bots research in Hack Ability to deploy Mark II units in battle.',
        };
      }
    }
    const rawNi = (b as { nodeIndex?: unknown }).nodeIndex;
    const nodeIndex =
      typeof rawNi === 'number' && Number.isInteger(rawNi) && rawNi >= 0 && rawNi <= 8 ? rawNi : undefined;
    const entry: NormalizedBattleBattalion = { type: t, quantity: qty, markLevel };
    if (nodeIndex !== undefined) {
      entry.nodeIndex = nodeIndex;
    }
    normalized.push(entry);
  }

  if (normalized.length === 0) {
    return {
      ok: false,
      status: 400,
      error: 'userBattalions must contain at least one battalion with quantity > 0',
    };
  }

  return { ok: true, normalized };
}
