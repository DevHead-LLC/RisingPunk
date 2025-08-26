import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { API_URL } from '../config';
import { ResearchFeature } from '../components/research/ResearchFeaturesList';

export function useResearchFeatures(categoryId: string | null) {
  const [features, setFeatures] = useState<ResearchFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAppSelector(state => state.auth.token);

  const fetchFeatures = useCallback(async () => {
    if (!token || !categoryId || categoryId === '') return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/research/features/${categoryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.data);
      } else {
        setError(data.message || 'Failed to fetch research features');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [token, categoryId]);

  const unlockFeature = useCallback(async (featureId: string, cost: number): Promise<boolean> => {
    if (!token || !categoryId || categoryId === '') return false;

    try {
      const response = await fetch(`${API_URL}/api/research/unlock-feature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId,
          featureId,
          cost
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the local features state
        setFeatures(prevFeatures => 
          prevFeatures.map(feature => 
            feature.id === featureId 
              ? { ...feature, isUnlocked: true, unlockedAt: new Date() }
              : feature
          )
        );
        return true;
      } else {
        setError(data.message || 'Failed to unlock feature');
        return false;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      return false;
    }
  }, [token, categoryId]);

  useEffect(() => {
    if (token && categoryId && categoryId !== '') {
      fetchFeatures();
    } else {
      // Reset state when no category is selected
      setFeatures([]);
      setLoading(false);
      setError(null);
    }
  }, [token, categoryId, fetchFeatures]);

  return {
    features,
    loading,
    error,
    unlockFeature,
    refetch: fetchFeatures,
  };
}
