export interface PresetDefinition {
  level: number;
  cost: number;
}

export const BATTLE_PRESET_DEFINITIONS: Record<string, PresetDefinition> = {
  '1': { level: 30, cost: 2_500_000 },
  '2': { level: 35, cost: 3_000_000 },
  '3': { level: 45, cost: 5_000_000 },
};

export const VALID_PRESET_IDS = ['1', '2', '3'] as const;
export const VALID_BATTALION_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const VALID_BOT_TYPES = ['breacher', 'guardian', 'phreak'] as const;
