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
 * Pure max battalion size from hack-ability **feature rows** at a given time (e.g. `Date.now()` or a ticking clock while research completes).
 * Single source of truth with `useBattalionMaxSize`.
 * Bugbot: pass `useGetUserFeaturesQuery('hack-ability').data?.features`, not the whole `data` object (`researchFeaturesApi` getUserFeatures is `{ features: any[] }`).
 */
export function computeBattalionMaxSizeFromFeatures(
  features: FeatureWithResearch[] | undefined,
  nowMs: number
): number {
  let max = 250;
  for (const id of BATTALION_SIZE_FEATURE_IDS) {
    const f = features?.find((feat) => feat.id === id);
    if (!f) break;
    if (!isResearchFeatureEffectivelyUnlockedAt(f, nowMs)) break;
    max = BATTALION_SIZE_MAP[id] ?? max;
  }
  return max;
}

/**
 * Monotonic clock while any battalion-size research is in progress (matches QuantitySelector / PresetBar).
 * Bugbot: argument is `data?.features` from hack-ability `useGetUserFeaturesQuery`, not `data`.
 */
export function useBattalionSizeResearchNowMs(features: FeatureWithResearch[] | undefined): number {
  return useResearchCompletesAtTicker(features, BATTALION_SIZE_FEATURE_IDS);
}

const ADD_BATTALION_SLOT_FEATURE_IDS = [
  'add-battalion-c',
  'add-battalion-d',
  'add-battalion-e',
  'add-battalion-f',
] as const;

function useAddBattalionSlotResearchNowMs(features: FeatureWithResearch[] | undefined): number {
  return useResearchCompletesAtTicker(features, ADD_BATTALION_SLOT_FEATURE_IDS);
}

/**
 * Returns the current maximum troops allowed per battalion based on research unlocks.
 * Base is 250; each successive battalion-size research doubles/raises it.
 */
export function useBattalionMaxSize(): number {
  const { data } = useGetUserFeaturesQuery('hack-ability');
  const features = data?.features;
  const nowMs = useBattalionSizeResearchNowMs(features);

  return useMemo(
    () => computeBattalionMaxSizeFromFeatures(features, nowMs),
    [features, nowMs]
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
  const { data } = useGetUserFeaturesQuery('hack-ability');
  const features = data?.features;
  const nowMs = useAddBattalionSlotResearchNowMs(features);

  return useMemo(() => {
    const battalionC = features?.find((f: { id?: string }) => f.id === 'add-battalion-c');
    const battalionD = features?.find((f: { id?: string }) => f.id === 'add-battalion-d');
    const battalionE = features?.find((f: { id?: string }) => f.id === 'add-battalion-e');
    const battalionF = features?.find((f: { id?: string }) => f.id === 'add-battalion-f');
    return {
      isBattalionCUnlocked: isResearchFeatureEffectivelyUnlockedAt(battalionC, nowMs),
      isBattalionDUnlocked: isResearchFeatureEffectivelyUnlockedAt(battalionD, nowMs),
      isBattalionEUnlocked: isResearchFeatureEffectivelyUnlockedAt(battalionE, nowMs),
      isBattalionFUnlocked: isResearchFeatureEffectivelyUnlockedAt(battalionF, nowMs),
    };
  }, [features, nowMs]);
}
