import mongoose from 'mongoose';
import {
  ATTACK_MARCH_DUE_SWEEP_INTERVAL_MS,
  ATTACK_MARCH_STALE_ARRIVED_MS,
  ENABLE_ASYNC_BATTLES,
} from '../config/env';
import { runStuckAtTargetRecoveryOnce } from './AttackMarchStuckAtTargetRecoveryService';
import { AttackMarch } from '../models/AttackMarch';
import type { AttackMarchArmySnapshot } from '../types/attackMarch';
import { consumedRowsMatchArmySnapshot } from './AttackMarchLaunchService';
import { restoreCommittedMarchArmyToUserBots } from './AttackMarchSystemRefundService';
import {
  defenderQueueKeyFromMarchDoc,
  reconcileDefenderQueue,
  runDefenderQueueSerialized,
} from './MarchDefenderQueueService';

const timersByMarchId = new Map<string, ReturnType<typeof setTimeout>>();
const returnTimersByMarchId = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * In-process timers for outbound → `arrived` (Phase 1). One Node process only — multi-instance
 * deployments need a shared scheduler (poll `arriveAt` or queue) later.
 */
export async function processMarchArrival(marchId: string): Promise<void> {
  clearMarchArrivalTimer(marchId);
  try {
    const updated = await AttackMarch.findOneAndUpdate(
      { marchId, state: 'outbound' },
      { $set: { state: 'arrived', atTargetSince: new Date() } },
      { new: true, lean: true }
    );
    if (updated) {
      try {
        const qk = defenderQueueKeyFromMarchDoc(
          updated as { defenderQueueKey?: string; defenderId: string; defenderNpcInstanceId?: string }
        );
        await runDefenderQueueSerialized(qk, async () => {
          await reconcileDefenderQueue(qk);
          const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
          await tryStartNextMarchResolutionForQueueKey(qk);
        });
      } catch (e) {
        console.error('[MarchArrival] defender queue reconcile skipped:', marchId, e);
      }
    }
  } catch (e) {
    console.error('[MarchArrival] processMarchArrival failed:', marchId, e);
  }
}

export function clearMarchArrivalTimer(marchId: string): void {
  const t = timersByMarchId.get(marchId);
  if (t) {
    clearTimeout(t);
    timersByMarchId.delete(marchId);
  }
}

export function scheduleMarchArrival(marchId: string, arriveAt: Date): void {
  clearMarchArrivalTimer(marchId);
  const delayMs = Math.max(0, arriveAt.getTime() - Date.now());
  const t = setTimeout(() => {
    timersByMarchId.delete(marchId);
    void processMarchArrival(marchId);
  }, delayMs);
  timersByMarchId.set(marchId, t);
}

/**
 * PvP: defender moved map tile (YOU or property). Outbound marches that still targeted their old
 * cell get `arriveAt` = now, target coords updated to the new cell, timer cleared, then the normal
 * arrival → queue → resolve pipeline runs ([Resolved: defender and target during outbound march]).
 */
export async function applyPvPDefenderRelocateInstantArrival(
  defenderUserId: string,
  newCellX: number,
  newCellY: number
): Promise<void> {
  if (!ENABLE_ASYNC_BATTLES) {
    return;
  }
  const uid = String(defenderUserId).trim();
  if (uid === '' || uid === 'npc') {
    return;
  }
  if (!Number.isFinite(newCellX) || !Number.isFinite(newCellY)) {
    console.error('[MarchPvPRelocate] invalid new cell coordinates', newCellX, newCellY);
    return;
  }
  const nx = Math.trunc(newCellX);
  const ny = Math.trunc(newCellY);
  const now = new Date();
  const rows = await AttackMarch.find({
    defenderId: uid,
    state: 'outbound',
    $or: [{ hackMapCellX: { $ne: nx } }, { hackMapCellY: { $ne: ny } }],
  })
    .select('marchId')
    .sort({ arriveAt: 1, marchId: 1 })
    .lean();

  for (const row of rows) {
    const mid = row.marchId;
    if (!mid) continue;
    const r = await AttackMarch.updateOne(
      { marchId: mid, state: 'outbound', defenderId: uid },
      {
        $set: {
          arriveAt: now,
          targetX: nx,
          targetY: ny,
          hackMapCellX: nx,
          hackMapCellY: ny,
        },
      }
    );
    if (r.modifiedCount > 0) {
      clearMarchArrivalTimer(mid);
      await processMarchArrival(mid);
    }
  }
}

/**
 * Same as {@link applyPvPDefenderRelocateInstantArrival} but never throws — map routes call this after
 * the cell write succeeded so a march hook failure is logged without failing the HTTP response.
 */
export async function safeApplyPvPDefenderRelocateInstantArrival(
  defenderUserId: string,
  newCellX: number,
  newCellY: number,
  logContext: string
): Promise<void> {
  try {
    await applyPvPDefenderRelocateInstantArrival(defenderUserId, newCellX, newCellY);
  } catch (e) {
    console.error(`[MarchPvPRelocate] ${logContext}:`, e);
  }
}

/**
 * After DB reconnect / process start: schedule all outbound marches; overdue → process immediately.
 */
export async function rescheduleAllOutboundMarches(): Promise<void> {
  const marches = await AttackMarch.find({ state: 'outbound' }).select('marchId arriveAt').lean();
  const now = Date.now();
  for (const m of marches) {
    if (!m.marchId || !m.arriveAt) continue;
    const at = new Date(m.arriveAt).getTime();
    if (at <= now) {
      void processMarchArrival(m.marchId);
    } else {
      scheduleMarchArrival(m.marchId, new Date(m.arriveAt));
    }
  }
}

export function clearReturnMarchTimer(marchId: string): void {
  const t = returnTimersByMarchId.get(marchId);
  if (t) {
    clearTimeout(t);
    returnTimersByMarchId.delete(marchId);
  }
}

export async function processReturnMarchComplete(marchId: string): Promise<void> {
  clearReturnMarchTimer(marchId);
  try {
    type PrevRow = {
      attackerId: string;
      defenderId: string;
      defenderNpcInstanceId?: string;
      defenderQueueKey?: string;
      returningAfterCancel?: boolean;
      attackType?: string;
      swarmSessionId?: string;
      consumedBattalionAssignments: unknown;
      armySnapshot: unknown;
    };

    let prevOut: PrevRow | null = null;
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const session = await mongoose.startSession();
      try {
        let settled: PrevRow | null = null;
        await session.withTransaction(async () => {
          const cur = (await AttackMarch.findOne({ marchId, state: 'returning' }).session(session).lean()) as
            | (PrevRow & { _id: unknown })
            | null;

          if (!cur) {
            return;
          }
          settled = cur;

          if (cur.returningAfterCancel === true) {
            const armySnap = cur.armySnapshot as AttackMarchArmySnapshot;
            if (!armySnap?.battalions || !Array.isArray(armySnap.battalions)) {
              throw new Error('MARCH_CANCEL_RETURN_INTEGRITY');
            }
            const consumed = cur.consumedBattalionAssignments as Array<{
              battalionId: string;
              botType: string;
              quantity: number;
              markLevel?: number;
            }>;
            const isSwarmMarch =
              cur.attackType === 'swarm' ||
              (typeof cur.swarmSessionId === 'string' && cur.swarmSessionId.trim() !== '');
            const consumedMissing = !Array.isArray(consumed) || consumed.length === 0;

            if (isSwarmMarch && consumedMissing) {
              const sid = cur.swarmSessionId;
              if (!sid || String(sid).trim() === '') {
                throw new Error('MARCH_CANCEL_RETURN_INTEGRITY');
              }
              const { restoreSwarmCommitmentsOnMarchCancelReturn } = await import('./SwarmService');
              await restoreSwarmCommitmentsOnMarchCancelReturn({
                marchId,
                swarmSessionId: String(sid),
                session,
              });
            } else {
              if (consumedMissing) {
                throw new Error('MARCH_CANCEL_RETURN_INTEGRITY');
              }
              if (!consumedRowsMatchArmySnapshot(consumed, armySnap)) {
                throw new Error('MARCH_CANCEL_RETURN_INTEGRITY');
              }
              await restoreCommittedMarchArmyToUserBots({
                attackerId: String(cur.attackerId),
                armySnap,
                consumed,
                session,
              });
            }
          }

          const r = await AttackMarch.updateOne(
            { _id: cur._id, state: 'returning' },
            {
              $set: { state: 'done' },
              $unset: { returningAfterCancel: '', returnLegStartX: '', returnLegStartY: '' },
            },
            { session }
          );
          if (r.modifiedCount === 0) {
            throw new Error('MARCH_RETURN_STATE_RACE');
          }
        });

        prevOut = settled;
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === 'BOT_VERSION_CONFLICT') {
          continue;
        }
        console.error('[MarchReturn] processReturnMarchComplete transaction error:', marchId, e);
        return;
      } finally {
        session.endSession();
      }
    }

    if (!prevOut) {
      return;
    }

    const qk = defenderQueueKeyFromMarchDoc(
      prevOut as { defenderQueueKey?: string; defenderId: string; defenderNpcInstanceId?: string }
    );
    await runDefenderQueueSerialized(qk, async () => {
      await reconcileDefenderQueue(qk);
      const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
      await tryStartNextMarchResolutionForQueueKey(qk);
    });
  } catch (e) {
    console.error('[MarchReturn] processReturnMarchComplete failed:', marchId, e);
  }
}

export function scheduleReturnMarchComplete(marchId: string, returnArriveAt: Date): void {
  clearReturnMarchTimer(marchId);
  const delayMs = Math.max(0, returnArriveAt.getTime() - Date.now());
  const t = setTimeout(() => {
    returnTimersByMarchId.delete(marchId);
    void processReturnMarchComplete(marchId);
  }, delayMs);
  returnTimersByMarchId.set(marchId, t);
}

/**
 * After DB reconnect / process start: schedule return-leg timers; overdue → process immediately.
 */
export async function rescheduleAllReturningMarches(): Promise<void> {
  const marches = await AttackMarch.find({ state: 'returning' }).select('marchId returnArriveAt').lean();
  const now = Date.now();
  for (const m of marches) {
    if (!m.marchId || !m.returnArriveAt) continue;
    const at = new Date(m.returnArriveAt).getTime();
    if (at <= now) {
      void processReturnMarchComplete(m.marchId);
    } else {
      scheduleReturnMarchComplete(m.marchId, new Date(m.returnArriveAt));
    }
  }
}

/**
 * After restart: any march stuck in `arrived` (no in-process tryStart ran) should claim resolution.
 */
export async function rescheduleArrivedMarchBattleStarts(): Promise<void> {
  const keys = await AttackMarch.distinct('defenderQueueKey', {
    state: 'arrived',
    defenderQueueKey: { $exists: true, $nin: [null, ''] },
  });
  for (const qk of keys) {
    const key = String(qk ?? '').trim();
    if (!key) continue;
    void runDefenderQueueSerialized(key, async () => {
      const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
      await tryStartNextMarchResolutionForQueueKey(key);
    });
  }
}

const DUE_SWEEP_BATCH_LIMIT = 100;
let dueSweepInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Catches marches whose `setTimeout` lived on another instance or was lost on crash/deploy.
 * Safe to run on every instance; `processMarchArrival` / `processReturnMarchComplete` are state-checked.
 */
export async function sweepAttackMarchesPastDueDates(): Promise<void> {
  if (!ENABLE_ASYNC_BATTLES) {
    return;
  }
  const now = new Date();

  const overdueOutbound = await AttackMarch.find({
    state: 'outbound',
    arriveAt: { $lte: now },
  })
    .select('marchId')
    .sort({ arriveAt: 1, marchId: 1 })
    .limit(DUE_SWEEP_BATCH_LIMIT)
    .lean();

  for (const m of overdueOutbound) {
    if (m.marchId) {
      void processMarchArrival(m.marchId);
    }
  }

  const overdueReturning = await AttackMarch.find({
    state: 'returning',
    returnArriveAt: { $lte: now },
  })
    .select('marchId')
    .sort({ returnArriveAt: 1, marchId: 1 })
    .limit(DUE_SWEEP_BATCH_LIMIT)
    .lean();

  for (const m of overdueReturning) {
    if (m.marchId) {
      void processReturnMarchComplete(m.marchId);
    }
  }

  const arrivedStaleCutoff = new Date(Date.now() - ATTACK_MARCH_STALE_ARRIVED_MS);
  const staleQueueKeys = await AttackMarch.distinct('defenderQueueKey', {
    state: { $in: ['arrived', 'queued'] },
    arriveAt: { $lte: arrivedStaleCutoff },
    defenderQueueKey: { $exists: true, $nin: [null, ''] },
  });

  for (const qk of staleQueueKeys) {
    const key = String(qk ?? '').trim();
    if (!key) {
      continue;
    }
    void runDefenderQueueSerialized(key, async () => {
      await reconcileDefenderQueue(key);
      const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
      await tryStartNextMarchResolutionForQueueKey(key);
    });
  }

  await runStuckAtTargetRecoveryOnce();
}

export function startAttackMarchDueSweepWatchdog(): void {
  if (!ENABLE_ASYNC_BATTLES || dueSweepInterval) {
    return;
  }
  dueSweepInterval = setInterval(() => {
    void sweepAttackMarchesPastDueDates().catch((err) =>
      console.error('[MarchDueSweep] tick failed:', err)
    );
  }, ATTACK_MARCH_DUE_SWEEP_INTERVAL_MS);
}
