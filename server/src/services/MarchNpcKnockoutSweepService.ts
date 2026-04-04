/**
 * When a map NPC instance is defeated, refund all other attack marches still targeting that instance
 * (`outbound` / `arrived` / `queued`). The winning battle’s march stays `resolving` until normal follow-up.
 */

import { AttackMarch } from '../models/AttackMarch';
import { clearMarchArrivalTimer } from './MarchArrivalSchedulerService';
import { reconcileDefenderQueue, runDefenderQueueSerialized } from './MarchDefenderQueueService';
import {
  systemRefundAttackMarchInState,
  type RefundableMarchState,
} from './AttackMarchSystemRefundService';

function isRefundableState(s: string): s is RefundableMarchState {
  return s === 'outbound' || s === 'arrived' || s === 'queued';
}

/**
 * Call after the NPC tile has been cleared (e.g. `clearNpcInstanceFromMap`). Idempotent per march
 * (already-cancelled rows no longer match the query).
 */
export async function sweepQueuedMarchesAfterNpcInstanceDefeated(
  defenderNpcInstanceId: string
): Promise<void> {
  const id = String(defenderNpcInstanceId ?? '').trim();
  if (!id) {
    return;
  }

  const marches = await AttackMarch.find({
    defenderId: 'npc',
    defenderNpcInstanceId: id,
    state: { $in: ['outbound', 'arrived', 'queued'] },
  })
    .select('marchId attackerId state')
    .lean();

  const queueKey = `npc:${id}`;
  let refundedCount = 0;

  for (const m of marches) {
    if (!m.marchId || !isRefundableState(m.state)) {
      continue;
    }
    const result = await systemRefundAttackMarchInState(m.marchId, String(m.attackerId), m.state);
    if (!result.refunded) {
      if (result.reason !== 'state_mismatch') {
        console.warn('[MarchNpcKnockout] refund skipped:', m.marchId, result.reason);
      }
      continue;
    }
    refundedCount += 1;
    if (result.previousState === 'outbound') {
      clearMarchArrivalTimer(m.marchId);
    }
  }

  if (refundedCount > 0) {
    console.log(
      `[MarchNpcKnockout] Refunded ${refundedCount} march(es) for npc instance ${id}`
    );
  }

  try {
    void runDefenderQueueSerialized(queueKey, async () => {
      await reconcileDefenderQueue(queueKey);
      const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
      await tryStartNextMarchResolutionForQueueKey(queueKey);
    });
  } catch (e) {
    console.error('[MarchNpcKnockout] queue reconcile after sweep failed:', id, e);
  }
}
