/**
 * @file TargetingService.ts
 * @description Network pathfinding utilities for targeting operations
 */

import { BattalionService } from './BattalionService';

export class TargetingService {
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