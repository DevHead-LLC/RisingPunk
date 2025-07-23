/**
 * @file TargetingService.ts
 * @description Targeting logic and network pathfinding utilities
 */

import { IBattalion, INode, NodeOwner, BotType, BattalionTargetingResult } from '../types/battle';
import { NETWORK_CONNECTIONS } from '../config/networkConfig';

export class TargetingService {
  /**
   * Get network path from starting node to target node (direct connections only for initial targeting)
   */
  static getNetworkPath(startingNode: number, targetNode: number): number[] {
    // Direct connection only - no 1-hop paths for initial targeting
    const hasDirectConnection = this.isReachableViaNetwork(startingNode, targetNode);
    
    if (hasDirectConnection) {
      return [startingNode, targetNode];
    }
    
    return [];
  }

  /**
   * Assign initial random targets to all battalions
   */
  static assignInitialTargets(battalions: IBattalion[], nodes: INode[]): BattalionTargetingResult[] {
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
  static getValidTargets(startingNode: number, neutralNodeIndices: number[]): number[] {
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