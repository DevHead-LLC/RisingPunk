import { ClientSession } from 'mongoose';
import { UserHunter } from '../models/UserHunter';
import { UserBugHuntState } from '../models/UserBugHuntState';
import { HunterProgressionService } from './HunterProgressionService';
import {
  resolveEffectiveBugHuntTokenConfig,
} from './BugHuntTokenService';

const ANT_BUG_HUNTER_XP_ON_FULL_DEFEAT = 50_000;
const ANT_BUG_DROP_MIN = 1;
const ANT_BUG_DROP_MAX = 3;

type AntDropTier = {
  itemKey:
    | 'bug_hunt_cash_pack_20000'
    | 'bug_hunt_travel_speedup_25_percent'
    | 'bug_hunt_cash_pack_10000'
    | 'bug_hunt_cash_pack_5000'
    | 'bug_hunt_cash_pack_1000'
    | 'bug_hunt_research_speedup_5m'
    | 'bug_hunt_construction_speedup_5m'
    | 'bug_hunt_bot_assembly_speedup_5m'
    | 'bug_hunt_research_speedup_1m'
    | 'bug_hunt_construction_speedup_1m'
    | 'bug_hunt_bot_assembly_speedup_1m';
  probability: number;
};

const TIER_5M_SPEEDUPS: readonly AntDropTier['itemKey'][] = [
  'bug_hunt_research_speedup_5m',
  'bug_hunt_construction_speedup_5m',
  'bug_hunt_bot_assembly_speedup_5m',
];

const TIER_1M_SPEEDUPS: readonly AntDropTier['itemKey'][] = [
  'bug_hunt_research_speedup_1m',
  'bug_hunt_construction_speedup_1m',
  'bug_hunt_bot_assembly_speedup_1m',
];

function randomChoice<T>(values: readonly T[]): T {
  if (values.length === 0) {
    throw new Error('Cannot choose from an empty list');
  }
  const idx = Math.floor(Math.random() * values.length);
  return values[idx];
}

function resolveAntItemDrops(): AntDropTier['itemKey'][] {
  const tiers: Array<AntDropTier | { probability: number; pickSpeedup: '5m' | '1m' }> = [
    { itemKey: 'bug_hunt_cash_pack_20000', probability: 0.02 },
    { itemKey: 'bug_hunt_travel_speedup_25_percent', probability: 0.05 },
    { itemKey: 'bug_hunt_cash_pack_10000', probability: 0.05 },
    { probability: 0.15, pickSpeedup: '5m' },
    { itemKey: 'bug_hunt_cash_pack_5000', probability: 0.15 },
    { itemKey: 'bug_hunt_cash_pack_1000', probability: 0.4 },
    { probability: 0.4, pickSpeedup: '1m' },
  ];

  const drops: AntDropTier['itemKey'][] = [];
  for (const tier of tiers) {
    if (drops.length >= ANT_BUG_DROP_MAX) {
      break;
    }
    if (Math.random() > tier.probability) {
      continue;
    }
    if ('itemKey' in tier) {
      drops.push(tier.itemKey);
      continue;
    }
    drops.push(
      tier.pickSpeedup === '5m'
        ? randomChoice(TIER_5M_SPEEDUPS)
        : randomChoice(TIER_1M_SPEEDUPS)
    );
  }

  if (drops.length >= ANT_BUG_DROP_MIN) {
    return drops;
  }

  // Min-1 floor: forced 1-minute speedup with random subtype.
  return [randomChoice(TIER_1M_SPEEDUPS)];
}

function splitTotalEvenly(total: number, orderedKeys: string[]): Map<string, number> {
  if (!Number.isInteger(total) || total <= 0) {
    throw new Error('XP split total must be a positive integer');
  }
  if (orderedKeys.length === 0) {
    throw new Error('XP split requires at least one recipient');
  }
  const base = Math.floor(total / orderedKeys.length);
  let remainder = total % orderedKeys.length;
  const out = new Map<string, number>();
  for (const key of orderedKeys) {
    const extra = remainder > 0 ? 1 : 0;
    out.set(key, base + extra);
    if (remainder > 0) {
      remainder -= 1;
    }
  }
  return out;
}

type RewardXpGrant = { hunterRosterId: string; xpGranted: number };
export type AntBugDefeatRewardResult = {
  itemKeysGranted: string[];
  hunterXpTotalGranted: number;
  hunterXpGrants: RewardXpGrant[];
};

export async function grantAntBugDefeatRewards(params: {
  userId: string;
  hunterRosterIds: string[];
  session: ClientSession;
}): Promise<AntBugDefeatRewardResult> {
  const { userId, session } = params;
  const rosterIds = [...new Set(params.hunterRosterIds.map((id) => String(id).trim()))]
    .filter((id) => id !== '')
    .sort((a, b) => a.localeCompare(b));
  if (rosterIds.length === 0) {
    throw new Error('Full-defeat rewards require at least one hunter roster id');
  }

  const itemKeysGranted = resolveAntItemDrops();
  const xpByRoster = splitTotalEvenly(ANT_BUG_HUNTER_XP_ON_FULL_DEFEAT, rosterIds);
  const hunterXpGrants: RewardXpGrant[] = [];

  for (const rosterId of rosterIds) {
    const xpRaw = xpByRoster.get(rosterId);
    if (!Number.isInteger(xpRaw) || (xpRaw ?? 0) <= 0) {
      throw new Error(`Missing XP grant for roster '${rosterId}'`);
    }
    const xp = xpRaw as number;
    const hunterDoc = await UserHunter.findOne({
      userId,
      hunterRosterId: rosterId,
    }).session(session);
    if (!hunterDoc) {
      throw new Error(`Cannot grant hunter XP: roster '${rosterId}' is not unlocked for user`);
    }
    const next = HunterProgressionService.applyExperience(
      {
        level: hunterDoc.level,
        currentExp: hunterDoc.currentExp,
        nextLevelExp: hunterDoc.nextLevelExp,
        totalExp: hunterDoc.totalExp,
      },
      xp
    );
    hunterDoc.level = next.level;
    hunterDoc.currentExp = next.currentExp;
    hunterDoc.nextLevelExp = next.nextLevelExp;
    hunterDoc.totalExp = next.totalExp;
    await hunterDoc.save({ session });
    hunterXpGrants.push({ hunterRosterId: rosterId, xpGranted: xp });
  }

  const state = await UserBugHuntState.findOne({ userId }).session(session);
  const inventoryMap = new Map<string, number>();
  if (state) {
    for (const row of state.storageItems ?? []) {
      inventoryMap.set(row.itemKey, row.quantity);
    }
  }
  for (const itemKey of itemKeysGranted) {
    inventoryMap.set(itemKey, (inventoryMap.get(itemKey) ?? 0) + 1);
  }
  const storageItems = [...inventoryMap.entries()]
    .map(([itemKey, quantity]) => ({ itemKey, quantity }))
    .sort((a, b) => a.itemKey.localeCompare(b.itemKey));

  if (state) {
    state.storageItems = storageItems;
    await state.save({ session });
  } else {
    const effectiveTokenConfig = await resolveEffectiveBugHuntTokenConfig({ userId, session });
    await UserBugHuntState.create(
      [{
        userId,
        currentTokens: effectiveTokenConfig.maxTokens,
        maxTokens: effectiveTokenConfig.maxTokens,
        regenPerMinute: effectiveTokenConfig.regenPerMinute,
        lastRegenAt: new Date(),
        storageItems,
      }],
      { session }
    );
  }

  return {
    itemKeysGranted,
    hunterXpTotalGranted: ANT_BUG_HUNTER_XP_ON_FULL_DEFEAT,
    hunterXpGrants,
  };
}
