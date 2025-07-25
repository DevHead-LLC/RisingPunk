/**
 * @file PathfindingService.ts
 * @description Multi-hop pathfinding through NETWORK_CONNECTIONS for cross-network targeting
 * 
 * AUTHORITY: Multi-hop pathfinding through NETWORK_CONNECTIONS
 * NO OVERLAPS: Pure pathfinding algorithm - no movement or targeting logic
 * DEPENDENCIES: networkConfig.ts NETWORK_CONNECTIONS only
 */

import { NETWORK_CONNECTIONS } from '../config/networkConfig';

export class PathfindingService {
  /**
   * Find shortest path using BFS algorithm with NETWORK_CONNECTIONS validation
   */
  static findNetworkPath(startNode: number, targetNode: number): number[] {
    // Validate both nodes exist in NETWORK_CONNECTIONS
    if (!this.isValidNode(startNode) || !this.isValidNode(targetNode)) {
      return [];
    }
    
    if (startNode === targetNode) {
      return [startNode];
    }
    
    // BFS implementation with parent tracking
    const queue: Array<{node: number, path: number[]}> = [{node: startNode, path: [startNode]}];
    const visited = new Set<number>();
    
    while (queue.length > 0) {
      const {node, path} = queue.shift()!;
      
      if (node === targetNode) {
        return path;
      }
      
      if (visited.has(node)) continue;
      visited.add(node);
      
      const neighbors = this.getValidNeighbors(node);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({node: neighbor, path: [...path, neighbor]});
        }
      }
    }
    
    return [];
  }
  
  /**
   * Get valid neighbors from NETWORK_CONNECTIONS only
   */
  static getValidNeighbors(nodeIndex: number): number[] {
    const neighbors: number[] = [];
    
    for (const connection of NETWORK_CONNECTIONS) {
      if (connection.from === nodeIndex) {
        neighbors.push(connection.to);
      } else if (connection.to === nodeIndex) {
        neighbors.push(connection.from);
      }
    }
    
    return neighbors.sort(); // Consistent ordering
  }
  
  /**
   * Calculate hop count distance (for proximity calculations)
   */
  static calculateNetworkHops(startNode: number, targetNode: number): number {
    const path = this.findNetworkPath(startNode, targetNode);
    return path.length > 0 ? path.length - 1 : -1; // -1 indicates unreachable
  }
  
  /**
   * Validate if path exists
   */
  static isReachableViaNetwork(startNode: number, targetNode: number): boolean {
    const path = this.findNetworkPath(startNode, targetNode);
    return path.length > 0;
  }
  
  /**
   * Validate node exists in NETWORK_CONNECTIONS
   */
  static isValidNode(nodeIndex: number): boolean {
    return NETWORK_CONNECTIONS.some(conn => 
      conn.from === nodeIndex || conn.to === nodeIndex
    );
  }
  
  /**
   * Check if target is reachable via network pathfinding (for cross-network targeting)
   */
  static isNetworkReachable(fromNode: number, toNode: number): boolean {
    const path = this.findNetworkPath(fromNode, toNode);
    return path.length > 0;
  }
} 