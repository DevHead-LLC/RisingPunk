import { useState, useMemo } from 'react';
import { Battalion } from '../types/battle';
import { useBattalionData } from './useBattalionData';

// TODO: This hook will be deprecated once server integration is complete
// Future implementation will use battleApi:
// import { useGetBattleStateQuery } from '../store/api/battleApi';
// const { data: battleState, isLoading, error } = useGetBattleStateQuery(battleId);
// const battalions = battleState?.battalions || [];

/**
 * Hook for managing battalion state for visualization
 * Integrates with useBattalionData for battalion creation and management
 * TODO: Remove local state management - server handles all state
 */
export const useBattleBattalions = () => {
  const battalionData = useBattalionData();
  // TODO: Remove local state - server handles all battalion state
  const [battalions, setBattalions] = useState<Battalion[]>([]);

  /**
   * Create and add a battalion to the battle
   */
  const addBattalion = useMemo(() => {
    return (
      type: 'guardian' | 'breacher' | 'phreak',
      quantity: number,
      nodeIndex: number,
      isUser: boolean,
      mark: number,
      id?: string
    ) => {
      const newBattalion = battalionData.createBattalion(type, quantity, nodeIndex, isUser, mark, id);
      setBattalions(prev => [...prev, newBattalion]);
      return newBattalion;
    };
  }, [battalionData]);

  /**
   * Remove a battalion from the battle
   */
  const removeBattalion = useMemo(() => {
    return (battalionId: string) => {
      setBattalions(prev => prev.filter(b => b.id !== battalionId));
    };
  }, []);

  /**
   * Update a battalion's state
   */
  const updateBattalion = useMemo(() => {
    return (battalionId: string, updates: Partial<Battalion>) => {
      setBattalions(prev => prev.map(b =>
        b.id === battalionId ? { ...b, ...updates } : b
      ));
    };
  }, []);

  /**
   * Apply damage to a battalion
   * TODO: Server handles damage calculations - remove this method
   */
  const damageBattalion = useMemo(() => {
    return (battalionId: string, damage: number) => {
      // TODO: Server handles damage - this is deprecated
      console.warn('damageBattalion is deprecated - server handles damage calculations');
    };
  }, []);

  /**
   * Get battalions by node index
   */
  const getBattalionsAtNode = useMemo(() => {
    return (nodeIndex: number): Battalion[] => {
      return battalions.filter(b => b.nodeIndex === nodeIndex);
    };
  }, [battalions]);

  /**
   * Get user battalions
   */
  const getUserBattalions = useMemo(() => {
    return (): Battalion[] => {
      return battalions.filter(b => b.isUser);
    };
  }, [battalions]);

  /**
   * Get enemy battalions
   */
  const getEnemyBattalions = useMemo(() => {
    return (): Battalion[] => {
      return battalions.filter(b => !b.isUser);
    };
  }, [battalions]);

  /**
   * Get destroyed battalions
   * TODO: Server handles battalion state - remove this method
   */
  const getDestroyedBattalions = useMemo(() => {
    return (): Battalion[] => {
      // TODO: Server handles battalion state - this is deprecated
      console.warn('getDestroyedBattalions is deprecated - server handles battalion state');
      return [];
    };
  }, []);

  /**
   * Clear all battalions
   */
  const clearBattalions = useMemo(() => {
    return () => {
      setBattalions([]);
    };
  }, []);

  /**
   * Initialize sample battalions for demonstration
   * todo: remove this
   */
  const initializeSampleBattalions = useMemo(() => {
    return () => {
      const sampleBattalions = [
        // User battalions on user nodes (0, 1, 2)
        battalionData.createBattalion('guardian', 10, 0, true, 1, 'user-guardian-1'),
        battalionData.createBattalion('breacher', 8, 1, true, 2, 'user-breacher-1'),
        battalionData.createBattalion('phreak', 6, 2, true, 3, 'user-phreak-1'),

        // Enemy battalions on enemy nodes (6, 7, 8)
        battalionData.createBattalion('guardian', 12, 6, false, 1, 'enemy-guardian-1'),
        battalionData.createBattalion('breacher', 10, 7, false, 2, 'enemy-breacher-1'),
        battalionData.createBattalion('phreak', 8, 8, false, 3, 'enemy-phreak-1'),
      ];

      setBattalions(sampleBattalions);
    };
  }, [battalionData]);

  return {
    // State
    battalions,

    // Battalion management
    addBattalion,
    removeBattalion,
    updateBattalion,
    damageBattalion,
    clearBattalions,

    // Queries
    getBattalionsAtNode,
    getUserBattalions,
    getEnemyBattalions,
    getDestroyedBattalions,

    // Initialization
    initializeSampleBattalions,
  };
};
