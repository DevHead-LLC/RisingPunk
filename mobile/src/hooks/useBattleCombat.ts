/**
 * @hook useBattleCombat
 * @description Manages battle combat calculations and state
 * 
 * @important This hook centralizes all combat-related logic
 * @dependencies BattleNode, BattalionPosition, BOT_CATEGORIES
 * @maintainer Keep combat calculations isolated for balance tweaking
 */

import { useCallback } from 'react';
import { BattleNode, BattalionPosition } from '../types/battle';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { checkRangeIntersection } from '../utils/battleCalculator';

type CombatRefs = {
  battalionRefs: React.MutableRefObject<{ [key: string]: any }>;
  attackIntervals: React.MutableRefObject<{ [key: string]: NodeJS.Timeout }>;
  nodeRefs: React.MutableRefObject<{
    [key: string]: {
      triggerDamageAnimation: () => void;
      applyDamage: (damage: number, isUser: boolean) => boolean;
    } | null;
  }>;
};

export const useBattleCombat = (
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[],
  refs: CombatRefs
) => {
  /**
   * @function calculateDamage
   * @description Calculates damage based on battalion type and quantity
   * @important DO NOT DELETE - Critical for game balance
   */
  const calculateDamage = useCallback((battalion: BattalionPosition) => {
    const baseDamage = BOT_CATEGORIES[battalion.type].stats.offense;
    return baseDamage * battalion.quantity;
  }, []);

  /**
   * @function handleBattalionAttack
   * @description Manages the attack logic for a single battalion
   * @important Keeps attack timing and damage application centralized
   */
  const handleBattalionAttack = useCallback((
    battalion: BattalionPosition,
    targetNodeIndex: number,
    isUser: boolean
  ) => {
    const battalionKey = `${isUser ? 'user' : 'enemy'}-${battalion.nodeIndex}`;
    const damage = calculateDamage(battalion);
    
    // Clear any existing attack interval
    if (refs.attackIntervals.current[battalionKey]) {
      clearInterval(refs.attackIntervals.current[battalionKey]);
    }

    // Set up new attack interval
    refs.attackIntervals.current[battalionKey] = setInterval(() => {
      const nodeRef = refs.nodeRefs.current[targetNodeIndex];
      if (nodeRef) {
        const destroyed = nodeRef.applyDamage(damage, isUser);
        if (destroyed) {
          clearInterval(refs.attackIntervals.current[battalionKey]);
        }
      }
    }, 1000) as unknown as NodeJS.Timeout;
  }, [calculateDamage]);

  /**
   * @function stopBattalionAttack
   * @description Stops a battalion's attack interval
   * @important Prevents memory leaks from ongoing intervals
   */
  const stopBattalionAttack = useCallback((battalion: BattalionPosition, isUser: boolean) => {
    const battalionKey = `${isUser ? 'user' : 'enemy'}-${battalion.nodeIndex}`;
    if (refs.attackIntervals.current[battalionKey]) {
      clearInterval(refs.attackIntervals.current[battalionKey]);
      delete refs.attackIntervals.current[battalionKey];
    }
  }, []);

  return {
    handleBattalionAttack,
    stopBattalionAttack,
    calculateDamage
  };
}; 