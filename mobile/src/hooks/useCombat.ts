import { BOT_CATEGORIES, getBotStats } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { updateBattalionHealth } from '../utils/healthUtils';
import type { BattalionPosition, BattleTarget, BattleNode } from '../types/battle';
import { BattalionRef } from '../components/battle/AnimatedBattalion';
import { findBattalionIndexAndId } from './useBattalionRefsAndState';
import { cleanupBattalion } from './useMovement';
import { useCallback } from 'react';
import { isNeutral } from '../utils/nodeOwnership';

const createBattalionKey = (isUser: boolean, nodeIndex: number): string => 
  `${isUser ? 'user' : 'enemy'}-${nodeIndex}`;

export const setupAttacks = (
  battalion: BattalionPosition,
  target: BattleTarget,
  isUser: boolean,
  battalionId: string,
  attackIntervals: { [key: string]: NodeJS.Timeout },
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  nodeRefs: { [key: number]: any },
  nodes: BattleNode[],
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  setUserBattalions?: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions?: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  userBattalions?: BattalionPosition[],
  enemyBattalions?: BattalionPosition[]
): void => {
  if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
    cleanupBattalion(battalionId, attackIntervals);
    return;
  }

  const attackSpeed = getBotStats(battalion.type, isUser).stats.speed;
  const attackInterval = 2000 * (5 / attackSpeed);
  const attackPower = getBotStats(battalion.type, isUser).stats.offense;
  const totalDamage = attackPower * battalion.quantity;
  
  cleanupBattalion(battalionId, attackIntervals);

  setTimeout(() => {
    if (target.type === 'node') {
      setupNodeAttack(
        battalion,
        target,
        isUser,
        battalionId,
        attackIntervals,
        cleanupBattalion,
        nodeRefs,
        nodes,
        findAvailableTargets,
        moveBattalionAlongPath,
        totalDamage,
        attackInterval,
        userBattalions,
        enemyBattalions
      );
    } else if (target.type === 'battalion') {
      setupBattalionAttack(
        battalion,
        target,
        isUser,
        battalionId,
        attackIntervals,
        cleanupBattalion,
        findAvailableTargets,
        moveBattalionAlongPath,
        totalDamage,
        attackInterval,
        setUserBattalions,
        setEnemyBattalions,
        userBattalions,
        enemyBattalions
      );
    }
  }, 150);
};

const setupNodeAttack = (
  battalion: BattalionPosition,
  target: { type: string; index: number },
  isUser: boolean,
  battalionId: string,
  attackIntervals: { [key: string]: NodeJS.Timeout },
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  nodeRefs: { [key: number]: any },
  nodes: BattleNode[],
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  totalDamage: number,
  attackInterval: number,
  userBattalions?: BattalionPosition[],
  enemyBattalions?: BattalionPosition[]
): void => {
  const nodeRef = nodeRefs[target.index];
  if (!nodeRef || battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
    cleanupBattalion(battalionId, attackIntervals);
    return;
  }

  const intervalKey = `${battalionId}-node-${target.index}`;
  
  const attackFn = () => {
    if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
      cleanupBattalion(battalionId, attackIntervals);
      return;
    }

    // Event-driven retargeting only - no continuous target validation during attacks
    const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
    if (!damageApplied) {
      cleanupBattalion(battalionId, attackIntervals);
      battalion.targetNode = undefined;
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
      if (newTargets.length > 0) {
        moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
      }
    }
  };

  attackIntervals[intervalKey] = setInterval(attackFn, attackInterval);
  attackFn();
};

const setupBattalionAttack = (
  battalion: BattalionPosition,
  target: { type: string; index: number },
  isUser: boolean,
  battalionId: string,
  attackIntervals: { [key: string]: NodeJS.Timeout },
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  totalDamage: number,
  attackInterval: number,
  setUserBattalions?: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions?: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  userBattalions?: BattalionPosition[],
  enemyBattalions?: BattalionPosition[]
): void => {
  const enemyBatts = isUser ? enemyBattalions : userBattalions;
  if (!enemyBatts) return;

  const enemyBattalion = enemyBatts[target.index];
  if (!enemyBattalion || enemyBattalion.quantity <= 0 || (enemyBattalion.currentHealth ?? 0) <= 0) {
    const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
    if (newTargets.length > 0) {
      moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
    }
    return;
  }

  const enemyId = `${!isUser ? 'user' : 'enemy'}-${enemyBattalion.type}-${enemyBattalion.nodeIndex}`;
  const intervalKey = `${battalionId}-${enemyId}`;
  
  const attackFn = () => {
    if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
      cleanupBattalion(battalionId, attackIntervals);
      return;
    }

    const updateStateFn = (prevBatts: BattalionPosition[]) => {
      const updatedBatts = [...prevBatts];
      const targetBatt = updatedBatts[target.index];
      
      if (!targetBatt || targetBatt.quantity <= 0 || (targetBatt.currentHealth ?? 0) <= 0) {
        cleanupBattalion(battalionId, attackIntervals);
        return prevBatts;
      }

      const wasDestroyed = updateBattalionHealth(targetBatt, (targetBatt.currentHealth ?? 0) - totalDamage);
      
      if (wasDestroyed) {
        setTimeout(() => {
          const newTargets = findAvailableTargets(
            battalion,
            isUser,
            isUser ? userBattalions! : updatedBatts,
            isUser ? updatedBatts : enemyBattalions!
          );
          if (newTargets.length > 0) {
            moveBattalionAlongPath(
              battalion,
              newTargets[0],
              isUser,
              isUser ? userBattalions : updatedBatts,
              isUser ? updatedBatts : enemyBattalions
            );
          }
        }, 100);
      }

      return updatedBatts;
    };

    if (isUser && setEnemyBattalions) {
      setEnemyBattalions(updateStateFn);
    } else if (!isUser && setUserBattalions) {
      setUserBattalions(updateStateFn);
    }
  };

  attackIntervals[intervalKey] = setInterval(attackFn, attackInterval);
  attackFn();
};

export const createSetupBattalionAttacksWrapperHook = (
  attackIntervals: { [key: string]: NodeJS.Timeout },
  battalionRefs: { [key: string]: BattalionRef },
  setUserBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  onBattalionLoss: (type: string, name: string, quantity: number, mark?: number) => void,
  memoizedCalculations: any,
  findAvailableTargets: (battalion: BattalionPosition, isUser: boolean, userBattalions: BattalionPosition[], enemyBattalions: BattalionPosition[]) => BattleTarget[],
  moveBattalionAlongPath: (battalion: BattalionPosition, target: BattleTarget, isUser: boolean, userBattalions?: BattalionPosition[], enemyBattalions?: BattalionPosition[]) => void,
  battalionsRef: React.MutableRefObject<{ user: BattalionPosition[]; enemy: BattalionPosition[] }>,
  ATTACK_DELAY: number
) => {
  return useCallback((
    battalion: BattalionPosition,
    targetBattalion: BattalionPosition,
    isUser: boolean
  ) => {
    const { battalionId } = findBattalionIndexAndId(battalion, isUser, battalionsRef.current.user, battalionsRef.current.enemy);
    
    if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
      return;
    }

    const attackPower = getBotStats(battalion.type, isUser).stats.offense;
    const totalDamage = attackPower * battalion.quantity;
    const attackSpeed = getBotStats(battalion.type, isUser).stats.speed;
    const attackInterval = ATTACK_DELAY * (5 / attackSpeed);

    const enemyId = `${!isUser ? 'user' : 'enemy'}-${targetBattalion.type}-${targetBattalion.nodeIndex}`;
    const intervalKey = `${battalionId}-${enemyId}`;

    const onTargetDestroyed = (battalion: BattalionPosition, isUser: boolean) => {
      setTimeout(() => {
        const newTargets = findAvailableTargets(
          battalion,
          isUser,
          battalionsRef.current.user,
          battalionsRef.current.enemy
        );
        if (newTargets.length > 0) {
          moveBattalionAlongPath(
            battalion,
            newTargets[0],
            isUser,
            battalionsRef.current.user,
            battalionsRef.current.enemy
          );
        }
      }, 100);
    };

    const attackFn = () => {
      if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
        cleanupBattalion(battalionId, attackIntervals);
        return;
      }

      const updateStateFn = (prevBatts: BattalionPosition[]) => {
        const updatedBatts = [...prevBatts];
        const targetBatt = updatedBatts[targetBattalion.nodeIndex];
        
        if (!targetBatt || targetBatt.quantity <= 0 || (targetBatt.currentHealth ?? 0) <= 0) {
          cleanupBattalion(battalionId, attackIntervals);
          return prevBatts;
        }

        const wasDestroyed = updateBattalionHealth(targetBatt, (targetBatt.currentHealth ?? 0) - totalDamage);
        
        if (wasDestroyed) {
          onBattalionLoss(targetBatt.type, targetBatt.type, targetBatt.quantity, targetBatt.mark);
          onTargetDestroyed(battalion, isUser);
        }

        return updatedBatts;
      };

      if (isUser && setEnemyBattalions) {
        setEnemyBattalions(updateStateFn);
      } else if (!isUser && setUserBattalions) {
        setUserBattalions(updateStateFn);
      }
    };

    cleanupBattalion(battalionId, attackIntervals);
    attackIntervals[intervalKey] = setInterval(attackFn, attackInterval);
    attackFn();
  }, [attackIntervals, battalionRefs, setUserBattalions, setEnemyBattalions, onBattalionLoss, memoizedCalculations, findAvailableTargets, moveBattalionAlongPath, battalionsRef, ATTACK_DELAY]);
}; 