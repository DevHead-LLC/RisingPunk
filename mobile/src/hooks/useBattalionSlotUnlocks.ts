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
 * Whether a research feature is effectively unlocked (unlocked or research just completed).
 * Matches server-side isBattalionSlotUnlocked: requires a valid researchCompletesAt before
 * treating "researching" as complete; missing timestamp is not treated as epoch (unlocked).
 */
function isResearchFeatureEffectivelyUnlocked(feature: FeatureWithResearch | null | undefined): boolean {
  if (!feature) return false;
  if (feature.isUnlocked) return true;
  const researchCompletesAtMs = feature.researchCompletesAt
    ? new Date(feature.researchCompletesAt).getTime()
    : null;
  if (researchCompletesAtMs === null) return false;
  return !!(feature.isResearching && researchCompletesAtMs <= Date.now());
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
