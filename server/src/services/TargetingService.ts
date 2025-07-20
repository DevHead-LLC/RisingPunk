/**
 * @file TargetingService.ts
 * @description Initial targeting logic for battalions with network constraint validation
 */

import { IBattalion, INode, NodeOwner, BotType } from '../types/battle';
import { BATTLE_CONFIG } from '../config/battleConfig';

export interface TargetingResult {
  battalionId: string;
  battalionType: BotType;
  battalionOwner: NodeOwner;
  startingNode: number;
  targetNode: number;
  isValidTarget: boolean;
  reason?: string;
}

export class TargetingService {
  /**
   * Assign initial random targets to all battalions
   */
  static assignInitialTargets(battalions: IBattalion[], nodes: INode[]): TargetingResult[] {
    const results: TargetingResult[] = [];
    
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
  private static assignTargetToBattalion(
    battalion: IBattalion, 
    neutralNodeIndices: number[], 
    ownerLabel: string
  ): TargetingResult {
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
   * Check if target node is reachable from starting node via network connections
   */
  private static isReachableViaNetwork(startingNode: number, targetNode: number): boolean {
    // Direct connection check
    const hasDirectConnection = BATTLE_CONFIG.NETWORK_CONNECTIONS.some(connection => 
      (connection.from === startingNode && connection.to === targetNode) ||
      (connection.from === targetNode && connection.to === startingNode)
    );
    
    if (hasDirectConnection) {
      return true;
    }
    
    // Check for 1-hop connections (through intermediate nodes)
    const intermediateNodes = BATTLE_CONFIG.NETWORK_CONNECTIONS
      .filter(connection => 
        connection.from === startingNode || connection.to === startingNode
      )
      .map(connection => 
        connection.from === startingNode ? connection.to : connection.from
      );
    
    // Check if any intermediate node connects to target
    return intermediateNodes.some(intermediateNode => 
      BATTLE_CONFIG.NETWORK_CONNECTIONS.some(connection => 
        (connection.from === intermediateNode && connection.to === targetNode) ||
        (connection.from === targetNode && connection.to === intermediateNode)
      )
    );
  }
  
  /**
   * Get network path from starting node to target node
   */
  static getNetworkPath(startingNode: number, targetNode: number): number[] {
    // Direct connection
    const hasDirectConnection = BATTLE_CONFIG.NETWORK_CONNECTIONS.some(connection => 
      (connection.from === startingNode && connection.to === targetNode) ||
      (connection.from === targetNode && connection.to === startingNode)
    );
    
    if (hasDirectConnection) {
      return [startingNode, targetNode];
    }
    
    // Find 1-hop path
    const intermediateNodes = BATTLE_CONFIG.NETWORK_CONNECTIONS
      .filter(connection => 
        connection.from === startingNode || connection.to === startingNode
      )
      .map(connection => 
        connection.from === startingNode ? connection.to : connection.from
      );
    
    for (const intermediateNode of intermediateNodes) {
      const hasConnectionToTarget = BATTLE_CONFIG.NETWORK_CONNECTIONS.some(connection => 
        (connection.from === intermediateNode && connection.to === targetNode) ||
        (connection.from === targetNode && connection.to === intermediateNode)
      );
      
      if (hasConnectionToTarget) {
        return [startingNode, intermediateNode, targetNode];
      }
    }
    
    return [];
  }
} 