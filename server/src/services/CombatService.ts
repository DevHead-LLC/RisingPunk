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
    const damagePercentage = (damage / node.maxCaptureThreshold) * 100;
    const direction = attackerOwner === NodeOwner.USER ? +damagePercentage : -damagePercentage;
    node.tugOfWarProgress += direction;
    
    node.tugOfWarProgress = Math.max(-100, Math.min(100, node.tugOfWarProgress));
    
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
    
    console.log(`📊 DAMAGE CALCULATION: ${attacker.owner} ${attacker.type} (${attacker.stats.offense}×${attacker.quantity}=${baseDamage}) attacks ${defender.owner} ${defender.type} (${defender.stats.defense}% defense) → ${defenseReduction.toFixed(1)} reduction = ${finalDamage} final damage`);
    
    return finalDamage;
  }

  static applyBattalionDamage(defender: IBattalion, damage: number): boolean {
    const originalHealth = defender.currentHealth;
    const originalQuantity = defender.quantity;
    
    defender.currentHealth = Math.max(0, defender.currentHealth - damage);
    
    if (defender.currentHealth > 0) {
      if (!defender.baseHealthPerUnit || defender.baseHealthPerUnit <= 0) {
        console.log(`⚠️ COMBAT WARNING: ${defender.owner} ${defender.type} has invalid baseHealthPerUnit (${defender.baseHealthPerUnit}), using fallback calculation`);
        defender.baseHealthPerUnit = 10;
      }
      
      const newQuantity = Math.round(defender.currentHealth / defender.baseHealthPerUnit);
      defender.quantity = Math.max(1, newQuantity);
      
      if (defender.quantity !== originalQuantity) {
        const newAttackPower = defender.stats.offense * defender.quantity;
        const oldAttackPower = defender.stats.offense * originalQuantity;
        console.log(`📊 UNIT REDUCTION: ${defender.owner} ${defender.type} units: ${originalQuantity} → ${defender.quantity} (attack power: ${oldAttackPower} → ${newAttackPower})`);
      }
      
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
    
    if (!canTarget) {
      console.log(`🚫 TARGETING BLOCKED: ${battalion.owner} ${battalion.type} cannot be targeted (destroyed: ${battalion.isDestroyed})`);
    }
    
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
} 