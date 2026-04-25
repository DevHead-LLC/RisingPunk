export const BUG_TYPE_ANT = 'ant' as const;
export type BugType = typeof BUG_TYPE_ANT;

export const BUG_LIFECYCLE_STATES = ['alive', 'defeated', 'removed'] as const;
export type BugLifecycleState = (typeof BUG_LIFECYCLE_STATES)[number];

export const HUNTER_ROSTER_KAITO_GLITCH = 'kaito_glitch' as const;
export type HunterRosterId = typeof HUNTER_ROSTER_KAITO_GLITCH;
export const HUNTER_VISUAL_KEY_KAITO_GLITCH_SPRINT = 'kaito_glitch_sprint' as const;
export type HunterVisualKey = typeof HUNTER_VISUAL_KEY_KAITO_GLITCH_SPRINT;

export const MAX_HUNTER_LEVEL = 99 as const;
export const ANT_WORLD_CAP = 1500 as const;

export interface HunterEffectiveStats {
  health: number;
  offense: number;
  defense: number;
  speed: number;
  range: number;
}

export interface HunterProgressSnapshot {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  totalExp: number;
}
