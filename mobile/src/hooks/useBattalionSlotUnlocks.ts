import { useMemo } from 'react';
import { useGetUserFeaturesQuery } from '../store/api/researchFeaturesApi';

/** Feature shape from getUserFeatures (hack-ability). */
interface FeatureWithResearch {
  id?: string;
  isUnlocked?: boolean;
  isResearching?: boolean;
  researchCompletesAt?: string | Date | null;
}

/**
 * Whether a research feature is effectively unlocked at `nowMs` (unlocked or research just completed).
 * Matches server-side isBattalionSlotUnlocked: requires a valid researchCompletesAt before
 * treating "researching" as complete; missing timestamp is not treated as epoch (unlocked).
 */
function isResearchFeatureEffectivelyUnlockedAt(
  feature: FeatureWithResearch | null | undefined,
  nowMs: number
): boolean {
  if (!feature) return false;
  if (feature.isUnlocked) return true;
  const researchCompletesAtMs = feature.researchCompletesAt
    ? new Date(feature.researchCompletesAt).getTime()
    : null;
  if (researchCompletesAtMs === null) return false;
  return !!(feature.isResearching && researchCompletesAtMs <= nowMs);
}

function isResearchFeatureEffectivelyUnlocked(feature: FeatureWithResearch | null | undefined): boolean {
  return isResearchFeatureEffectivelyUnlockedAt(feature, Date.now());
}

/** Ordered battalion-size research feature ids; max cap per tier is in `BATTALION_SIZE_MAP`. */
export const BATTALION_SIZE_FEATURE_IDS = [
  'battalion-size-250',
  'battalion-size-500',
  'battalion-size-1000',
  'battalion-size-2000',
  'battalion-size-4500',
  'battalion-size-6500',
] as const;

const BATTALION_SIZE_MAP: Record<(typeof BATTALION_SIZE_FEATURE_IDS)[number], number> = {
  'battalion-size-250': 500,
  'battalion-size-500': 1000,
  'battalion-size-1000': 2000,
  'battalion-size-2000': 4000,
  'battalion-size-4500': 8500,
  'battalion-size-6500': 15000,
};

/**
 * Pure max battalion size from hack-ability features at a given time (e.g. `Date.now()` or a ticking clock while research completes).
 * Single source of truth with `useBattalionMaxSize`.
 */
export function computeBattalionMaxSizeFromFeatures(
  hackAbilityFeatures: FeatureWithResearch[] | undefined,
  nowMs: number
): number {
  let max = 250;
  for (const id of BATTALION_SIZE_FEATURE_IDS) {
    const f = hackAbilityFeatures?.find((feat) => feat.id === id);
    if (!f) break;
    if (!isResearchFeatureEffectivelyUnlockedAt(f, nowMs)) break;
    max = BATTALION_SIZE_MAP[id] ?? max;
  }
  return max;
}

/**
 * Returns the current maximum troops allowed per battalion based on research unlocks.
 * Base is 250; each successive battalion-size research doubles/raises it.
 */
export function useBattalionMaxSize(): number {
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability');

  return useMemo(
    () => computeBattalionMaxSizeFromFeatures(hackAbilityFeatures, Date.now()),
    [hackAbilityFeatures]
  );
}

/**
 * Returns whether Battalion C, D, E, and F slots are effectively unlocked (same logic as server isBattalionSlotUnlocked).
 * Uses hack-ability user features; one source of truth for the "effectively unlocked" check on the client.
 */
export function useBattalionSlotUnlocks(): {
  isBattalionCUnlocked: boolean;
  isBattalionDUnlocked: boolean;
  isBattalionEUnlocked: boolean;
  isBattalionFUnlocked: boolean;
} {
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability');

  return useMemo(() => {
    const battalionC = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-c');
    const battalionD = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-d');
    const battalionE = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-e');
    const battalionF = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-f');
    return {
      isBattalionCUnlocked: isResearchFeatureEffectivelyUnlocked(battalionC),
      isBattalionDUnlocked: isResearchFeatureEffectivelyUnlocked(battalionD),
      isBattalionEUnlocked: isResearchFeatureEffectivelyUnlocked(battalionE),
      isBattalionFUnlocked: isResearchFeatureEffectivelyUnlocked(battalionF),
    };
  }, [hackAbilityFeatures]);
}
