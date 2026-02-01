import { UserResearchFeature } from '../models/UserResearchFeature';

/**
 * Check whether a research feature is unlocked for a user.
 * Single source of truth for research unlock checks used by rental/balance services.
 */
export async function isResearchFeatureUnlocked(
  userId: string,
  categoryId: string,
  featureId: string
): Promise<boolean> {
  try {
    const feature = await UserResearchFeature.findOne({
      userId,
      categoryId,
      featureId
    })
      .select('isUnlocked unlockedAt')
      .lean();

    if (!feature) {
      return false;
    }

    return !!feature.isUnlocked;
  } catch (error) {
    console.error(`[RESEARCH] Error checking research unlock status (${categoryId}/${featureId}):`, error);
    return false;
  }
}

/**
 * Get the unlock timestamp for a research feature, or null if not unlocked.
 */
export async function getResearchFeatureUnlockTime(
  userId: string,
  categoryId: string,
  featureId: string
): Promise<Date | null> {
  try {
    const feature = await UserResearchFeature.findOne({
      userId,
      categoryId,
      featureId
    })
      .select('isUnlocked unlockedAt')
      .lean();

    if (!feature || !feature.isUnlocked || !feature.unlockedAt) {
      return null;
    }

    return feature.unlockedAt;
  } catch (error) {
    console.error(`[RESEARCH] Error getting research unlock time (${categoryId}/${featureId}):`, error);
    return null;
  }
}
