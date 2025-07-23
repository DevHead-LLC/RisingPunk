/**
 * @file AttackService.ts
 * @description Periodic attack management for battalion combat
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
} 