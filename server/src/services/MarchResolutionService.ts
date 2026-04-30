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
import { Map as MapModel } from '../models/Map';
import { findCellByNpcInstanceId, getCell } from './CellAccessorService';

export const MARCH_HEADLESS_BATTLE_WIDTH = 844;
export const MARCH_HEADLESS_BATTLE_HEIGHT = 390;

async function isNpcTargetMissingAtResolution(march: {
  defenderId: string;
  defenderNpcSlug?: string;
  defenderNpcInstanceId?: string;
  hackMapCellX?: number;
  hackMapCellY?: number;
}): Promise<boolean> {
  if (march.defenderId !== 'npc') {
    return false;
  }
  const npcSlug = String(march.defenderNpcSlug ?? '').trim();
  if (npcSlug === '') {
    return false;
  }

  const mapDoc = await MapModel.findOne({ name: 'main' });
  if (!mapDoc) {
    return false;
  }

  const npcInstanceId = String(march.defenderNpcInstanceId ?? '').trim();
  if (npcInstanceId !== '') {
    const byInstance = await findCellByNpcInstanceId(mapDoc, npcInstanceId, npcSlug);
    if (byInstance) {
      return false;
    }
  }

  const x = Number(march.hackMapCellX);
  const y = Number(march.hackMapCellY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return true;
  }
  const byCoords = await getCell(mapDoc, x, y);
  const matchesCoords =
    !!byCoords &&
    byCoords.occupiedBy === 'npc' &&
    String((byCoords as { npcSlug?: unknown }).npcSlug ?? '').trim() === npcSlug;
  return !matchesCoords;
}

async function reconcileMarchResolutionQueue(march: {
  marchId?: string;
  defenderQueueKey?: string;
  attackType?: string;
  defenderId: string;
  defenderNpcInstanceId?: string;
  bugInstanceId?: string;
}): Promise<void> {
  try {
    const qk = defenderQueueKeyFromMarchDoc(march);
    // IMPORTANT: do not call runDefenderQueueSerialized() recursively for the same queue key here.
    // This function is already executed inside the per-queue serialized task, and re-entering the
    // serializer with await can deadlock that queue (current task waiting on its own tail).
    await reconcileDefenderQueue(qk);
    await tryStartNextMarchResolutionForQueueKey(qk);
  } catch (queueErr) {
    console.error('[MarchResolution] post-failure queue reconcile failed:', march.marchId, queueErr);
  }
}

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
        'resolving',
        'bug-hunt-resolution-failed'
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

      await reconcileMarchResolutionQueue(updated);
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
        marchMeta,
        updated.hunterRosterId && updated.hunterVisualKey
          ? {
              hunterRosterId: String(updated.hunterRosterId),
              hunterVisualKey: String(updated.hunterVisualKey),
            }
          : undefined
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
        marchMeta,
        updated.hunterRosterId && updated.hunterVisualKey
          ? {
              hunterRosterId: String(updated.hunterRosterId),
              hunterVisualKey: String(updated.hunterVisualKey),
            }
          : undefined
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
    let targetMissingAtResolution = false;
    try {
      targetMissingAtResolution = await isNpcTargetMissingAtResolution(updated);
    } catch (targetMissingCheckErr) {
      console.error(
        '[MarchResolution] failed to verify NPC target presence during resolution error handling:',
        updated.marchId,
        targetMissingCheckErr
      );
    }
    if (targetMissingAtResolution) {
      const refunded = await systemRefundAttackMarchInState(
        updated.marchId,
        String(updated.attackerId),
        'resolving',
        'npc-target-missing-at-resolution'
      );
      if (refunded.refunded) {
        console.warn(
          '[MarchResolution] NPC target missing at resolution; refunded immediately:',
          updated.marchId,
          updated.defenderNpcInstanceId
        );
        await reconcileMarchResolutionQueue(updated);
        return;
      }
      console.error(
        '[MarchResolution] NPC target missing at resolution; immediate refund failed, falling back to arrived retry:',
        updated.marchId,
        refunded
      );
    }
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
