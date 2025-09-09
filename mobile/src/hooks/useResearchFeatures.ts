import { useGetFeaturesQuery } from '../store/api/researchFeaturesApi';
import { ResearchFeature } from '../components/research/ResearchFeaturesList';

export function useResearchFeatures(categoryId: string | null) {
  const { 
    data: features = [], 
    isLoading: loading, 
    error: queryError,
    refetch
  } = useGetFeaturesQuery(categoryId || '', {
    skip: !categoryId || categoryId === ''
  });

  // Convert RTK Query error to string
  const error = queryError ? 
    (typeof queryError === 'string' ? queryError : 'Failed to fetch research features') : 
    null;

  // Legacy unlockFeature function for backward compatibility
  const unlockFeature = async (featureId: string, cost: number): Promise<boolean> => {
    // This function is no longer used in the new research system
    // Research is now handled through startResearch mutation
    console.warn('unlockFeature is deprecated, use startResearch mutation instead');
    return false;
  };

  return {
    features: features as ResearchFeature[],
    loading,
    error,
    unlockFeature,
    refetch,
  };
}
