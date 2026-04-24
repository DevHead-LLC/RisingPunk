/**
 * Claims FIFO `arrived` marches → `resolving` and starts a real battle on the timer engine (844×390).
 * NPC: `computer-opponent` + slug/instance. PvP: real `defenderId` + `marchMeta` for return leg / queue.
 */

import { ENABLE_ASYNC_BATTLES, ENABLE_HEADLESS_MARCH_BATTLE_RESOLUTION } from '../config/env';
import { AttackMarch } from '../models/AttackMarch';
import type { IBattleDocument } from '../models/Battle';
import type { AttackMarchArmySnapshot } from '../types/attackMarch';
import { BattleService } from './BattleService';
import { attachHeadlessWorkingBattle } from './HeadlessBattleRunner';
import { defenderQueueKeyFromMarchDoc, reconcileDefenderQueue } from './MarchDefenderQueueService';
import { systemRefundAttackMarchInState } from './AttackMarchSystemRefundService';

export const MARCH_HEADLESS_BATTLE_WIDTH = 844;
export const MARCH_HEADLESS_BATTLE_HEIGHT = 390;

export async function tryStartNextMarchResolutionForQueueKey(queueKey: string): Promise<void> {
  if (!ENABLE_ASYNC_BATTLES) {
    return;
  }

  const resolving = await AttackMarch.findOne({
    defenderQueueKey: queueKey,
    state: 'resolving',
  })
    .select('marchId')
    .lean();
  if (resolving) {
    return;
  }

  const head = await AttackMarch.findOne({
    defenderQueueKey: queueKey,
    state: 'arrived',
  })
    .sort({ arriveAt: 1, marchId: 1 })
    .lean();
  if (!head?.marchId) {
    return;
  }

  const updated = await AttackMarch.findOneAndUpdate(
    { marchId: head.marchId, state: 'arrived' },
    { $set: { state: 'resolving', resolvingSince: new Date() } },
    { new: true, lean: true }
  );
  if (!updated) {
    return;
  }
  if (updated.attackType === 'bug_hunt') {
    const bugResolutionAttempts = 3;
    let resolved = false;
    let lastBugResolutionError: unknown = null;
    for (let attempt = 1; attempt <= bugResolutionAttempts; attempt += 1) {
      try {
        const { resolveBugHuntMarch } = await import('./BugHuntBattleService');
        await resolveBugHuntMarch(updated.marchId);
        resolved = true;
        break;
      } catch (bugErr) {
        lastBugResolutionError = bugErr;
        console.error(
          '[MarchResolution] bug-hunt resolution attempt failed:',
          updated.marchId,
          `attempt=${attempt}/${bugResolutionAttempts}`,
          bugErr
        );
      }
    }
    if (!resolved) {
      const refund = await systemRefundAttackMarchInState(
        updated.marchId,
        String(updated.attackerId),
        'resolving'
      );
      if (!refund.refunded) {
        console.error(
          '[MarchResolution] bug-hunt resolution exhausted retries; refund failed, reverting march:',
          updated.marchId,
          refund,
          lastBugResolutionError
        );
        await AttackMarch.updateOne(
          { marchId: updated.marchId, state: 'resolving' },
          { $set: { state: 'arrived' }, $unset: { resolvingSince: '' } }
        );
      } else {
        console.error(
          '[MarchResolution] bug-hunt resolution exhausted retries; march refunded immediately:',
          updated.marchId,
          refund
        );
      }

      try {
        const qk = defenderQueueKeyFromMarchDoc(
          updated as {
            defenderQueueKey?: string;
            attackType?: string;
            defenderId: string;
            defenderNpcInstanceId?: string;
            bugInstanceId?: string;
          }
        );
        // IMPORTANT: do not call runDefenderQueueSerialized() recursively for the same queue key here.
        // This function is already executed inside the per-queue serialized task, and re-entering the
        // serializer with await can deadlock that queue (current task waiting on its own tail).
        await reconcileDefenderQueue(qk);
        await tryStartNextMarchResolutionForQueueKey(qk);
      } catch (queueErr) {
        console.error('[MarchResolution] bug-hunt post-failure queue reconcile failed:', updated.marchId, queueErr);
      }
    }
    return;
  }

  const snap = updated.armySnapshot as AttackMarchArmySnapshot | undefined;
  if (!snap?.battalions?.length) {
    console.error('[MarchResolution] invalid armySnapshot, reverting march:', updated.marchId);
    await AttackMarch.updateOne(
      { marchId: updated.marchId, state: 'resolving' },
      { $set: { state: 'arrived' }, $unset: { resolvingSince: '' } }
    );
    return;
  }

  const userBattalions = snap.battalions.map((b) => ({
    type: String(b.type),
    quantity: b.quantity,
    markLevel: b.markLevel ?? 1,
  }));

  const marchMeta = { marchSourcedAttack: true as const, sourceMarchId: updated.marchId };
  const battleService = new BattleService();
  let battle: IBattleDocument | undefined;
  try {
    if (updated.defenderId === 'npc') {
      battle = await battleService.createBattle(
        updated.attackerId,
        'computer-opponent',
        MARCH_HEADLESS_BATTLE_WIDTH,
        MARCH_HEADLESS_BATTLE_HEIGHT,
        userBattalions,
        updated.defenderNpcSlug,
        false,
        updated.defenderNpcInstanceId,
        updated.hackMapCellX,
        updated.hackMapCellY,
        marchMeta
      );
    } else {
      const defenderUserId = String(updated.defenderId).trim();
      if (defenderUserId === '') {
        throw new Error(`AttackMarch ${updated.marchId} has empty defenderId for PvP resolution`);
      }
      battle = await battleService.createBattle(
        updated.attackerId,
        defenderUserId,
        MARCH_HEADLESS_BATTLE_WIDTH,
        MARCH_HEADLESS_BATTLE_HEIGHT,
        userBattalions,
        undefined,
        false,
        undefined,
        updated.hackMapCellX,
        updated.hackMapCellY,
        marchMeta
      );
    }

    if (ENABLE_HEADLESS_MARCH_BATTLE_RESOLUTION) {
      attachHeadlessWorkingBattle(battle.battleId, battle);
      await battleService.triggerInitialTargeting(battle.battleId);
      await battleService.getTimerService().runSyntheticTicksToCompletion(battle.battleId);
    }
    try {
      const { attachSwarmBattleIdIfNeeded } = await import('./SwarmService');
      await attachSwarmBattleIdIfNeeded(battle.battleId);
    } catch (swarmAttachErr) {
      console.error('[MarchResolution] failed to attach swarm battle id:', battle.battleId, swarmAttachErr);
    }
  } catch (e) {
    console.error('[MarchResolution] createBattle or headless resolution failed, reverting march:', updated.marchId, e);
    if (battle?.battleId) {
      try {
        await battleService.abandonMarchBattleRuntimeNoSettlement(battle.battleId);
      } catch (abandonErr) {
        console.error('[MarchResolution] abandonMarchBattleRuntimeNoSettlement failed:', battle.battleId, abandonErr);
      }
    }
    await AttackMarch.updateOne(
      { marchId: updated.marchId, state: 'resolving' },
      { $set: { state: 'arrived' }, $unset: { resolvingSince: '' } }
    );
  }
}
