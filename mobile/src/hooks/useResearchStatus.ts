import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { API_URL } from '../config';
import { researchFeaturesApi } from '../store/api/researchFeaturesApi';

export interface ResearchStatus {
  categoryId: string;
  name: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
  unlockCost: number;
  levelRequirement: number;
  balanceRequirement: number;
  dependencies: string[];
  requiredFeatures?: string[];
  image: string;
}

export function useResearchStatus() {
  const [researchStatus, setResearchStatus] = useState<ResearchStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = useAppSelector(state => state.auth.token);
  const userLevel = useAppSelector(state => state.auth.user?.level ?? 1);
  const dispatch = useAppDispatch();
  const previousLevelRef = useRef<number | undefined>(undefined);

  const fetchResearchStatus = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/research/status?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResearchStatus(data.data);
      } else {
        setError(data.message || 'Failed to fetch research status');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const canAccessResearch = (categoryId: string): boolean => {
    const research = researchStatus.find(r => r.categoryId === categoryId);
    return research?.isUnlocked || false;
  };

  const getResearchRequirements = (categoryId: string) => {
    const research = researchStatus.find(r => r.categoryId === categoryId);
    if (!research) return null;
    
    return {
      categoryId: research.categoryId,
      name: research.name,
      levelRequirement: research.levelRequirement,
      balanceRequirement: research.balanceRequirement,
      dependencies: research.dependencies,
      requiredFeatures: research.requiredFeatures || [],
      unlockCost: research.unlockCost,
      isUnlocked: research.isUnlocked
    };
  };

  useEffect(() => {
    if (token) {
      fetchResearchStatus();
    }
  }, [token, fetchResearchStatus]);

  // When user level changes (e.g. after level-up), refetch category status and invalidate feature caches so Research Center shows new unlocks without app refresh
  useEffect(() => {
    if (previousLevelRef.current !== undefined && previousLevelRef.current !== userLevel) {
      if (token) {
        fetchResearchStatus();
        dispatch(researchFeaturesApi.util.invalidateTags(['ResearchFeatures']));
      }
      previousLevelRef.current = userLevel;
    } else if (previousLevelRef.current === undefined) {
      previousLevelRef.current = userLevel;
    }
  }, [userLevel, token, fetchResearchStatus, dispatch]);

  return {
    researchStatus,
    loading,
    error,
    canAccessResearch,
    getResearchRequirements,
    refetch: fetchResearchStatus,
    refreshAfterUnlock: fetchResearchStatus,
  };
}
