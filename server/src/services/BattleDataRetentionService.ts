/**
 * Deletes persisted `battles` and `battle_replays` past max age to cap database growth.
 * Does **not** backfill or update `createdAt` on existing rows — it only **removes** documents that match
 * the age filter (see `purgeExpiredBattlesAndReplays`).
 * PMs may still contain `BTL|` references; GET replay for those ids will 404 after replay deletion.
 */

import { BATTLE_DATA_RETENTION_MS, BATTLE_DATA_RETENTION_SWEEP_INTERVAL_MS } from '../config/env';
import { Battle } from '../models/Battle';
import { BattleReplay } from '../models/BattleReplay';

let sweepInterval: ReturnType<typeof setInterval> | null = null;

export async function purgeExpiredBattlesAndReplays(): Promise<{
  deletedBattles: number;
  deletedReplays: number;
  cutoffIso: string;
}> {
  const cutoff = new Date(Date.now() - BATTLE_DATA_RETENTION_MS);
  const cutoffIso = cutoff.toISOString();

  const battleFilter = {
    $or: [
      { createdAt: { $exists: true, $lt: cutoff } },
      { createdAt: { $exists: false }, startTime: { $lt: cutoff } },
    ],
  };

  const [battleRes, replayRes] = await Promise.all([
    Battle.deleteMany(battleFilter),
    BattleReplay.deleteMany({ createdAt: { $lt: cutoff } }),
  ]);

  const deletedBattles = battleRes.deletedCount ?? 0;
  const deletedReplays = replayRes.deletedCount ?? 0;

  if (deletedBattles > 0 || deletedReplays > 0) {
    console.log(
      `[BattleDataRetention] cutoff=${cutoffIso} deleted battles=${deletedBattles} replays=${deletedReplays}`
    );
  }

  return { deletedBattles, deletedReplays, cutoffIso };
}

export function startBattleDataRetentionWatchdog(): void {
  if (sweepInterval) {
    return;
  }

  void purgeExpiredBattlesAndReplays().catch((err) =>
    console.error('[BattleDataRetention] initial sweep failed:', err)
  );

  sweepInterval = setInterval(() => {
    void purgeExpiredBattlesAndReplays().catch((err) =>
      console.error('[BattleDataRetention] sweep failed:', err)
    );
  }, BATTLE_DATA_RETENTION_SWEEP_INTERVAL_MS);
}

export function stopBattleDataRetentionWatchdog(): void {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}
