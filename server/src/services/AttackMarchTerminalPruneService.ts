/**
 * Removes old `attack_marches` rows in terminal states so the collection does not grow without bound.
 * Replay data lives in `battle_replays` (`battleId`); pruning marches does not delete replays.
 */

import { AttackMarch } from '../models/AttackMarch';
import {
  ATTACK_MARCH_TERMINAL_MAX_AGE_MS,
  ATTACK_MARCH_TERMINAL_PRUNE_INTERVAL_MS,
} from '../config/env';

const BATCH_LIMIT = 500;
const MAX_BATCHES_PER_TICK = 50;

let pruneInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Deletes batches of `done` / `cancelled` marches with `createdAt` before the retention cutoff.
 * @returns Number of documents deleted this run.
 */
export async function pruneTerminalAttackMarchesOnce(): Promise<number> {
  const cutoff = new Date(Date.now() - ATTACK_MARCH_TERMINAL_MAX_AGE_MS);
  let totalDeleted = 0;

  for (let b = 0; b < MAX_BATCHES_PER_TICK; b++) {
    const rows = await AttackMarch.find({
      state: { $in: ['done', 'cancelled'] },
      createdAt: { $lt: cutoff },
    })
      .select('_id')
      .limit(BATCH_LIMIT)
      .lean();

    if (rows.length === 0) {
      break;
    }

    const ids = rows.map((r) => r._id).filter(Boolean);
    if (ids.length === 0) {
      break;
    }

    const res = await AttackMarch.deleteMany({ _id: { $in: ids } });
    totalDeleted += res.deletedCount ?? 0;

    if (rows.length < BATCH_LIMIT) {
      break;
    }
  }

  if (totalDeleted > 0) {
    console.warn('[MarchTerminalPrune] deleted old terminal attack_marches:', totalDeleted, {
      maxAgeMs: ATTACK_MARCH_TERMINAL_MAX_AGE_MS,
    });
  }

  return totalDeleted;
}

export function startAttackMarchTerminalPruneWatchdog(): void {
  if (pruneInterval) {
    return;
  }
  pruneInterval = setInterval(() => {
    void pruneTerminalAttackMarchesOnce().catch((err) =>
      console.error('[MarchTerminalPrune] tick failed:', err)
    );
  }, ATTACK_MARCH_TERMINAL_PRUNE_INTERVAL_MS);
}
