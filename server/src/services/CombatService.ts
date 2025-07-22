/**
 * @file CombatService.ts
 * @description Combat and tug-of-war logic (extracted from BattleService.ts)
 */

import { IBattalion, INode, NodeOwner } from '../types/battle';

export class CombatService {
  /**
   * Calculate tug-of-war damage from attacker battalion
   * REUSE: battalion.stats.offense pattern for damage
   */
  static calculateTugOfWarDamage(attacker: IBattalion): number {
    return attacker.stats.offense * attacker.quantity;
  }

  /**
   * Apply tug-of-war damage to a node
   * USER'S TUG-OF-WAR FORMULA: ± total army health as percentage
   * Returns true if node was captured
   */
  static applyTugOfWarDamage(node: INode, damage: number, attackerOwner: NodeOwner): boolean {
    // Convert damage to percentage of total army health
    const damagePercentage = (damage / node.maxCaptureThreshold) * 100;
    const direction = attackerOwner === NodeOwner.USER ? +damagePercentage : -damagePercentage;
    node.tugOfWarProgress += direction;
    
    // Clamp to -100 to +100 range
    node.tugOfWarProgress = Math.max(-100, Math.min(100, node.tugOfWarProgress));
    
    // USER REQUIREMENT: First to ±100% wins permanently
    if (Math.abs(node.tugOfWarProgress) >= 100) {
      node.owner = node.tugOfWarProgress > 0 ? NodeOwner.USER : NodeOwner.ENEMY;
      // USER REQUIREMENT: Captured nodes become untargetable
      return true; // Indicate capture occurred
    }
    
    return false; // No capture
  }

  /**
   * Check if a node can be targeted (only neutral nodes)
   * USER REQUIREMENT: ONLY neutral nodes can be attacked
   */
  static canTargetNode(node: INode): boolean {
    return node.owner === NodeOwner.NEUTRAL;
  }

  /**
   * Check if a node has been captured
   * USER REQUIREMENT: Permanent capture detection
   */
  static isNodeCaptured(node: INode): boolean {
    return node.owner === NodeOwner.USER || node.owner === NodeOwner.ENEMY;
  }

  /**
   * Get the winner of a node capture
   * USER REQUIREMENT: Determine capture winner
   */
  static getNodeWinner(node: INode): NodeOwner | null {
    if (this.isNodeCaptured(node)) {
      return node.owner;
    }
    return null;
  }

  /**
   * Calculate total army health for capture threshold
   * REUSE: calculateBattalionHealth() utility pattern
   */
  static calculateTotalArmyHealth(battalions: IBattalion[]): number {
    return battalions.reduce((total, battalion) => {
      return total + (battalion.stats.health * battalion.quantity);
    }, 0);
  }

  /**
   * Initialize tug-of-war progress for neutral nodes
   * USER REQUIREMENT: Start at 0
   */
  static initializeTugOfWarProgress(node: INode, totalArmyHealth: number): void {
    node.tugOfWarProgress = 0;
    node.maxCaptureThreshold = totalArmyHealth; // Used for damage percentage calculation
  }

  /**
   * Get tug-of-war progress percentage
   * USER REQUIREMENT: -100 to +100 range
   */
  static getTugOfWarProgress(node: INode): number {
    return node.tugOfWarProgress || 0;
  }

  /**
   * Check if tug-of-war is complete (someone won)
   * USER REQUIREMENT: First to ±100% wins permanently
   */
  static isTugOfWarComplete(node: INode): boolean {
    return Math.abs(node.tugOfWarProgress || 0) >= 100;
  }
} 