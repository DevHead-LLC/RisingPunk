import { useCallback } from 'react';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { updateBattalionHealth } from '../utils/healthUtils';
import type { BattalionPosition, BattleTarget, BattleNode } from '../types/battle';

// ============================================================================
// COMBAT LOGIC
// ============================================================================

/**
 * Setup attacks for a battalion against a target
 */
const setupAttacks = (
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

  const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
  const attackInterval = 2000 * (5 / attackSpeed);
  const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
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

/**
 * Setup node attack logic
 */
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

  // Set up recurring attacks
  const intervalKey = `${battalionId}-node-${target.index}`;
  const attackFn = () => {
    if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
      cleanupBattalion(battalionId, attackIntervals);
      return;
    }

    const node = nodes[target.index];
    // Only retarget if node is not neutral (captured)
    if (node.controlState !== 'neutral') {
      cleanupBattalion(battalionId, attackIntervals);
      battalion.targetNode = undefined;
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
      if (newTargets.length > 0) {
        moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
      }
    }

    // Apply damage
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
  // Execute first attack immediately
  attackFn();
};

/**
 * Setup battalion attack logic
 */
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
      
      // Schedule retargeting if target was destroyed
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
        }, 0);
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
  // Execute first attack immediately
  attackFn();
};

/**
 * Handle battalion damage and destruction
 * Consolidated version that combines the best parts from all implementations
 */
const handleBattalionDamage = (
  battalion: BattalionPosition,
  damage: number,
  isUser: boolean,
  setUserBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  onBattalionLoss: (type: string, name: string, quantity: number, mark?: number) => void
): boolean => {
  const healthPerBot = BOT_CATEGORIES[battalion.type].stats.health;
  const botsLost = Math.floor(damage / healthPerBot);
  
  if (botsLost > 0) {
    const newQuantity = Math.max(0, battalion.quantity - botsLost);
    
    const updateStateFn = (prevBatts: BattalionPosition[]) => {
      return prevBatts.map(b => 
        b.nodeIndex === battalion.nodeIndex 
          ? { 
              ...b, 
              quantity: newQuantity,
              currentHealth: Math.max(0, (b.currentHealth || 0) - damage)
            }
          : b
      );
    };

    if (isUser) {
      setUserBattalions(updateStateFn);
    } else {
      setEnemyBattalions(updateStateFn);
    }

    // Record the loss
    onBattalionLoss(
      isUser ? 'user' : 'enemy',
      `${battalion.type}-${battalion.nodeIndex}`,
      botsLost,
      battalion.mark || 1 // Default to mark 1 if not specified
    );

    return newQuantity === 0; // Return true if battalion is destroyed
  }
  return false;
};

/**
 * Check if a battalion is in attack range of a target
 */
const isInAttackRange = (
  battalion: BattalionPosition,
  target: BattleTarget,
  nodes: BattleNode[]
): boolean => {
  const battalionRange = BOT_CATEGORIES[battalion.type].stats.range * RANGE_MULTIPLIER;
  
  if (target.type === 'node') {
    const node = nodes[target.index];
    const distance = Math.sqrt(
      Math.pow(node.x - battalion.position.x._value, 2) + 
      Math.pow(node.y - battalion.position.y._value, 2)
    );
    return distance <= battalionRange;
  } else {
    // For battalion targets, we'd need the target battalion's position
    // This is handled in the movement logic
    return false;
  }
};

export { 
  setupAttacks, 
  setupNodeAttack, 
  setupBattalionAttack, 
  handleBattalionDamage, 
  isInAttackRange 
}; 