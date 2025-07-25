/**
 * @file AttackService.ts
 * @description Attack state management and coordination with combat system
 * 
 * AUTHORITY: Attack state tracking, starting/stopping attacks, capture triggers
 * OVERLAPS: Node capture detection - PRIMARY retargeting trigger point
 * CONFLICTS: Must stop ONLY attacks on captured node, not all attacks
 * DEPENDENCIES: CombatService for damage/capture, RetargetingService integration, BattalionService updates
 */

import { IBattalion, INode, NodeOwner } from '../types/battle';
import { CombatService } from './CombatService';

interface AttackState {
  battalionId: string;
  targetNodeIndex: number;
  lastAttackTime: number;
  attackInterval: number; // Based on speed stat
  isAttacking: boolean;
}

export class AttackService {
  private static attackStates = new Map<string, AttackState>();
  
  /**
   * Calculate attack interval from speed stat
   * Speed 1-10, where 10 is fastest
   * Example: speed 10 = 1000ms, speed 5 = 2000ms
   */
  static calculateAttackInterval(speedStat: number): number {
    return 3000 - (speedStat * 200); // 1000ms to 2800ms range
  }
  
  /**
   * Start periodic attacking for a battalion
   */
  static startAttacking(battalion: IBattalion, targetNodeIndex: number): void {
    const attackInterval = this.calculateAttackInterval(battalion.stats.speed);
    
    const attackState: AttackState = {
      battalionId: battalion.id,
      targetNodeIndex,
      lastAttackTime: Date.now(),
      attackInterval,
      isAttacking: true
    };
    
    this.attackStates.set(battalion.id, attackState);
    console.log(`⚔️ ${battalion.owner} ${battalion.type} started attacking node ${targetNodeIndex} (interval: ${attackInterval}ms)`);
  }
  
  /**
   * Stop attacking for a battalion (called when node captured)
   */
  static stopAttacking(battalionId: string): void {
    const attackState = this.attackStates.get(battalionId);
    if (attackState) {
      attackState.isAttacking = false;
      this.attackStates.delete(battalionId);
      console.log(`🛑 Battalion ${battalionId} stopped attacking`);
    }
  }
  
  /**
   * Process a single attack (reuse CombatService)
   * Returns true if node was captured
   */
  static processAttack(battalion: IBattalion, node: INode): boolean {
    if (!CombatService.canTargetNode(node)) {
      return false;
    }
    
    const damage = CombatService.calculateTugOfWarDamage(battalion);
    const captured = CombatService.applyTugOfWarDamage(node, damage, battalion.owner);
    
    console.log(`⚔️ ${battalion.owner} ${battalion.type} dealt ${damage} damage to node ${node.index} (progress: ${node.tugOfWarProgress}%)`);
    
    return captured;
  }
  
  /**
   * Get all battalions attacking a specific node
   */
  static getBattalionsAttackingNode(nodeIndex: number): string[] {
    const attackers: string[] = [];
    
    for (const [battalionId, attackState] of this.attackStates) {
      if (attackState.isAttacking && attackState.targetNodeIndex === nodeIndex) {
        attackers.push(battalionId);
      }
    }
    
    return attackers;
  }
  
  /**
   * Get all active attack states
   */
  static getActiveAttacks(): Map<string, AttackState> {
    return new Map(this.attackStates);
  }
  
  /**
   * Check if a battalion is currently attacking
   */
  static isAttacking(battalionId: string): boolean {
    const attackState = this.attackStates.get(battalionId);
    return attackState?.isAttacking || false;
  }
  
  /**
   * Get attack state for a battalion
   */
  static getAttackState(battalionId: string): AttackState | undefined {
    return this.attackStates.get(battalionId);
  }
  
  /**
   * Clear all attack states (for battle cleanup)
   */
  static clearAllAttacks(): void {
    this.attackStates.clear();
  }

  /**
   * Process all active attacks (moved from MovementService)
   */
  static async processActiveAttacks(battle: any): Promise<void> {
    for (const [battalionId, attackState] of this.getActiveAttacks()) {
      if (Date.now() - attackState.lastAttackTime >= attackState.attackInterval) {
        const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
        const node = battle.nodes.find((n: INode) => n.index === attackState.targetNodeIndex);
        
        if (battalion && node && CombatService.canTargetNode(node)) {
          const captured = this.processAttack(battalion, node);
          
          // Update last attack time
          attackState.lastAttackTime = Date.now();
          
          if (captured) {
            // Notify all attacking battalions to stop
            const attackers = this.getBattalionsAttackingNode(node.index);
            attackers.forEach(id => this.stopAttacking(id));
            console.log(`🏆 NODE CAPTURED: Node ${node.index} captured by ${node.owner}!`);
          }
          
          // Save the updated battle state
          await battle.save();
        }
      }
    }
  }
} 