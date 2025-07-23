/**
 * @file TargetingService.ts
 * @description Initial targeting orchestration for battalions
 */

import { IBattalion, INode, NodeOwner } from '../types/battle';
import { BattalionService, BattalionTargetingResult } from './BattalionService';

export interface TargetingResult {
  battalionId: string;
  battalionType: string;
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
    
    // Process all battalions using BattalionService for battalion-specific logic
    battalions.forEach(battalion => {
      const ownerLabel = battalion.owner === NodeOwner.USER ? 'user' : 'enemy';
      const result = BattalionService.assignTargetToBattalion(battalion, neutralNodeIndices, ownerLabel);
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
   * Get network path from starting node to target node (direct connections only for initial targeting)
   */
  static getNetworkPath(startingNode: number, targetNode: number): number[] {
    // Direct connection only - no 1-hop paths for initial targeting
    const hasDirectConnection = BattalionService.isReachableViaNetwork(startingNode, targetNode);
    
    if (hasDirectConnection) {
      return [startingNode, targetNode];
    }
    
    return [];
  }
} 