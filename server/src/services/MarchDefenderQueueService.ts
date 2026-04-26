import { AttackMarch } from '../models/AttackMarch';
import type { ResolvedMarchLaunchTarget } from './MarchTargetValidationService';

/** Serialize reconciles per defender queue key (single Node process). */
const mutexTail = new Map<string, Promise<void>>();

export function runDefenderQueueSerialized(queueKey: string, task: () => Promise<void>): Promise<void> {
  const prev = mutexTail.get(queueKey) ?? Promise.resolve();
  const next = prev.then(task).catch((e) => {
    console.error('[MarchDefenderQueue] serialized task failed:', queueKey, e);
  });
  mutexTail.set(queueKey, next);
  void next.finally(() => {
    if (mutexTail.get(queueKey) === next) {
      mutexTail.delete(queueKey);
    }
  });
  return next;
}

export function defenderQueueKeyForLaunchTarget(target: ResolvedMarchLaunchTarget): string {
  if (target.attackMarchDefenderId === 'bug') {
    const bugId = String(target.bugInstanceId ?? '').trim();
    if (!bugId) {
      throw new Error('Bug-hunt march requires bugInstanceId for defender queue');
    }
    return `bug:${bugId}`;
  }
  if (target.attackMarchDefenderId === 'npc') {
    const id = target.defenderNpcInstanceId;
    if (id == null || String(id).trim() === '') {
      throw new Error('NPC attack march requires defenderNpcInstanceId for defender queue');
    }
    return `npc:${String(id).trim()}`;
  }
  const uid = String(target.attackMarchDefenderId).trim();
  if (!uid) {
    throw new Error('PvP attack march requires defender user id for defender queue');
  }
  return `pvp:${uid}`;
}

export function defenderQueueKeyFromMarchDoc(m: {
  defenderQueueKey?: string;
  attackType?: string;
  defenderId: string;
  defenderNpcInstanceId?: string;
  bugInstanceId?: string;
}): string {
  if (m.defenderQueueKey && String(m.defenderQueueKey).trim() !== '') {
    return String(m.defenderQueueKey).trim();
  }
  if (m.attackType === 'bug_hunt' || m.defenderId === 'bug') {
    const bugId = String(m.bugInstanceId ?? '').trim();
    if (!bugId) {
      throw new Error('Bug-hunt march missing defenderQueueKey and bugInstanceId');
    }
    return `bug:${bugId}`;
  }
  if (m.defenderId === 'npc') {
    const id = m.defenderNpcInstanceId;
    if (id == null || String(id).trim() === '') {
      throw new Error('AttackMarch missing defenderQueueKey and defenderNpcInstanceId');
    }
    return `npc:${String(id).trim()}`;
  }
  return `pvp:${String(m.defenderId).trim()}`;
}

/**
 * One `resolving` march per `defenderQueueKey`. FIFO by `arriveAt`, then `marchId`.
 * - If any `resolving`: all `arrived`/`queued` → `queued`.
 * - Else: first → `arrived`, rest → `queued`.
 *
 * Does **not** start battles — `MarchResolutionService.tryStartNextMarchResolutionForQueueKey` runs after reconcile
 * from arrival, return-complete, and outbound cancel paths.
 */
export async function reconcileDefenderQueue(queueKey: string): Promise<void> {
  const resolving = await AttackMarch.findOne({
    defenderQueueKey: queueKey,
    state: 'resolving',
  })
    .select('marchId')
    .lean();

  const candidates = await AttackMarch.find({
    defenderQueueKey: queueKey,
    state: { $in: ['arrived', 'queued'] },
  })
    .select('marchId state arriveAt')
    .sort({ arriveAt: 1, marchId: 1 })
    .lean();

  if (candidates.length === 0) {
    return;
  }

  if (resolving) {
    for (const c of candidates) {
      if (c.state !== 'queued' && c.marchId) {
        await AttackMarch.updateOne({ marchId: c.marchId, state: { $in: ['arrived', 'queued'] } }, { $set: { state: 'queued' } });
      }
    }
    return;
  }

  for (let i = 0; i < candidates.length; i++) {
    const want: 'arrived' | 'queued' = i === 0 ? 'arrived' : 'queued';
    const c = candidates[i];
    if (!c.marchId || c.state === want) continue;
    await AttackMarch.updateOne(
      { marchId: c.marchId, state: { $in: ['arrived', 'queued'] } },
      { $set: { state: want } }
    );
  }
}
