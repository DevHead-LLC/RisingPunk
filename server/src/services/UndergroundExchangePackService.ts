import type { BugHuntStorageItemDefinition } from '../constants/bugHuntStorageItems';

type PackItemSeed = {
  itemKey: string;
  quantity: number;
};

type PackSeed = {
  packId: string;
  displayName: string;
  tier: 'staple' | 'weekly';
  discountPercent: number;
  items: readonly PackItemSeed[];
};

export type UndergroundExchangePackItem = {
  itemKey: string;
  label: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type UndergroundExchangePack = {
  packId: string;
  displayName: string;
  tier: 'staple' | 'weekly';
  discountPercent: number;
  basePrice: number;
  discountedPrice: number;
  savings: number;
  items: UndergroundExchangePackItem[];
};

type WeekWindow = {
  weekStartUtc: string;
  weekEndUtc: string;
};

const PREVIOUS_WEEK_PACK_GRACE_MS = 10 * 60 * 1000;

const STAPLE_PACK_SEEDS: readonly PackSeed[] = [
  {
    packId: 'hunter-pack-starter',
    displayName: 'Hunter Pack Starter',
    tier: 'staple',
    discountPercent: 2,
    items: [
      { itemKey: 'bug_hunt_token_credit_900', quantity: 1 },
      { itemKey: 'bug_hunt_travel_speedup_25_percent', quantity: 1 },
      { itemKey: 'bug_hunt_research_speedup_5m', quantity: 2 },
    ],
  },
  {
    packId: 'hunter-pack-strike',
    displayName: 'Hunter Pack Strike',
    tier: 'staple',
    discountPercent: 3,
    items: [
      { itemKey: 'bug_hunt_token_credit_2000', quantity: 1 },
      { itemKey: 'bug_hunt_travel_speedup_50_percent', quantity: 1 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_15m', quantity: 2 },
    ],
  },
  {
    packId: 'growth-pack-starter',
    displayName: 'Growth Pack Starter',
    tier: 'staple',
    discountPercent: 3,
    items: [
      { itemKey: 'bug_hunt_research_speedup_15m', quantity: 2 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_15m', quantity: 2 },
      { itemKey: 'bug_hunt_construction_speedup_15m', quantity: 1 },
    ],
  },
  {
    packId: 'growth-pack-accelerator',
    displayName: 'Growth Pack Accelerator',
    tier: 'staple',
    discountPercent: 4,
    items: [
      { itemKey: 'bug_hunt_research_speedup_1h', quantity: 2 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_1h', quantity: 2 },
      { itemKey: 'bug_hunt_construction_speedup_30m', quantity: 2 },
    ],
  },
  {
    packId: 'battle-pack-scout',
    displayName: 'Battle Pack Scout',
    tier: 'staple',
    discountPercent: 3,
    items: [
      { itemKey: 'bug_hunt_travel_speedup_25_percent', quantity: 2 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_30m', quantity: 2 },
      { itemKey: 'bug_hunt_research_speedup_15m', quantity: 1 },
    ],
  },
  {
    packId: 'battle-pack-siege',
    displayName: 'Battle Pack Siege',
    tier: 'staple',
    discountPercent: 4,
    items: [
      { itemKey: 'bug_hunt_travel_speedup_50_percent', quantity: 2 },
      { itemKey: 'bug_hunt_travel_speedup_25_percent', quantity: 2 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_1h', quantity: 2 },
    ],
  },
  {
    packId: 'architect-pack',
    displayName: 'Architect Pack',
    tier: 'staple',
    discountPercent: 4,
    items: [
      { itemKey: 'bug_hunt_construction_speedup_1h', quantity: 2 },
      { itemKey: 'bug_hunt_construction_speedup_30m', quantity: 2 },
      { itemKey: 'bug_hunt_research_speedup_30m', quantity: 2 },
    ],
  },
  {
    packId: 'deep-hunt-pack',
    displayName: 'Deep Hunt Pack',
    tier: 'staple',
    discountPercent: 5,
    items: [
      { itemKey: 'bug_hunt_token_credit_5000', quantity: 1 },
      { itemKey: 'bug_hunt_travel_speedup_75_percent', quantity: 1 },
      { itemKey: 'bug_hunt_research_speedup_12h', quantity: 1 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_12h', quantity: 1 },
    ],
  },
];

const WEEKLY_PACK_POOL_SEEDS: readonly PackSeed[] = [
  {
    packId: 'weekly-pack-a',
    displayName: 'Pack of the Week',
    tier: 'weekly',
    discountPercent: 5,
    items: [
      { itemKey: 'bug_hunt_research_speedup_1h', quantity: 3 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_1h', quantity: 2 },
      { itemKey: 'bug_hunt_token_credit_2000', quantity: 1 },
    ],
  },
  {
    packId: 'weekly-pack-b',
    displayName: 'Pack of the Week',
    tier: 'weekly',
    discountPercent: 6,
    items: [
      { itemKey: 'bug_hunt_travel_speedup_50_percent', quantity: 2 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_1d', quantity: 1 },
      { itemKey: 'bug_hunt_research_speedup_12h', quantity: 2 },
    ],
  },
  {
    packId: 'weekly-pack-c',
    displayName: 'Pack of the Week',
    tier: 'weekly',
    discountPercent: 7,
    items: [
      { itemKey: 'bug_hunt_token_credit_10000', quantity: 1 },
      { itemKey: 'bug_hunt_travel_speedup_75_percent', quantity: 1 },
      { itemKey: 'bug_hunt_construction_speedup_1d', quantity: 1 },
      { itemKey: 'bug_hunt_research_speedup_1d', quantity: 1 },
    ],
  },
  {
    packId: 'weekly-pack-d',
    displayName: 'Pack of the Week',
    tier: 'weekly',
    discountPercent: 6,
    items: [
      { itemKey: 'bug_hunt_research_speedup_30m', quantity: 4 },
      { itemKey: 'bug_hunt_construction_speedup_30m', quantity: 4 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_30m', quantity: 4 },
    ],
  },
  {
    packId: 'weekly-pack-e',
    displayName: 'Pack of the Week',
    tier: 'weekly',
    discountPercent: 8,
    items: [
      { itemKey: 'bug_hunt_token_credit_20000', quantity: 1 },
      { itemKey: 'bug_hunt_travel_speedup_75_percent', quantity: 2 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_1w', quantity: 1 },
    ],
  },
  {
    packId: 'weekly-pack-f',
    displayName: 'Pack of the Week',
    tier: 'weekly',
    discountPercent: 9,
    items: [
      { itemKey: 'bug_hunt_research_speedup_1w', quantity: 1 },
      { itemKey: 'bug_hunt_construction_speedup_1w', quantity: 1 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_1w', quantity: 1 },
      { itemKey: 'bug_hunt_token_credit_5000', quantity: 1 },
    ],
  },
  {
    packId: 'weekly-pack-g',
    displayName: 'Pack of the Week',
    tier: 'weekly',
    discountPercent: 10,
    items: [
      { itemKey: 'bug_hunt_token_credit_10000', quantity: 2 },
      { itemKey: 'bug_hunt_travel_speedup_50_percent', quantity: 3 },
      { itemKey: 'bug_hunt_research_speedup_12h', quantity: 2 },
      { itemKey: 'bug_hunt_bot_assembly_speedup_12h', quantity: 2 },
    ],
  },
];

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function getUtcWeekWindow(now: Date): { weekStartUtc: Date; weekEndUtc: Date } {
  const day = now.getUTCDay();
  const weekStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0, 0)
  );
  const weekEndUtc = new Date(weekStartUtc.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { weekStartUtc, weekEndUtc };
}

function pickWeeklySeedPacks(now: Date): { selected: readonly PackSeed[]; window: WeekWindow } {
  const { weekStartUtc, weekEndUtc } = getUtcWeekWindow(now);
  const weekKey = weekStartUtc.toISOString();
  const count = 1 + (fnv1a32(weekKey) % 2);
  const scored = [...WEEKLY_PACK_POOL_SEEDS]
    .map((seed) => ({
      seed,
      score: fnv1a32(`${weekKey}:${seed.packId}`),
    }))
    .sort((a, b) => a.score - b.score);
  const selected = scored.slice(0, count).map((entry) => entry.seed);
  return {
    selected,
    window: {
      weekStartUtc: weekStartUtc.toISOString(),
      weekEndUtc: weekEndUtc.toISOString(),
    },
  };
}

function materializePack(seed: PackSeed, itemDefByKey: Map<string, BugHuntStorageItemDefinition>): UndergroundExchangePack {
  const items = seed.items.map((row) => {
    const itemDef = itemDefByKey.get(row.itemKey);
    if (!itemDef) {
      throw new Error(`Pack '${seed.packId}' references unknown item '${row.itemKey}'`);
    }
    const unitPrice = Math.floor(Number(itemDef.shopPrice ?? 0));
    if (unitPrice <= 0) {
      throw new Error(`Pack '${seed.packId}' item '${row.itemKey}' missing valid shopPrice`);
    }
    const quantity = Math.max(1, Math.floor(row.quantity));
    return {
      itemKey: row.itemKey,
      label: itemDef.label,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });
  const basePrice = items.reduce((sum, row) => sum + row.lineTotal, 0);
  const discountPercent = Math.max(0, Math.floor(seed.discountPercent));
  const discountedPrice = Math.max(1, Math.floor(basePrice * (1 - discountPercent / 100)));
  return {
    packId: seed.packId,
    displayName: seed.displayName,
    tier: seed.tier,
    discountPercent,
    basePrice,
    discountedPrice,
    savings: basePrice - discountedPrice,
    items,
  };
}

export function buildUndergroundExchangePacks(params: {
  now: Date;
  itemDefinitions: readonly BugHuntStorageItemDefinition[];
}): {
  staplePacks: UndergroundExchangePack[];
  weeklyPacks: UndergroundExchangePack[];
  weekWindow: WeekWindow;
} {
  const itemDefByKey = new Map(params.itemDefinitions.map((def) => [def.itemKey, def]));
  const staplePacks = STAPLE_PACK_SEEDS.map((seed) => materializePack(seed, itemDefByKey));
  const weeklySeedSelection = pickWeeklySeedPacks(params.now);
  const weeklyPacks = weeklySeedSelection.selected.map((seed) => materializePack(seed, itemDefByKey));
  return {
    staplePacks,
    weeklyPacks,
    weekWindow: weeklySeedSelection.window,
  };
}

export function resolvePackById(params: {
  now: Date;
  itemDefinitions: readonly BugHuntStorageItemDefinition[];
  packId: string;
}): UndergroundExchangePack | null {
  const all = buildUndergroundExchangePacks({
    now: params.now,
    itemDefinitions: params.itemDefinitions,
  });
  const combined = [...all.staplePacks, ...all.weeklyPacks];
  const currentWeekMatch = combined.find((pack) => pack.packId === params.packId);
  if (currentWeekMatch) {
    return currentWeekMatch;
  }
  if (!params.packId.startsWith('weekly-pack-')) {
    return null;
  }
  // Allow a brief rollover grace so users who opened the weekly modal just before UTC week switch can still complete purchase.
  const currentWeekWindow = getUtcWeekWindow(params.now);
  if (params.now.getTime() - currentWeekWindow.weekStartUtc.getTime() > PREVIOUS_WEEK_PACK_GRACE_MS) {
    return null;
  }
  const previousWeekReference = new Date(params.now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousWeekPacks = buildUndergroundExchangePacks({
    now: previousWeekReference,
    itemDefinitions: params.itemDefinitions,
  });
  return previousWeekPacks.weeklyPacks.find((pack) => pack.packId === params.packId) ?? null;
}
