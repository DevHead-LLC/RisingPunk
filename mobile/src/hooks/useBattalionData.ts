import { useMemo } from 'react';
import { useBots, BotType } from './useBots';
import { Battalion } from '../types/battle';

/**
 * Hook for managing battalion data and calculations
 * Integrates with useBots for bot stats and categories
 */
export const useBattalionData = () => {
  const { getBotStats } = useBots();

  /**
   * Create a new battalion with proper stats and health calculation
   */
  const createBattalion = useMemo(() => {
    return (
      type: BotType,
      quantity: number,
      nodeIndex: number,
      isUser: boolean,
      mark: number,
      id?: string
    ): Battalion => {
      const botStats = getBotStats(type, isUser);
      if (!botStats) {
        throw new Error(`Invalid bot type: ${type}`);
      }

      const maxHealth = botStats.stats.health * quantity;

      return {
        id: id || `battalion-${Date.now()}-${Math.random()}`,
        type,
        quantity,
        currentHealth: maxHealth,
        maxHealth,
        nodeIndex,
        isUser,
        stats: botStats.stats,
        mark,
      };
    };
  }, [getBotStats]);



  /**
   * Get all available bot types
   */
  const getAvailableBotTypes = useMemo(() => {
    return (): BotType[] => {
      return ['guardian', 'breacher', 'phreak'];
    };
  }, []);

  return {
    // Battalion creation and management
    createBattalion,
    getAvailableBotTypes,
  };
};
