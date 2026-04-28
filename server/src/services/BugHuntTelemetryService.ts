import { AttackMarch } from '../models/AttackMarch';
import { BugHuntTelemetryEvent, type BugHuntTelemetryEventType } from '../models/BugHuntTelemetryEvent';

type NumericMap = Record<string, number>;

function increment(map: NumericMap, key: string, amount = 1): void {
  map[key] = (map[key] ?? 0) + amount;
}

function toSafeNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export async function recordBugHuntTelemetryEvent(params: {
  eventType: BugHuntTelemetryEventType;
  userId?: string;
  marchId?: string;
  bugInstanceId?: string;
  occurredAt?: Date;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    await BugHuntTelemetryEvent.create({
      eventType: params.eventType,
      occurredAt: params.occurredAt ?? new Date(),
      userId: params.userId,
      marchId: params.marchId,
      bugInstanceId: params.bugInstanceId,
      data: params.data ?? {},
    });
  } catch (error) {
    console.error('[BugHuntTelemetry] failed to persist telemetry event:', params.eventType, error);
  }
}

async function detectKillStealForBugDeath(params: {
  bugInstanceId: string;
  winningMarchId: string;
  winningAttackerId: string;
}): Promise<boolean> {
  const priorDamageByOthers = await AttackMarch.countDocuments({
    attackType: 'bug_hunt',
    bugInstanceId: params.bugInstanceId,
    marchId: { $ne: params.winningMarchId },
    attackerId: { $ne: params.winningAttackerId },
    bugHuntEndReason: { $in: ['hunter-death', 'timeout'] },
    bugHuntRemainingHpPercent: { $lt: 100 },
  });
  return priorDamageByOthers > 0;
}

export async function recordBugHuntLaunchConfirmed(params: {
  userId: string;
  marchId: string;
  bugInstanceId: string;
  tokensSpent: number;
  totalTravelSeconds: number;
  travelSpeedupPercentApplied?: number;
}): Promise<void> {
  await recordBugHuntTelemetryEvent({
    eventType: 'launch_confirmed',
    userId: params.userId,
    marchId: params.marchId,
    bugInstanceId: params.bugInstanceId,
    data: {
      tokensSpent: params.tokensSpent,
      totalTravelSeconds: params.totalTravelSeconds,
      travelSpeedupPercentApplied: Math.max(0, Math.floor(Number(params.travelSpeedupPercentApplied ?? 0))),
    },
  });
}

export async function recordBugHuntBattleResolved(params: {
  userId: string;
  marchId: string;
  bugInstanceId: string;
  endReason: 'bug-death' | 'hunter-death' | 'timeout' | 'canceled';
  hunterSurvived: boolean;
  bugRemainingHpPercent: number;
  battleDurationSeconds: number;
}): Promise<void> {
  let isKillSteal = false;
  if (params.endReason === 'bug-death') {
    try {
      isKillSteal = await detectKillStealForBugDeath({
        bugInstanceId: params.bugInstanceId,
        winningMarchId: params.marchId,
        winningAttackerId: params.userId,
      });
    } catch (error) {
      console.error('[BugHuntTelemetry] kill-steal detection failed:', params.bugInstanceId, error);
    }
  }

  await recordBugHuntTelemetryEvent({
    eventType: 'battle_resolved',
    userId: params.userId,
    marchId: params.marchId,
    bugInstanceId: params.bugInstanceId,
    data: {
      endReason: params.endReason,
      hunterSurvived: params.hunterSurvived,
      bugRemainingHpPercent: params.bugRemainingHpPercent,
      battleDurationSeconds: params.battleDurationSeconds,
      ...(params.endReason === 'bug-death' ? { isKillSteal } : {}),
    },
  });
}

export async function recordBugHuntRewardGranted(params: {
  userId: string;
  marchId: string;
  bugInstanceId: string;
  itemKeys: string[];
  hunterXpGranted: number;
}): Promise<void> {
  await recordBugHuntTelemetryEvent({
    eventType: 'reward_granted',
    userId: params.userId,
    marchId: params.marchId,
    bugInstanceId: params.bugInstanceId,
    data: {
      itemKeys: params.itemKeys,
      hunterXpGranted: params.hunterXpGranted,
      itemCount: params.itemKeys.length,
    },
  });
}

export async function recordBugHuntStorageItemConsumed(params: {
  userId: string;
  itemKey: string;
  effect: 'cash' | 'speedup' | 'travel' | 'token';
}): Promise<void> {
  await recordBugHuntTelemetryEvent({
    eventType: 'storage_item_consumed',
    userId: params.userId,
    data: {
      itemKey: params.itemKey,
      effect: params.effect,
    },
  });
}

export async function getBugHuntTelemetrySummary(params: {
  lookbackHours: number;
}): Promise<Record<string, unknown>> {
  const now = Date.now();
  const windowStart = new Date(now - params.lookbackHours * 60 * 60 * 1000);
  const events = await BugHuntTelemetryEvent.find({
    occurredAt: { $gte: windowStart },
  })
    .select('eventType data')
    .lean();

  let launches = 0;
  let resolved = 0;
  let bugDeaths = 0;
  let killSteals = 0;
  let totalTokensSpent = 0;
  const endReasonCounts: NumericMap = {};
  const dropDistribution: NumericMap = {};
  const itemConsumptionByKey: NumericMap = {};
  const bugDeathDurations: number[] = [];

  for (const event of events) {
    const data = (event.data ?? {}) as Record<string, unknown>;
    if (event.eventType === 'launch_confirmed') {
      launches += 1;
      const spent = toSafeNumber(data.tokensSpent);
      if (spent !== null && spent > 0) {
        totalTokensSpent += spent;
      }
      continue;
    }

    if (event.eventType === 'battle_resolved') {
      resolved += 1;
      const endReason = String(data.endReason ?? '');
      if (endReason !== '') {
        increment(endReasonCounts, endReason);
      }
      if (endReason === 'bug-death') {
        bugDeaths += 1;
        if (data.isKillSteal === true) {
          killSteals += 1;
        }
        const duration = toSafeNumber(data.battleDurationSeconds);
        if (duration !== null && duration >= 0) {
          bugDeathDurations.push(duration);
        }
      }
      continue;
    }

    if (event.eventType === 'reward_granted') {
      const itemKeysRaw = data.itemKeys;
      if (Array.isArray(itemKeysRaw)) {
        for (const key of itemKeysRaw) {
          increment(dropDistribution, String(key));
        }
      }
      continue;
    }

    if (event.eventType === 'storage_item_consumed') {
      const itemKey = String(data.itemKey ?? '').trim();
      if (itemKey !== '') {
        increment(itemConsumptionByKey, itemKey);
      }
    }
  }

  let avgTimeToKillSeconds = null as number | null;
  let p50TimeToKillSeconds = null as number | null;
  if (bugDeathDurations.length > 0) {
    bugDeathDurations.sort((a, b) => a - b);
    const sum = bugDeathDurations.reduce((acc, n) => acc + n, 0);
    avgTimeToKillSeconds = Math.round((sum / bugDeathDurations.length) * 100) / 100;
    const mid = Math.floor((bugDeathDurations.length - 1) / 2);
    p50TimeToKillSeconds = bugDeathDurations[mid];
  }

  return {
    window: {
      lookbackHours: params.lookbackHours,
      fromUtc: windowStart.toISOString(),
      toUtc: new Date(now).toISOString(),
    },
    engagement: {
      launches,
      resolved,
      completionRate: launches > 0 ? Math.round((resolved / launches) * 10_000) / 100 : null,
      bugDeathRate: launches > 0 ? Math.round((bugDeaths / launches) * 10_000) / 100 : null,
    },
    balance: {
      endReasonCounts,
      timeToKill: {
        bugDeathsCount: bugDeathDurations.length,
        averageSeconds: avgTimeToKillSeconds,
        p50Seconds: p50TimeToKillSeconds,
      },
      killStealRatePercent: bugDeaths > 0 ? Math.round((killSteals / bugDeaths) * 10_000) / 100 : null,
      killStealSamples: killSteals,
    },
    economy: {
      totalTokensSpent,
      dropDistribution,
      itemConsumptionByKey,
    },
  };
}
