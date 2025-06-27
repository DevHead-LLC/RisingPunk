import { useMemo } from 'react';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { BattleNode, BattalionPosition } from '../types/battle';
import {
  calculateMovementDuration,
  calculateAttackInterval,
  calculateAttackRange
} from '../utils/battleUtils';
import type { BattalionRefs, NodeRefs, AttackIntervals, OnBattalionLoss } from './useBattalionRefsAndState';

export const useBattleEngine = (
  battleStarted: boolean,
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[],
  setUserBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  onBattalionLoss: OnBattalionLoss,
  battalionRefs: React.MutableRefObject<BattalionRefs>,
  attackIntervals: React.MutableRefObject<AttackIntervals>,
  nodeRefs: React.MutableRefObject<NodeRefs>,
  battleInitializedRef: React.MutableRefObject<boolean>,
  battalionsRef: React.MutableRefObject<{ user: BattalionPosition[]; enemy: BattalionPosition[] }>,
  nodesRef: React.MutableRefObject<BattleNode[]>,
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void
) => {
  // Memoized calculations for performance optimization
  const memoizedCalculations = useMemo(() => {
    const calculations: { [key: string]: any } = {};
    
    // Cache bot category stats to avoid repeated lookups
    const botStats = new Map<string, any>();
    const getBotStats = (type: string, isUser: boolean = true) => {
      const key = `${type}-${isUser ? 'user' : 'enemy'}`;
      if (!botStats.has(key)) {
        const baseStats = BOT_CATEGORIES[type].stats;
        if (isUser) {
          botStats.set(key, baseStats);
        } else {
          // Enemy bots have much higher attack power
          botStats.set(key, {
            ...baseStats,
            offense: baseStats.offense * 4, // 4x higher attack power
            health: baseStats.health * 2    // 2x higher health
          });
        }
      }
      return botStats.get(key);
    };

    // Cache attack intervals by battalion type and speed
    const attackIntervals = new Map<string, number>();
    const getAttackInterval = (type: string) => {
      const key = `attack-${type}`;
      if (!attackIntervals.has(key)) {
        const speed = getBotStats(type).speed;
        attackIntervals.set(key, calculateAttackInterval(speed));
      }
      return attackIntervals.get(key);
    };

    // Cache attack ranges by battalion type
    const attackRanges = new Map<string, number>();
    const getAttackRange = (type: string) => {
      if (!attackRanges.has(type)) {
        attackRanges.set(type, calculateAttackRange(type));
      }
      return attackRanges.get(type);
    };

    // Cache movement durations by speed
    const movementDurations = new Map<number, number>();
    const getMovementDuration = (speed: number) => {
      if (!movementDurations.has(speed)) {
        movementDurations.set(speed, calculateMovementDuration(speed));
      }
      return movementDurations.get(speed);
    };

    return {
      getBotStats,
      getAttackInterval,
      getAttackRange,
      getMovementDuration
    };
  }, []);

  return {
    memoizedCalculations
  };
}; 