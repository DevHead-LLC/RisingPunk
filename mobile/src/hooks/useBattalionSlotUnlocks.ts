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
 * Matches server-side isBattalionSlotUnlocked logic for UI consistency.
 */
export function isResearchFeatureEffectivelyUnlocked(feature: FeatureWithResearch | null | undefined): boolean {
  if (!feature) return false;
  const now = Date.now();
  const researchCompletesAt = feature.researchCompletesAt
    ? new Date(feature.researchCompletesAt).getTime()
    : 0;
  const remaining = Math.max(0, researchCompletesAt - now);
  return !!(
    feature.isUnlocked ||
    (feature.isResearching && remaining === 0)
  );
}

/**
 * Returns whether Battalion C, D, and E slots are effectively unlocked (same logic as server isBattalionSlotUnlocked).
 * Uses hack-ability user features; one source of truth for the "effectively unlocked" check on the client.
 */
export function useBattalionSlotUnlocks(): {
  isBattalionCUnlocked: boolean;
  isBattalionDUnlocked: boolean;
  isBattalionEUnlocked: boolean;
} {
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability');

  return useMemo(() => {
    const battalionC = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-c');
    const battalionD = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-d');
    const battalionE = hackAbilityFeatures?.find((f: { id?: string }) => f.id === 'add-battalion-e');
    return {
      isBattalionCUnlocked: isResearchFeatureEffectivelyUnlocked(battalionC),
      isBattalionDUnlocked: isResearchFeatureEffectivelyUnlocked(battalionD),
      isBattalionEUnlocked: isResearchFeatureEffectivelyUnlocked(battalionE),
    };
  }, [hackAbilityFeatures]);
}
