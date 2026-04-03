import { ENABLE_ASYNC_BATTLES } from '../config/env';
import { AttackMarch } from '../models/AttackMarch';
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
      { $set: { state: 'arrived' } },
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
      console.log(`[MarchArrival] ${marchId} → arrived (queue reconciled)`);
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
  if (marches.length > 0) {
    console.log(`[MarchArrival] Rescheduled ${marches.length} outbound march(es)`);
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
    const updated = await AttackMarch.findOneAndUpdate(
      { marchId, state: 'returning' },
      { $set: { state: 'done' } },
      { new: true, lean: true }
    );
    if (!updated) {
      return;
    }
    const qk = defenderQueueKeyFromMarchDoc(
      updated as { defenderQueueKey?: string; defenderId: string; defenderNpcInstanceId?: string }
    );
    await runDefenderQueueSerialized(qk, async () => {
      await reconcileDefenderQueue(qk);
      const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
      await tryStartNextMarchResolutionForQueueKey(qk);
    });
    console.log(`[MarchReturn] ${marchId} → done`);
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
  if (marches.length > 0) {
    console.log(`[MarchReturn] Rescheduled ${marches.length} returning march(es)`);
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
  let n = 0;
  for (const qk of keys) {
    const key = String(qk ?? '').trim();
    if (!key) continue;
    n += 1;
    void runDefenderQueueSerialized(key, async () => {
      const { tryStartNextMarchResolutionForQueueKey } = await import('./MarchResolutionService');
      await tryStartNextMarchResolutionForQueueKey(key);
    });
  }
  if (n > 0) {
    console.log(`[MarchResolution] Boot catch-up queued for ${n} defender queue key(s) with arrived marches`);
  }
}
