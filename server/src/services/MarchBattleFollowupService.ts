/**
 * After a march-sourced battle ends (NPC or PvP): march → `returning`, schedule return timer,
 * reconcile queue and try the next march resolution for the same defender key.
 */

import { AttackMarch } from '../models/AttackMarch';
import type { IBattleDocument } from '../models/Battle';
import {
  defenderQueueKeyFromMarchDoc,
  reconcileDefenderQueue,
  runDefenderQueueSerialized,
} from './MarchDefenderQueueService';
import { scheduleReturnMarchComplete } from './MarchArrivalSchedulerService';
import { tryStartNextMarchResolutionForQueueKey } from './MarchResolutionService';

export async function onMarchNpcBattleEnded(battle: IBattleDocument): Promise<void> {
  const marchSourced = (battle as { marchSourcedAttack?: boolean }).marchSourcedAttack === true;
  const sourceMarchId = (battle as { sourceMarchId?: string }).sourceMarchId;
  if (!marchSourced || !sourceMarchId || String(sourceMarchId).trim() === '') {
    return;
  }

  const marchId = String(sourceMarchId).trim();
  const march = await AttackMarch.findOne({ marchId, state: 'resolving' }).lean();
  if (!march) {
    return;
  }

  const travelMs = Math.ceil(Number(march.totalTravelSeconds) * 1000);
  if (!Number.isFinite(travelMs) || travelMs < 0) {
    throw new Error(`AttackMarch ${marchId} has invalid totalTravelSeconds for return leg`);
  }
  const returnArriveAt = new Date(Date.now() + travelMs);
  const qk = defenderQueueKeyFromMarchDoc(march);

  const r = await AttackMarch.updateOne(
    { marchId, state: 'resolving' },
    {
      $set: {
        state: 'returning',
        battleId: battle.battleId,
        resolvedAt: new Date(),
        returnArriveAt,
      },
      $unset: { resolvingSince: '' },
    }
  );
  if (r.modifiedCount === 0) {
    return;
  }

  scheduleReturnMarchComplete(marchId, returnArriveAt);

  await runDefenderQueueSerialized(qk, async () => {
    await reconcileDefenderQueue(qk);
    await tryStartNextMarchResolutionForQueueKey(qk);
  });
}
