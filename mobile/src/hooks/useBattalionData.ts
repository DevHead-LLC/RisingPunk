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
   * Calculate health based on bot type and quantity
   */
  const calculateHealth = useMemo(() => {
    return (type: BotType, quantity: number, isUser: boolean): number => {
      const botStats = getBotStats(type, isUser);
      if (!botStats) {
        throw new Error(`Invalid bot type: ${type}`);
      }
      return botStats.stats.health * quantity;
    };
  }, [getBotStats]);

  /**
   * Calculate attack power for a battalion
   */
  const calculateAttackPower = useMemo(() => {
    return (battalion: Battalion): number => {
      return battalion.stats.offense * battalion.quantity;
    };
  }, []);

  /**
   * Calculate defense percentage for a battalion
   */
  const calculateDefense = useMemo(() => {
    return (battalion: Battalion): number => {
      return battalion.stats.defense;
    };
  }, []);

  /**
   * Update battalion health and quantity after taking damage
   */
  const applyDamage = useMemo(() => {
    return (battalion: Battalion, damage: number): Battalion => {
      const newHealth = Math.max(0, battalion.currentHealth - damage);
      const healthPerUnit = battalion.stats.health;
      const newQuantity = Math.max(0, Math.floor(newHealth / healthPerUnit));

      return {
        ...battalion,
        currentHealth: newHealth,
        quantity: newQuantity,
      };
    };
  }, []);

  /**
   * Check if a battalion is destroyed (quantity = 0)
   */
  const isBattalionDestroyed = useMemo(() => {
    return (battalion: Battalion): boolean => {
      return battalion.quantity <= 0;
    };
  }, []);

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
    calculateHealth,
    calculateAttackPower,
    calculateDefense,
    applyDamage,
    isBattalionDestroyed,
    getAvailableBotTypes,
  };
};
