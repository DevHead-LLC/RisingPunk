/**
 * @file CombatService.ts
 * @description Combat and tug-of-war logic (extracted from BattleService.ts)
 * 
 * AUTHORITY: Damage calculation and node capture determination + BATTALION COMBAT
 * OVERLAPS: Node capture detection triggers retargeting - CRITICAL INTEGRATION POINT
 * CONFLICTS: Must coordinate with AttackService.stopAttacking() during retargeting
 * DEPENDENCIES: AttackService for capture notifications, RetargetingService integration
 * 
 * PHASE 1 EXTENSION: Added battalion-to-battalion combat methods for damage calculation,
 * health management, unit count recalculation, and destruction detection.
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

  // ============================================================================
  // BATTALION COMBAT METHODS - PHASE 1 IMPLEMENTATION
  // ============================================================================

  /**
   * Calculate battalion-to-battalion damage with defense reduction
   * 
   * INTENDED.MD SPECIFICATION:
   * - Base damage = attacker.stats.offense × attacker.quantity  
   * - Defense reduction = base_damage × (defender.stats.defense / 100)
   * - Final damage = base_damage - defense_reduction
   * 
   * EXAMPLE: User guardian (offense=10, quantity=10) attacks enemy guardian (defense=25%)
   * - Base damage: 10 × 10 = 100
   * - Defense reduction: 100 × (25/100) = 25  
   * - Final damage: 100 - 25 = 75
   * 
   * @param attacker - The battalion dealing damage
   * @param defender - The battalion receiving damage  
   * @returns The final damage amount after defense reduction (floored to integer)
   */
  static calculateBattalionDamage(attacker: IBattalion, defender: IBattalion): number {
    // Calculate base damage using same pattern as node attacks (offense × quantity)
    const baseDamage = attacker.stats.offense * attacker.quantity;
    
    // Calculate defense reduction as percentage of base damage
    const defenseReduction = baseDamage * (defender.stats.defense / 100);
    
    // Apply defense reduction and floor to integer for clean damage values
    const finalDamage = Math.floor(baseDamage - defenseReduction);
    
    // Log detailed damage calculation for debugging and readability
    console.log(`📊 DAMAGE CALCULATION: ${attacker.owner} ${attacker.type} (${attacker.stats.offense}×${attacker.quantity}=${baseDamage}) attacks ${defender.owner} ${defender.type} (${defender.stats.defense}% defense) → ${defenseReduction} reduction = ${finalDamage} final damage`);
    
    return finalDamage;
  }

  /**
   * Apply damage to a battalion and update health/unit count/destruction status
   * 
   * INTENDED.MD SPECIFICATION:
   * - Reduce currentHealth by damage amount
   * - Recalculate unit count: Math.round(currentHealth / baseHealthPerUnit)
   * - Update quantity to match new unit count
   * - If health ≤ 0: mark as destroyed, set quantity to 0
   * 
   * UNIT COUNT EXAMPLE:
   * - Initial: 1000 health, 100 per unit = 10 units
   * - After 75 damage: 925 health → Math.round(925/100) = 9 units
   * - Attack power updates: offense × current_quantity
   * 
   * @param defender - The battalion receiving damage (modified in place)
   * @param damage - The damage amount to apply
   * @returns true if battalion was destroyed, false if still alive
   */
  static applyBattalionDamage(defender: IBattalion, damage: number): boolean {
    // Store original values for detailed logging
    const originalHealth = defender.currentHealth;
    const originalQuantity = defender.quantity;
    
    // Apply damage, ensuring health never goes below 0
    defender.currentHealth = Math.max(0, defender.currentHealth - damage);
    
    console.log(`⚔️ DAMAGE APPLIED: ${defender.owner} ${defender.type} health: ${originalHealth} → ${defender.currentHealth} (-${damage} damage)`);
    
    // Recalculate unit count based on remaining health if battalion is still alive
    if (defender.currentHealth > 0 && defender.baseHealthPerUnit) {
      // Use Math.round for consistent behavior as specified in intended.md
      const newQuantity = Math.round(defender.currentHealth / defender.baseHealthPerUnit);
      
      // Ensure at least 1 unit remains if health > 0 (prevents 0-unit alive battalions)
      defender.quantity = Math.max(1, newQuantity);
      
      // Log unit count changes for battle tracking
      if (defender.quantity !== originalQuantity) {
        const newAttackPower = defender.stats.offense * defender.quantity;
        const oldAttackPower = defender.stats.offense * originalQuantity;
        console.log(`📊 UNIT REDUCTION: ${defender.owner} ${defender.type} units: ${originalQuantity} → ${defender.quantity} (attack power: ${oldAttackPower} → ${newAttackPower})`);
      }
      
      return false; // Battalion still alive
    }
    
    // Battalion health reached 0 - mark as destroyed
    if (defender.currentHealth <= 0) {
      defender.isDestroyed = true;
      defender.destroyedAt = Date.now();
      defender.quantity = 0; // No units remaining
      
      console.log(`💀 BATTALION DESTROYED: ${defender.owner} ${defender.type} eliminated (health reached 0)`);
      return true; // Battalion destroyed
    }
    
    return false; // Battalion still alive (fallback case)
  }

  /**
   * Check if a battalion can be targeted for combat
   * 
   * INTENDED.MD SPECIFICATION:
   * - Destroyed battalions cannot be targeted
   * - Cannot be attacked, receive damage, or be visible
   * 
   * @param battalion - The battalion to check
   * @returns true if battalion can be targeted, false if destroyed/untargetable
   */
  static canTargetBattalion(battalion: IBattalion): boolean {
    const canTarget = !battalion.isDestroyed;
    
    if (!canTarget) {
      console.log(`🚫 TARGETING BLOCKED: ${battalion.owner} ${battalion.type} cannot be targeted (destroyed: ${battalion.isDestroyed})`);
    }
    
    return canTarget;
  }

  // ============================================================================
  // EXISTING NODE COMBAT METHODS (UNCHANGED)
  // ============================================================================

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