/**
 * @file BattalionService.ts
 * @description Battalion creation and business logic authority
 */

import { IBattalion, INode, NodeOwner, BotType } from '../types/battle';
import { BOT_CONFIG } from './BotService';
import { NETWORK_CONNECTIONS } from '../config/networkConfig';
import { MovementService } from './MovementService';
import { MovementState } from '../../../mobile/src/types/battleTypes';
import { CombatService } from './CombatService';
import { AttackService } from './AttackService';
import { Battle } from '../models/Battle';

export interface BattalionTargetingResult {
  battalionId: string;
  battalionType: BotType;
  battalionOwner: NodeOwner;
  startingNode: number;
  targetNode: number;
  isValidTarget: boolean;
  reason?: string;
}

export class BattalionService {
  private static targetingResults: Map<string, BattalionTargetingResult[]> = new Map();
  private static movementStates: Map<string, Map<string, MovementState>> = new Map(); // battleId -> battalionId -> MovementState
  private static movementIntervals: Map<string, NodeJS.Timeout> = new Map(); // battleId -> movement interval
  private static battleScreenDimensions: Map<string, { width: number; height: number }> = new Map(); // battleId -> screen dimensions

  /**
   * Trigger initial targeting for a battle and store results
   */
  static async triggerInitialTargeting(battalions: IBattalion[], nodes: INode[], battleId: string): Promise<BattalionTargetingResult[]> {
    console.log('🎯 TRIGGERING INITIAL TARGETING for battle:', battleId);
    
    // Assign initial targets to all battalions
    const results = this.assignInitialTargets(battalions, nodes);
    this.targetingResults.set(battleId, results);
    
    return results;
  }

  /**
   * Get current targeting results for a specific battle
   */
  static getTargetingResults(battleId?: string): BattalionTargetingResult[] {
    if (!battleId) {
      return [];
    }
    return this.targetingResults.get(battleId) || [];
  }

  /**
   * Clear targeting results for a battle (cleanup)
   */
  static clearTargetingResults(battleId: string): void {
    this.targetingResults.delete(battleId);
  }

  /**
   * Get battle by ID
   */
  static async getBattle(battleId: string): Promise<any> {
    return Battle.findOne({ battleId });
  }

  /**
   * Get current movement states for a specific battle
   */
  static getMovementStates(battleId: string): Map<string, MovementState> {
    return this.movementStates.get(battleId) || new Map();
  }

  /**
   * Store screen dimensions for a battle (called when client requests battle state)
   */
  static setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    this.battleScreenDimensions.set(battleId, { width, height });
  }

  /**
   * Get screen dimensions for a battle (for movement calculations)
   */
  static getBattleScreenDimensions(battleId: string): { width: number; height: number } {
    const dimensions = this.battleScreenDimensions.get(battleId);
    if (!dimensions) {
      throw new Error(`Screen dimensions not set for battle ${battleId}`);
    }
    return dimensions;
  }

  /**
   * Start smooth movement updates (separate from timer) at 100ms intervals
   */
  static startMovementUpdates(battleId: string): void {
    // Don't start if already running
    if (this.movementIntervals.has(battleId)) {
      return;
    }

    console.log(`🏃 STARTING MOVEMENT UPDATES for battle ${battleId} (100ms intervals)`);

    const movementInterval = setInterval(async () => {
      // Get battle and targeting results for movement updates
      const battle = await this.getBattle(battleId);
      const targetingResults = this.getTargetingResults(battleId);
      await this.updateBattleMovement(battleId, battle, targetingResults);
    }, 100); // 100ms for smooth movement

    this.movementIntervals.set(battleId, movementInterval);
  }

  /**
   * Stop movement updates for a battle
   */
  static stopMovementUpdates(battleId: string): void {
    const interval = this.movementIntervals.get(battleId);
    if (interval) {
      clearInterval(interval);
      this.movementIntervals.delete(battleId);
      console.log(`⏹️ STOPPED MOVEMENT UPDATES for battle ${battleId}`);
    }
    
    // Clean up screen dimensions and movement states for this battle
    this.battleScreenDimensions.delete(battleId);
    this.movementStates.delete(battleId);
  }

  /**
   * Update battle movement for all battalions (called every 100ms)
   */
  static async updateBattleMovement(battleId: string, battle: any, targetingResults: BattalionTargetingResult[]): Promise<void> {
    if (!battle) return;

    if (targetingResults.length === 0) return;

    // Ensure movement states map exists for this battle
    if (!this.movementStates.has(battleId)) {
      this.movementStates.set(battleId, new Map());
    }
    
    const battleMovementStates = this.movementStates.get(battleId)!;
    let activeMovements = 0;
    
    // For each battalion with valid target, call MovementService.initiateMovement()
    for (const targetResult of targetingResults) {
      const battalion = battle.battalions.find((b: IBattalion) => b.id === targetResult.battalionId);
      if (!battalion || targetResult.targetNode === -1) continue;

      // Check if movement already exists for this battalion
      let movementState = battleMovementStates.get(battalion.id);
      
      if (!movementState) {
        // Only start movement if screen dimensions are available
        try {
          const screenDimensions = this.getBattleScreenDimensions(battleId);
          
          // Initiate new movement using actual client screen dimensions
          movementState = MovementService.initiateMovement(
            battalion,
            targetResult.targetNode,
            screenDimensions.width,
            screenDimensions.height
          );
          battleMovementStates.set(battalion.id, movementState);
          console.log(`🚀 Started movement for ${battalion.owner} ${battalion.type} to node ${targetResult.targetNode}`);
        } catch (error) {
          // Skip movement until screen dimensions are set by client
          console.log(`⏳ Waiting for screen dimensions before starting movement for ${battalion.owner} ${battalion.type}`);
          continue;
        }
        
        // Movement initiated successfully
      } else if (movementState.movementStatus === 'moving') {
        // Check if movement is complete using MovementService.updateMovementProgress()
        const updatedMovementState = MovementService.updateMovementProgress(
          movementState,
          100, // 100ms deltaTime (unused in new time-based approach)
          battalion.stats.speed,
          0, // screenWidth (unused)
          0  // screenHeight (unused)
        );
        battleMovementStates.set(battalion.id, updatedMovementState);
        
        // Log movement status changes
        if (updatedMovementState.movementStatus === 'arrived') {
          console.log(`✅ ${battalion.owner} ${battalion.type} ARRIVED at node ${updatedMovementState.targetPosition.nodeIndex}`);
          
          // Start periodic attacking when battalion arrives at target
          const targetNode = battle.nodes.find((n: INode) => n.index === updatedMovementState.targetPosition.nodeIndex);
          if (targetNode && CombatService.canTargetNode(targetNode)) {
            AttackService.startAttacking(battalion, targetNode.index);
          }
        }
      }
      
      if (movementState?.movementStatus === 'moving') {
        activeMovements++;
      }
    }
    
    // Log active movements periodically
    if (activeMovements > 0 && Date.now() % 2000 < 100) { // Every ~2 seconds
      console.log(`📊 ACTIVE MOVEMENTS: ${activeMovements} battalions moving`);
    }
    
    // Process all active attacks
    for (const [battalionId, attackState] of AttackService.getActiveAttacks()) {
      if (Date.now() - attackState.lastAttackTime >= attackState.attackInterval) {
        const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
        const node = battle.nodes.find((n: INode) => n.index === attackState.targetNodeIndex);
        
        if (battalion && node && CombatService.canTargetNode(node)) {
          const captured = AttackService.processAttack(battalion, node);
          
          // Update last attack time
          attackState.lastAttackTime = Date.now();
          
          if (captured) {
            // Notify all attacking battalions to stop
            const attackers = AttackService.getBattalionsAttackingNode(node.index);
            attackers.forEach(id => AttackService.stopAttacking(id));
            console.log(`🏆 NODE CAPTURED: Node ${node.index} captured by ${node.owner}!`);
          }
          
          // Save the updated battle state
          await battle.save();
        }
      }
    }
  }

  /**
   * Assign initial random targets to all battalions
   */
  private static assignInitialTargets(battalions: IBattalion[], nodes: INode[]): BattalionTargetingResult[] {
    const results: BattalionTargetingResult[] = [];
    
    // Get neutral nodes (3, 4, 5)
    const neutralNodes = nodes.filter(node => node.owner === NodeOwner.NEUTRAL);
    const neutralNodeIndices = neutralNodes.map(node => node.index);
    
    console.log('🎯 INITIAL TARGETING START');
    console.log(`📊 Neutral nodes available: [${neutralNodeIndices.join(', ')}]`);
    
    // Process all battalions
    battalions.forEach(battalion => {
      const ownerLabel = battalion.owner === NodeOwner.USER ? 'user' : 'enemy';
      const result = this.assignTargetToBattalion(battalion, neutralNodeIndices, ownerLabel);
      results.push(result);
    });
    
    // Log summary
    const validTargets = results.filter(r => r.isValidTarget);
    const invalidTargets = results.filter(r => !r.isValidTarget);
    console.log(`📊 TARGETING SUMMARY: ${validTargets.length} valid, ${invalidTargets.length} invalid`);
    console.log('🎯 INITIAL TARGETING COMPLETE');
    
    return results;
  }

  /**
   * Calculate total army health from all battalions
   */
  static calculateTotalArmyHealth(battalions: IBattalion[]): number {
    return battalions.reduce((total, battalion) => {
      return total + (battalion.stats.health * battalion.quantity);
    }, 0);
  }

  /**
   * Create user battalions with proper stats
   */
  static createUserBattalions(nodes: INode[]): IBattalion[] {
    const battalions: IBattalion[] = [];
    
    // User battalions on nodes 0, 1, 2
    const userBattalions = [
      { type: 'guardian' as BotType, quantity: 10, nodeIndex: 0 },
      { type: 'breacher' as BotType, quantity: 8, nodeIndex: 1 },
      { type: 'phreak' as BotType, quantity: 6, nodeIndex: 2 },
    ];
    
    userBattalions.forEach((battalion, index) => {
      const stats = BOT_CONFIG.USER_BOT_STATS[battalion.type].stats;
      const maxHealth = stats.health * battalion.quantity;
      
      battalions.push({
        id: `user-battalion-${index}`,
        type: battalion.type,
        quantity: battalion.quantity,
        currentHealth: maxHealth,
        maxHealth,
        position: {
          x: nodes[battalion.nodeIndex].position.x,
          y: nodes[battalion.nodeIndex].position.y,
          nodeIndex: battalion.nodeIndex,
        },
        owner: NodeOwner.USER,
        stats,
        mark: 1,
      });
    });

    return battalions;
  }

  /**
   * Create enemy battalions with proper stats
   */
  static createEnemyBattalions(nodes: INode[]): IBattalion[] {
    const battalions: IBattalion[] = [];
    
    // Enemy battalions on nodes 6, 7, 8
    const enemyBattalions = [
      { type: 'guardian' as BotType, quantity: 8, nodeIndex: 6 },
      { type: 'breacher' as BotType, quantity: 10, nodeIndex: 7 },
      { type: 'phreak' as BotType, quantity: 7, nodeIndex: 8 },
    ];
    
    enemyBattalions.forEach((battalion, index) => {
      const stats = BOT_CONFIG.ENEMY_BOT_STATS[battalion.type].stats;
      const maxHealth = stats.health * battalion.quantity;
      
      battalions.push({
        id: `enemy-battalion-${index}`,
        type: battalion.type,
        quantity: battalion.quantity,
        currentHealth: maxHealth,
        maxHealth,
        position: {
          x: nodes[battalion.nodeIndex].position.x,
          y: nodes[battalion.nodeIndex].position.y,
          nodeIndex: battalion.nodeIndex,
        },
        owner: NodeOwner.ENEMY,
        stats,
        mark: 1,
      });
    });

    return battalions;
  }

  /**
   * Assign a random valid target to a single battalion
   */
  static assignTargetToBattalion(
    battalion: IBattalion, 
    neutralNodeIndices: number[], 
    ownerLabel: string
  ): BattalionTargetingResult {
    const startingNode = battalion.position.nodeIndex;
    const validTargets = this.getValidTargets(startingNode, neutralNodeIndices);
    
    if (validTargets.length === 0) {
      console.log(`❌ ${ownerLabel} ${battalion.type} at node ${startingNode}: NO VALID TARGETS`);
      return {
        battalionId: battalion.id,
        battalionType: battalion.type,
        battalionOwner: battalion.owner,
        startingNode,
        targetNode: -1,
        isValidTarget: false,
        reason: 'No valid targets reachable via network'
      };
    }
    
    // Select random target from valid options
    const randomIndex = Math.floor(Math.random() * validTargets.length);
    const targetNode = validTargets[randomIndex];
    
    console.log(`✅ ${ownerLabel} ${battalion.type} at node ${startingNode} targets node ${targetNode}`);
    
    return {
      battalionId: battalion.id,
      battalionType: battalion.type,
      battalionOwner: battalion.owner,
      startingNode,
      targetNode,
      isValidTarget: true
    };
  }
  
  /**
   * Get valid neutral node targets reachable from starting node via network
   */
  private static getValidTargets(startingNode: number, neutralNodeIndices: number[]): number[] {
    return neutralNodeIndices.filter(targetNode => 
      this.isReachableViaNetwork(startingNode, targetNode)
    );
  }
  
  /**
   * Check if target node is reachable from starting node via DIRECT network connections only
   */
  static isReachableViaNetwork(startingNode: number, targetNode: number): boolean {
    // Direct connection check only - no 1-hop paths for initial targeting
    return NETWORK_CONNECTIONS.some(connection => 
      (connection.from === startingNode && connection.to === targetNode) ||
      (connection.from === targetNode && connection.to === startingNode)
    );
  }
} 