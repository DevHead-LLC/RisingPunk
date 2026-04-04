/**
 * Battle replay lifecycle: delete stored replay when no PM still references the battle (BTL| payload).
 */

import { PrivateMessage } from '../models/PrivateMessage';
import { BattleReplay } from '../models/BattleReplay';
import { getAdminUserIds } from '../config/env';

const BTL_PREFIX = 'BTL|';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse `battleId` from a Battle Report DM body (`BTL|{...}`), if present.
 */
export function extractBattleIdFromBtlPayload(message: string | undefined | null): string | null {
  if (message == null || typeof message !== 'string') return null;
  if (!message.startsWith(BTL_PREFIX)) return null;
  const jsonPart = message.slice(BTL_PREFIX.length).trim();
  if (!jsonPart) return null;
  try {
    const o = JSON.parse(jsonPart) as { battleId?: unknown };
    if (typeof o.battleId === 'string' && o.battleId.length > 0) return o.battleId;
  } catch {
    return null;
  }
  return null;
}

/**
 * If no `PrivateMessage` still contains a `BTL|` body referencing this `battleId`, delete the replay row.
 */
export async function tryDeleteBattleReplayIfUnreferenced(battleId: string): Promise<void> {
  if (battleId == null || typeof battleId !== 'string' || battleId.length === 0) {
    throw new Error('tryDeleteBattleReplayIfUnreferenced: battleId must be a non-empty string');
  }

  const needle = `"battleId":"${escapeRegExp(battleId)}"`;
  const referenced = await PrivateMessage.exists({
    message: new RegExp(needle),
  });

  if (referenced) return;

  await BattleReplay.deleteOne({ battleId });
}

export function canUserAccessBattleReplay(
  userIdStr: string,
  replay: { attackerId: string; defenderId: string; isNpc: boolean },
  adminIdSet: Set<string>
): boolean {
  if (adminIdSet.has(userIdStr)) return true;
  if (String(replay.attackerId) === userIdStr) return true;
  if (replay.isNpc) return false;
  if (String(replay.defenderId) === userIdStr) return true;
  return false;
}

export function buildAdminIdSet(): Set<string> {
  return new Set(getAdminUserIds().map((id) => id.toString()));
}
