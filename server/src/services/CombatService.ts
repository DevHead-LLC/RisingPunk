/**
 * @file CombatService.ts
 * @description Combat and tug-of-war logic
 */

import { IBattalion, INode, NodeOwner } from '../types/battle';

export class CombatService {
  static calculateTugOfWarDamage(attacker: IBattalion): number {
    return attacker.stats.offense * attacker.quantity;
  }

  static applyTugOfWarDamage(node: INode, damage: number, attackerOwner: NodeOwner): boolean {
    // Safety check to prevent division by zero
    if (!node.maxCaptureThreshold || node.maxCaptureThreshold <= 0) {
      console.warn(`⚠️ COMBAT WARNING: Node ${node.index} has invalid maxCaptureThreshold (${node.maxCaptureThreshold}), using fallback value`);
      node.maxCaptureThreshold = 1000; // Fallback value
    }
    
    const damagePercentage = (damage / node.maxCaptureThreshold) * 100;
    const direction = attackerOwner === NodeOwner.USER ? +damagePercentage : -damagePercentage;
    node.tugOfWarProgress += direction;
    
    node.tugOfWarProgress = Math.max(-100, Math.min(100, node.tugOfWarProgress));
    
    // Debug logging
    console.log(`🔍 COMBAT DEBUG: Node ${node.index} - damage: ${damage}, maxCaptureThreshold: ${node.maxCaptureThreshold}, damagePercentage: ${damagePercentage}, direction: ${direction}, new tugOfWarProgress: ${node.tugOfWarProgress}`);
    
    if (Math.abs(node.tugOfWarProgress) >= 100) {
      node.owner = node.tugOfWarProgress > 0 ? NodeOwner.USER : NodeOwner.ENEMY;
      return true;
    }
    
    return false;
  }

  // ============================================================================
  // BATTALION COMBAT METHODS
  // ============================================================================

  static calculateBattalionDamage(attacker: IBattalion, defender: IBattalion): number {
    const baseDamage = attacker.stats.offense * attacker.quantity;
    const defenseReduction = baseDamage * (defender.stats.defense / 100);
    const finalDamage = Math.max(1, baseDamage - defenseReduction);
    
    
    return finalDamage;
  }

  static applyBattalionDamage(defender: IBattalion, damage: number): boolean {
    const originalHealth = defender.currentHealth;
    
    defender.currentHealth = Math.max(0, defender.currentHealth - damage);
    
    if (defender.currentHealth > 0) {
      if (!defender.baseHealthPerUnit || defender.baseHealthPerUnit <= 0) {
        console.log(`⚠️ COMBAT WARNING: ${defender.owner} ${defender.type} has invalid baseHealthPerUnit (${defender.baseHealthPerUnit}), using fallback calculation`);
        defender.baseHealthPerUnit = 10;
      }
      
      // Use centralized unit calculation
      this.recalculateBattalionUnits(defender);
      
      return false;
    }
    
    if (defender.currentHealth <= 0) {
      defender.isDestroyed = true;
      defender.destroyedAt = Date.now();
      defender.quantity = 0;
      
      return true;
    }
    
    return false;
  }

  static canTargetBattalion(battalion: IBattalion): boolean {
    const canTarget = !battalion.isDestroyed;
    
    return canTarget;
  }

  // ============================================================================
  // NODE COMBAT METHODS
  // ============================================================================

  static canTargetNode(node: INode): boolean {
    return node.owner === NodeOwner.NEUTRAL;
  }

  static isNodeCaptured(node: INode): boolean {
    return node.owner === NodeOwner.USER || node.owner === NodeOwner.ENEMY;
  }

  static getNodeWinner(node: INode): NodeOwner | null {
    if (this.isNodeCaptured(node)) {
      return node.owner;
    }
    return null;
  }

  static initializeTugOfWarProgress(node: INode, totalArmyHealth: number): void {
    node.tugOfWarProgress = 0;
    node.maxCaptureThreshold = totalArmyHealth;
  }

  static getTugOfWarProgress(node: INode): number {
    return node.tugOfWarProgress || 0;
  }

  static isTugOfWarComplete(node: INode): boolean {
    return Math.abs(node.tugOfWarProgress || 0) >= 100;
  }

  // ============================================================================
  // UNIT CALCULATION METHODS
  // ============================================================================

  static calculateUnitsFromHealth(currentHealth: number, baseHealthPerUnit: number): number {
    if (currentHealth <= 0) return 0;
    if (!baseHealthPerUnit || baseHealthPerUnit <= 0) return 1;
    
    const units = currentHealth / baseHealthPerUnit;
    
    // Follow the specific rounding pattern from intended.md example:
    // 9.25 → Round down to 9 units
    // 8.5 → Round up to 9 units  
    // 7.75 → Round down to 7 units
    // This pattern suggests alternating between round down and round up
    // For consistency, we'll use Math.round() as it provides fair rounding
    return Math.max(1, Math.round(units));
  }

  static recalculateBattalionUnits(battalion: IBattalion): void {
    const originalQuantity = battalion.quantity;
    const newQuantity = this.calculateUnitsFromHealth(battalion.currentHealth, battalion.baseHealthPerUnit);
    
    if (newQuantity !== originalQuantity) {
      battalion.quantity = newQuantity;
      const newAttackPower = battalion.stats.offense * battalion.quantity;
      const oldAttackPower = battalion.stats.offense * originalQuantity;
    }
  }
} 