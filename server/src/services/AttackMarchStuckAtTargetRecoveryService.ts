/**
 * Hard recovery for marches stuck at the target: **`arrived` / `queued`** use wall-clock **`arriveAt`**;
 * **`resolving`** uses **`resolvingSince`** (when battle resolution started) so we do not refund based on
 * outbound travel time before the headless battle ran. Abandon non-complete battle, full refund → `cancelled`.
 * Runs on the march due sweep (multi-instance safe).
 */

import { AttackMarch } from '../models/AttackMarch';
import { Battle } from '../models/Battle';
import { ATTACK_MARCH_STUCK_AT_TARGET_MS, ENABLE_ASYNC_BATTLES } from '../config/env';
import { backfillResolvingSinceOnLegacyRows } from './MarchStaleResolvingWatchdogService';
import { BattlePhase } from '../types/battle';
import { BattleService } from './BattleService';
import { systemRefundAttackMarchInState } from './AttackMarchSystemRefundService';
import {
  defenderQueueKeyFromMarchDoc,
  reconcileDefenderQueue,
  runDefenderQueueSerialized,
} from './MarchDefenderQueueService';
import { tryStartNextMarchResolutionForQueueKey } from './MarchResolutionService';

const BATCH_LIMIT = 100;

export async function runStuckAtTargetRecoveryOnce(): Promise<void> {
  if (!ENABLE_ASYNC_BATTLES) {
    return;
  }

  await backfillResolvingSinceOnLegacyRows();

  const cutoff = new Date(Date.now() - ATTACK_MARCH_STUCK_AT_TARGET_MS);
  const rows = await AttackMarch.find({
    $or: [
      {
        state: { $in: ['arrived', 'queued'] },
        arriveAt: { $lte: cutoff },
      },
      {
        state: 'resolving',
        resolvingSince: { $lte: cutoff },
      },
    ],
  })
    .sort({ marchId: 1 })
    .limit(BATCH_LIMIT)
    .lean();

  if (rows.length === 0) {
    return;
  }

  const battleService = new BattleService();

  for (const m of rows) {
    if (!m.marchId) {
      continue;
    }
    const state = m.state as string;

    try {
      if (state === 'resolving') {
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
          console.warn('[MarchStuckAtTarget] resolving refund not applied:', m.marchId, refund);
          continue;
        }
        console.error('[MarchStuckAtTarget] RECOVERED (resolving):', m.marchId);
      } else if (state === 'arrived' || state === 'queued') {
        const refund = await systemRefundAttackMarchInState(
          m.marchId,
          String(m.attackerId),
          state
        );
        if (!refund.refunded) {
          console.warn('[MarchStuckAtTarget] arrived/queued refund not applied:', m.marchId, refund);
          continue;
        }
        console.error('[MarchStuckAtTarget] RECOVERED (arrived or queued):', m.marchId, state);
      } else {
        continue;
      }

      try {
        const qk = defenderQueueKeyFromMarchDoc(
          m as { defenderQueueKey?: string; defenderId: string; defenderNpcInstanceId?: string }
        );
        void runDefenderQueueSerialized(qk, async () => {
          await reconcileDefenderQueue(qk);
          await tryStartNextMarchResolutionForQueueKey(qk);
        });
      } catch (qkErr) {
        console.error('[MarchStuckAtTarget] queue reconcile after recovery failed:', m.marchId, qkErr);
      }
    } catch (e) {
      console.error('[MarchStuckAtTarget] recovery failed:', m.marchId, e);
    }
  }
}
