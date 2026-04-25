import { AttackMarch } from '../models/AttackMarch';
import { STALE_RESOLVING_MARCH_MS } from '../config/env';

const QUEUED_STALE_MS = 5 * 60 * 1000;
const ARRIVED_STALE_MS = 2 * 60 * 1000;

function isDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

type MarchRow = {
  marchId?: string;
  state?: string;
  departAt?: Date;
  arriveAt?: Date;
  resolvedAt?: Date;
  returnArriveAt?: Date;
  resolvingSince?: Date;
  totalTravelSeconds?: number;
  defenderQueueKey?: string;
  bugHuntEndReason?: string;
  bugHuntItemDrops?: string[];
  bugHuntHunterXpGranted?: number;
};

export async function getBugHuntOperationalChecks(params?: {
  sampleLimit?: number;
}): Promise<Record<string, unknown>> {
  const nowMs = Date.now();
  const sampleLimit = Math.max(1, Math.min(100, Math.floor(params?.sampleLimit ?? 25)));

  const bugHuntMarches = (await AttackMarch.find({ attackType: 'bug_hunt' })
    .select(
      'marchId state departAt arriveAt resolvedAt returnArriveAt resolvingSince totalTravelSeconds defenderQueueKey bugHuntEndReason bugHuntItemDrops bugHuntHunterXpGranted'
    )
    .lean()) as MarchRow[];

  const staleOutbound: string[] = [];
  const staleArrived: string[] = [];
  const staleQueued: string[] = [];
  const staleResolving: string[] = [];
  const returningWithoutArrival: string[] = [];
  const terminalWithoutResolvedAt: string[] = [];
  const rewardShapeAnomalies: string[] = [];

  for (const march of bugHuntMarches) {
    const marchId = String(march.marchId ?? '').trim();
    if (marchId === '') {
      continue;
    }

    if (march.state === 'outbound' && isDate(march.departAt)) {
      const travelMs = Math.max(0, Math.ceil(Number(march.totalTravelSeconds ?? 0) * 1000));
      const staleThresholdMs = travelMs + 60_000;
      if (nowMs - march.departAt.getTime() > staleThresholdMs) {
        staleOutbound.push(marchId);
      }
    }

    if (march.state === 'arrived' && isDate(march.arriveAt) && nowMs - march.arriveAt.getTime() > ARRIVED_STALE_MS) {
      staleArrived.push(marchId);
    }

    if (march.state === 'queued' && isDate(march.arriveAt) && nowMs - march.arriveAt.getTime() > QUEUED_STALE_MS) {
      staleQueued.push(marchId);
    }

    if (
      march.state === 'resolving' &&
      isDate(march.resolvingSince) &&
      nowMs - march.resolvingSince.getTime() > STALE_RESOLVING_MARCH_MS
    ) {
      staleResolving.push(marchId);
    }

    if (march.state === 'returning') {
      if (!isDate(march.returnArriveAt)) {
        returningWithoutArrival.push(marchId);
      }
    }

    if (
      (march.state === 'returning' || march.state === 'done' || march.state === 'cancelled') &&
      !isDate(march.resolvedAt)
    ) {
      terminalWithoutResolvedAt.push(marchId);
    }

    const hunterXp = Number(march.bugHuntHunterXpGranted ?? 0);
    const dropCount = Array.isArray(march.bugHuntItemDrops) ? march.bugHuntItemDrops.length : 0;
    if (hunterXp > 0 && dropCount <= 0) {
      rewardShapeAnomalies.push(`${marchId}:xp-without-drops`);
    }
    if (march.bugHuntEndReason === 'bug-death' && hunterXp <= 0) {
      rewardShapeAnomalies.push(`${marchId}:bug-death-without-xp`);
    }
    if (march.state === 'cancelled' && hunterXp > 0) {
      rewardShapeAnomalies.push(`${marchId}:cancelled-with-xp`);
    }
  }

  const duplicateResolving = await AttackMarch.aggregate<{ _id: string; count: number; marchIds: string[] }>([
    { $match: { attackType: 'bug_hunt', state: 'resolving' } },
    { $group: { _id: '$defenderQueueKey', count: { $sum: 1 }, marchIds: { $push: '$marchId' } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    checkedAtUtc: new Date(nowMs).toISOString(),
    totals: {
      bugHuntMarches: bugHuntMarches.length,
      staleOutbound: staleOutbound.length,
      staleArrived: staleArrived.length,
      staleQueued: staleQueued.length,
      staleResolving: staleResolving.length,
      returningWithoutReturnArriveAt: returningWithoutArrival.length,
      terminalWithoutResolvedAt: terminalWithoutResolvedAt.length,
      rewardShapeAnomalies: rewardShapeAnomalies.length,
      duplicateResolvingQueues: duplicateResolving.length,
    },
    samples: {
      staleOutbound: staleOutbound.slice(0, sampleLimit),
      staleArrived: staleArrived.slice(0, sampleLimit),
      staleQueued: staleQueued.slice(0, sampleLimit),
      staleResolving: staleResolving.slice(0, sampleLimit),
      returningWithoutReturnArriveAt: returningWithoutArrival.slice(0, sampleLimit),
      terminalWithoutResolvedAt: terminalWithoutResolvedAt.slice(0, sampleLimit),
      rewardShapeAnomalies: rewardShapeAnomalies.slice(0, sampleLimit),
      duplicateResolvingQueues: duplicateResolving.slice(0, sampleLimit).map((row) => ({
        queueKey: row._id,
        count: row.count,
        marchIds: row.marchIds.slice(0, sampleLimit),
      })),
    },
    thresholdsMs: {
      staleArrived: ARRIVED_STALE_MS,
      staleQueued: QUEUED_STALE_MS,
      staleResolving: STALE_RESOLVING_MARCH_MS,
      staleOutboundPadding: 60_000,
    },
  };
}
