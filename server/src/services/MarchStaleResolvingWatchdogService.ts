/**
 * If an `AttackMarch` stays in `resolving` longer than {@link STALE_RESOLVING_MARCH_MS}, abandon the
 * linked battle without settlement, full-inventory refund to `cancelled`, then reconcile the defender queue.
 */

import { AttackMarch } from '../models/AttackMarch';
import { Battle } from '../models/Battle';
import { STALE_RESOLVING_MARCH_MS, STALE_RESOLVING_WATCHDOG_INTERVAL_MS } from '../config/env';
import { BattlePhase } from '../types/battle';
import { BattleService } from './BattleService';
import { systemRefundAttackMarchInState } from './AttackMarchSystemRefundService';
import {
  defenderQueueKeyFromMarchDoc,
  reconcileDefenderQueue,
  runDefenderQueueSerialized,
} from './MarchDefenderQueueService';
import { tryStartNextMarchResolutionForQueueKey } from './MarchResolutionService';

let legacyResolvingSinceBackfillDone = false;
let watchdogInterval: ReturnType<typeof setInterval> | null = null;

/** One-shot per process: legacy `resolving` rows may lack `resolvingSince`; use `arriveAt` as fallback age. */
export async function backfillResolvingSinceOnLegacyRows(): Promise<void> {
  if (legacyResolvingSinceBackfillDone) {
    return;
  }
  const legacy = await AttackMarch.find({
    state: 'resolving',
    $or: [{ resolvingSince: { $exists: false } }, { resolvingSince: null }],
  })
    .select('marchId arriveAt')
    .lean();

  for (const m of legacy) {
    if (!m.marchId) {
      continue;
    }
    const since = m.arriveAt ? new Date(m.arriveAt) : new Date(0);
    await AttackMarch.updateOne({ marchId: m.marchId }, { $set: { resolvingSince: since } });
  }
  legacyResolvingSinceBackfillDone = true;
}

export async function runStaleResolvingMarchRecoveryOnce(): Promise<void> {
  await backfillResolvingSinceOnLegacyRows();

  const cutoff = new Date(Date.now() - STALE_RESOLVING_MARCH_MS);
  const stale = await AttackMarch.find({
    state: 'resolving',
    resolvingSince: { $lte: cutoff },
  }).lean();

  if (stale.length === 0) {
    return;
  }

  const battleService = new BattleService();

  for (const m of stale) {
    if (!m.marchId) {
      continue;
    }
    try {
      const battle = await Battle.findOne({
        sourceMarchId: m.marchId,
        phase: { $ne: BattlePhase.COMPLETE },
      })
        .select('battleId')
        .lean();

      if (battle?.battleId) {
        await battleService.abandonMarchBattleRuntimeNoSettlement(battle.battleId);
      }

      const refund = await systemRefundAttackMarchInState(m.marchId, String(m.attackerId), 'resolving');
      if (!refund.refunded) {
        console.warn('[MarchStaleResolving] refund not applied:', m.marchId, refund);
        continue;
      }

      console.error('[MarchStaleResolving] RECOVERED stale resolving march (ops visibility):', {
        marchId: m.marchId,
        attackerId: m.attackerId,
        defenderQueueKey: m.defenderQueueKey,
        battleId: battle?.battleId ?? null,
        staleMs: STALE_RESOLVING_MARCH_MS,
      });

      try {
        const qk = defenderQueueKeyFromMarchDoc(
          m as { defenderQueueKey?: string; defenderId: string; defenderNpcInstanceId?: string }
        );
        void runDefenderQueueSerialized(qk, async () => {
          await reconcileDefenderQueue(qk);
          await tryStartNextMarchResolutionForQueueKey(qk);
        });
      } catch (qkErr) {
        console.error('[MarchStaleResolving] queue reconcile after recovery failed:', m.marchId, qkErr);
      }
    } catch (e) {
      console.error('[MarchStaleResolving] recovery failed for march:', m.marchId, e);
    }
  }
}

export function startStaleResolvingMarchWatchdog(): void {
  if (watchdogInterval) {
    return;
  }
  watchdogInterval = setInterval(() => {
    void runStaleResolvingMarchRecoveryOnce().catch((err) =>
      console.error('[MarchStaleResolving] watchdog tick failed:', err)
    );
  }, STALE_RESOLVING_WATCHDOG_INTERVAL_MS);
}
