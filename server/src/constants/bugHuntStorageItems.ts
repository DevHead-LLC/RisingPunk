export type BugHuntStorageItemDefinition = {
  itemKey: string;
  label: string;
  category: 'cash' | 'speedup' | 'travel';
  cashAmount?: number;
  durationSeconds?: number;
  speedupDomain?: 'research' | 'construction' | 'bot_assembly';
  travelSpeedPercent?: number;
};

export const BUG_HUNT_STORAGE_ITEM_DEFINITIONS: readonly BugHuntStorageItemDefinition[] = [
  {
    itemKey: 'bug_hunt_cash_pack_1000',
    label: '$1,000 wallet',
    category: 'cash',
    cashAmount: 1000,
  },
  {
    itemKey: 'bug_hunt_cash_pack_5000',
    label: '$5,000 wallet',
    category: 'cash',
    cashAmount: 5000,
  },
  {
    itemKey: 'bug_hunt_cash_pack_10000',
    label: '$10,000 wallet',
    category: 'cash',
    cashAmount: 10000,
  },
  {
    itemKey: 'bug_hunt_cash_pack_20000',
    label: '$20,000 wallet',
    category: 'cash',
    cashAmount: 20000,
  },
  {
    itemKey: 'bug_hunt_travel_speedup_25_percent',
    label: '25% travel time reduction',
    category: 'travel',
    travelSpeedPercent: 25,
  },
  {
    itemKey: 'bug_hunt_travel_speedup_50_percent',
    label: '50% travel time reduction',
    category: 'travel',
    travelSpeedPercent: 50,
  },
  {
    itemKey: 'bug_hunt_travel_speedup_75_percent',
    label: '75% travel time reduction',
    category: 'travel',
    travelSpeedPercent: 75,
  },
  {
    itemKey: 'bug_hunt_research_speedup_1m',
    label: '1-minute research speedup',
    category: 'speedup',
    durationSeconds: 60,
    speedupDomain: 'research',
  },
  {
    itemKey: 'bug_hunt_construction_speedup_1m',
    label: '1-minute construction speedup',
    category: 'speedup',
    durationSeconds: 60,
    speedupDomain: 'construction',
  },
  {
    itemKey: 'bug_hunt_bot_assembly_speedup_1m',
    label: '1-minute bot assembly speedup',
    category: 'speedup',
    durationSeconds: 60,
    speedupDomain: 'bot_assembly',
  },
  {
    itemKey: 'bug_hunt_research_speedup_5m',
    label: '5-minute research speedup',
    category: 'speedup',
    durationSeconds: 300,
    speedupDomain: 'research',
  },
  {
    itemKey: 'bug_hunt_construction_speedup_5m',
    label: '5-minute construction speedup',
    category: 'speedup',
    durationSeconds: 300,
    speedupDomain: 'construction',
  },
  {
    itemKey: 'bug_hunt_bot_assembly_speedup_5m',
    label: '5-minute bot assembly speedup',
    category: 'speedup',
    durationSeconds: 300,
    speedupDomain: 'bot_assembly',
  },
];
