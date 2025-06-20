/**
 * @file healthUtils.ts
 * @description Centralized health management and calculation utilities for the battle system
 */

import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { BattalionPosition } from '../types/battle';

/**
 * Calculates the max health for a battalion based on type and quantity
 */
export function calculateBattalionHealth(type: string, quantity: number): number {
  return BOT_CATEGORIES[type].stats.health * quantity;
}

/**
 * Updates a battalion's health and quantity after taking damage
 * Returns true if the battalion is destroyed (health <= 0)
 */
export function updateBattalionHealth(battalion: BattalionPosition, newHealth: number): boolean {
  const healthPerUnit = BOT_CATEGORIES[battalion.type].stats.health;
  battalion.currentHealth = Math.max(0, newHealth);
  battalion.quantity = Math.ceil(battalion.currentHealth / healthPerUnit);
  return battalion.currentHealth <= 0;
}

/**
 * Handles battalion damage, updates state, and returns true if destroyed
 * Optionally calls a loss callback
 */
export function handleBattalionDamage(
  battalion: BattalionPosition,
  damage: number,
  setBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  onBattalionLoss?: (battalionId: string, quantity: number, mark: number) => void
): boolean {
  const healthPerBot = BOT_CATEGORIES[battalion.type].stats.health;
  const botsLost = Math.floor(damage / healthPerBot);
  if (botsLost > 0) {
    setBattalions(prev => prev.map(b =>
      b.nodeIndex === battalion.nodeIndex
        ? { ...b, quantity: Math.max(0, b.quantity - botsLost), currentHealth: Math.max(0, (b.currentHealth || 0) - damage) }
        : b
    ));
    if (onBattalionLoss) {
      onBattalionLoss(`${battalion.type}-${battalion.nodeIndex}`, botsLost, battalion.mark || 1);
    }
    return (battalion.quantity - botsLost) <= 0;
  }
  return false;
}

/**
 * Calculates initial node health based on all battalions
 */
export function calculateInitialNodeHealth(userBattalions: BattalionPosition[], enemyBattalions: BattalionPosition[]): number {
  let total = 0;
  userBattalions.forEach(battalion => {
    total += calculateBattalionHealth(battalion.type, battalion.quantity);
  });
  enemyBattalions.forEach(battalion => {
    total += calculateBattalionHealth(battalion.type, battalion.quantity);
  });
  return Math.floor(total * 0.75); // 75% of total army health
} 