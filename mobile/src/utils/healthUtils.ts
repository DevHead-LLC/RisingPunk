/**
 * @file healthUtils.ts
 * @description Centralized health management and calculation utilities for the battle system
 */

import { BOT_CATEGORIES } from './battleConstants';
import { BattalionPosition } from '../types/battle';

/**
 * Calculates the max health for a battalion based on type and quantity
 */
export function calculateBattalionHealth(type: string, quantity: number): number {
  return BOT_CATEGORIES?.[type]?.stats?.health * quantity || 0;
}

/**
 * Updates a battalion's health and quantity after taking damage
 * Returns true if the battalion is destroyed (health <= 0)
 */
export function updateBattalionHealth(battalion: BattalionPosition, newHealth: number): boolean {
  const healthPerUnit = BOT_CATEGORIES?.[battalion.type]?.stats?.health || 0;
  battalion.currentHealth = Math.max(0, newHealth);
  battalion.quantity = Math.ceil(battalion.currentHealth / healthPerUnit);
  return battalion.currentHealth <= 0;
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