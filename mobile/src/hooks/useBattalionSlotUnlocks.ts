import { useEffect, useMemo, useState } from 'react';
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

/** While any listed feature is researching toward a completion time, tick once per second so unlock/size logic updates when `researchCompletesAt` passes (without waiting for RTK refetch). */
function useResearchCompletesAtTicker(
  features: FeatureWithResearch[] | undefined,
  watchIds: readonly string[]
): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const anyResearching = watchIds.some((id) => {
      const f = features?.find((x) => x.id === id);
      return f?.isResearching && f?.researchCompletesAt;
    });
    if (!anyResearching) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [features, watchIds]);
  return nowMs;
}

/** Ordered battalion-size research feature ids; max cap per tier is in `BATTALION_SIZE_MAP`. */
export const BATTALION_SIZE_FEATURE_IDS = [
  'battalion-size-250',
  'battalion-size-500',
  'battalion-size-1000',
  'battalion-size-2000',
  'battalion-size-4500',
  'battalion-size-6500',
  'battalion-size-5000-i',
  'battalion-size-5000-ii',
  'battalion-size-7500-i',
  'battalion-size-7500-ii',
  'battalion-size-10000',
] as const;

const BATTALION_SIZE_MAP: Record<(typeof BATTALION_SIZE_FEATURE_IDS)[number], number> = {
  'battalion-size-250': 500,
  'battalion-size-500': 1000,
  'battalion-size-1000': 2000,
  'battalion-size-2000': 4000,
  'battalion-size-4500': 8500,
  'battalion-size-6500': 15000,
  'battalion-size-5000-i': 20000,
  'battalion-size-5000-ii': 25000,
  'battalion-size-7500-i': 32500,
  'battalion-size-7500-ii': 40000,
  'battalion-size-10000': 50000,
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
 * Monotonic clock while any battalion-size research is in progress (matches QuantitySelector / PresetBar).
 */
export function useBattalionSizeResearchNowMs(
  hackAbilityFeatures: FeatureWithResearch[] | undefined
): number {
  return useResearchCompletesAtTicker(hackAbilityFeatures, BATTALION_SIZE_FEATURE_IDS);
}

const ADD_BATTALION_SLOT_FEATURE_IDS = [
  'add-battalion-c',
  'add-battalion-d',
  'add-battalion-e',
  'add-battalion-f',
] as const;

function useAddBattalionSlotResearchNowMs(
  hackAbilityFeatures: FeatureWithResearch[] | undefined
): number {
  return useResearchCompletesAtTicker(hackAbilityFeatures, ADD_BATTALION_SLOT_FEATURE_IDS);
}

/**
 * Returns the current maximum troops allowed per battalion based on research unlocks.
 * Base is 250; each successive battalion-size research doubles/raises it.
 */
export function useBattalionMaxSize(): number {
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability');
  const nowMs = useBattalionSizeResearchNowMs(hackAbilityFeatures);

  return useMemo(
    () => computeBattalionMaxSizeFromFeatures(hackAbilityFeatures, nowMs),
    [hackAbilityFeatures, nowMs]
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
  const nowMs = useAddBattalionSlotResearchNowMs(hackAbilityFeatures);

  return useMemo(() => {
    const battalionC = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-c');
    const battalionD = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-d');
    const battalionE = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-e');
    const battalionF = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-f');
    return {
      isBattalionCUnlocked: isResearchFeatureEffectivelyUnlockedAt(battalionC, nowMs),
      isBattalionDUnlocked: isResearchFeatureEffectivelyUnlockedAt(battalionD, nowMs),
      isBattalionEUnlocked: isResearchFeatureEffectivelyUnlockedAt(battalionE, nowMs),
      isBattalionFUnlocked: isResearchFeatureEffectivelyUnlockedAt(battalionF, nowMs),
    };
  }, [hackAbilityFeatures, nowMs]);
}
