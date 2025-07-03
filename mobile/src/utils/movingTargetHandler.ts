import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from './battleConstants';
import { getAttackRangeIntersectionPoint } from '../hooks/useBattleEngine';

export interface MovingTargetTracker {
  targetBattalion: any;
  lastPosition: { x: number, y: number };
  isUser: boolean;
  userBattalions: any[];
  enemyBattalions: any[];
  updateTargetPosition: () => { hasChanged: boolean; newPos: { x: number, y: number } };
  recalculateIntersection: (attackerPos: { x: number, y: number }, attackRange: number) => { x: number, y: number };
  validateAttackerPosition: (attackerPos: { x: number, y: number }, targetPos: { x: number, y: number }, attackRange: number) => { isValid: boolean; reason?: string };
}

export function createMovingTargetTracker(
  targetBattalion: any,
  isUser: boolean,
  userBattalions: any[],
  enemyBattalions: any[]
): MovingTargetTracker {
  const lastPosition = { x: targetBattalion.position.x._value || 0, y: targetBattalion.position.y._value || 0 };
  
  return {
    targetBattalion,
    lastPosition,
    isUser,
    userBattalions,
    enemyBattalions,
    
    updateTargetPosition: () => {
      const currentPos = { 
        x: targetBattalion.position.x._value || 0, 
        y: targetBattalion.position.y._value || 0 
      };
      
      const hasChanged = currentPos.x !== lastPosition.x || currentPos.y !== lastPosition.y;
      
      if (hasChanged) {
        lastPosition.x = currentPos.x;
        lastPosition.y = currentPos.y;
      }
      
      return { hasChanged, newPos: currentPos };
    },
    
    recalculateIntersection: (attackerPos: { x: number, y: number }, attackRange: number) => {
      const currentTargetPos = { 
        x: targetBattalion.position.x._value || 0, 
        y: targetBattalion.position.y._value || 0 
      };
      
      return getAttackRangeIntersectionPoint(attackerPos, currentTargetPos, attackRange);
    },
    
    validateAttackerPosition: (attackerPos: { x: number, y: number }, targetPos: { x: number, y: number }, attackRange: number) => {
      const dx = attackerPos.x - targetPos.x;
      const dy = attackerPos.y - targetPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if attacker is within attack range (with small tolerance)
      const tolerance = 5; // 5 pixel tolerance
      const isValid = Math.abs(distance - attackRange) <= tolerance;
      
      return {
        isValid,
        reason: isValid ? undefined : `Distance ${distance.toFixed(1)} is outside attack range ${attackRange}`
      };
    }
  };
}

export function handleMovingTargetUpdates(
  movingTargetTracker: MovingTargetTracker,
  attackerBattalion: any,
  currentAttackerPos: { x: number, y: number },
  onPathAdjustment: (newIntersection: { x: number, y: number }) => void
): boolean {
  const positionUpdate = movingTargetTracker.updateTargetPosition();
  
  if (positionUpdate.hasChanged) {
    const attackRange = BOT_CATEGORIES[attackerBattalion.type].stats.range * RANGE_MULTIPLIER;
    
    // Recalculate intersection point with new target position
    const newIntersection = movingTargetTracker.recalculateIntersection(currentAttackerPos, attackRange);
    
    // Validate current attacker position
    const positionValidation = movingTargetTracker.validateAttackerPosition(
      currentAttackerPos, 
      positionUpdate.newPos, 
      attackRange
    );
    
    if (!positionValidation.isValid) {
      console.log('[Step 4.3 Moving Target] Target moved:', { 
        targetId: movingTargetTracker.targetBattalion.id || 'unknown',
        oldPos: movingTargetTracker.lastPosition, 
        newPos: positionUpdate.newPos, 
        intersectionPoint: newIntersection 
      });
      
      console.log('[Step 4.3 Moving Target] Path adjustment:', { 
        oldPath: currentAttackerPos, 
        newPath: newIntersection, 
        reason: 'Target moved, recalculating intersection' 
      });
      
      console.log('[Step 4.3 Moving Target] Position validation:', { 
        attackerPos: currentAttackerPos, 
        targetPos: positionUpdate.newPos, 
        isValid: positionValidation.isValid,
        reason: positionValidation.reason 
      });
      
      // Adjust movement path to new intersection point
      onPathAdjustment(newIntersection);
      return true; // Path was adjusted
    }
  }
  
  return false; // No path adjustment needed
} 