import { NETWORK_CONNECTIONS } from '../config/networkConfig';

export class PathfindingService {
  static findNetworkPath(startNode: number, targetNode: number): number[] {
    if (!this.isValidNode(startNode) || !this.isValidNode(targetNode)) {
      return [];
    }
    
    if (startNode === targetNode) {
      return [startNode];
    }
    
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
  
  static getValidNeighbors(nodeIndex: number): number[] {
    const neighbors: number[] = [];
    
    for (const connection of NETWORK_CONNECTIONS) {
      if (connection.from === nodeIndex) {
        neighbors.push(connection.to);
      } else if (connection.to === nodeIndex) {
        neighbors.push(connection.from);
      }
    }
    
    return neighbors.sort();
  }
  
  static calculateNetworkHops(startNode: number, targetNode: number): number {
    const path = this.findNetworkPath(startNode, targetNode);
    return path.length > 0 ? path.length - 1 : -1;
  }
  
  static isReachableViaNetwork(startNode: number, targetNode: number): boolean {
    return this.findNetworkPath(startNode, targetNode).length > 0;
  }

  static isValidNode(nodeIndex: number): boolean {
    return NETWORK_CONNECTIONS.some(conn => 
      conn.from === nodeIndex || conn.to === nodeIndex
    );
  }
  
  static isNetworkReachable(fromNode: number, toNode: number): boolean {
    return this.isReachableViaNetwork(fromNode, toNode);
  }
} 