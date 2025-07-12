import { IBattalion, INode } from '../types/battle';

// Network connections copied from mobile networkConstants.ts
const NETWORK_CONNECTIONS: [number, number][] = [
  // Horizontal connections
  [0, 3], [3, 6], // Top row
  [1, 4], [4, 7], // Middle row
  [2, 5], [5, 8], // Bottom row
  // Diagonal connections
  [0, 4], [1, 3], [1, 5], [2, 4],
  [3, 7], [4, 6], [4, 8], [5, 7],
];

export class BattleMovement {
  /**
   * Get all nodes connected to a given node
   */
  getConnectedNodes(nodeIndex: number): number[] {
    return NETWORK_CONNECTIONS
      .filter(([from, to]) => from === nodeIndex || to === nodeIndex)
      .map(([from, to]) => from === nodeIndex ? to : from);
  }
  
  /**
   * Validate if a path follows network connections
   */
  validatePath(path: number[]): { isValid: boolean; connectionCount: number; invalidConnections: [number, number][] } {
    if (path.length < 2) {
      return { isValid: true, connectionCount: 0, invalidConnections: [] };
    }
    
    let connectionCount = 0;
    const invalidConnections: [number, number][] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = path[i];
      const toNode = path[i + 1];
      
      // Check if this connection exists in NETWORK_CONNECTIONS
      const isValidConnection = NETWORK_CONNECTIONS.some(([from, to]) =>
        (from === fromNode && to === toNode) || (from === toNode && to === fromNode)
      );
      
      if (isValidConnection) {
        connectionCount++;
      } else {
        invalidConnections.push([fromNode, toNode]);
      }
    }
    
    const isValid = invalidConnections.length === 0;
    return { isValid, connectionCount, invalidConnections };
  }
  
  /**
   * Calculate shortest path using Dijkstra's algorithm
   */
  calculatePath(startNodeIndex: number, endNodeIndex: number, nodes: INode[]): number[] {
    const distances: { [key: number]: number } = {};
    const previousNodes: { [key: number]: number | null } = {};
    const pq: { index: number; priority: number }[] = [];
    
    // Initialize distances
    nodes.forEach((_, index) => {
      distances[index] = Infinity;
      previousNodes[index] = null;
    });
    
    distances[startNodeIndex] = 0;
    pq.push({ index: startNodeIndex, priority: 0 });
    
    while (pq.length > 0) {
      // Sort by priority (distance)
      pq.sort((a, b) => a.priority - b.priority);
      const { index: currentIndex } = pq.shift()!;
      
      if (distances[currentIndex] === Infinity) {
        break;
      }
      
      if (currentIndex === endNodeIndex) {
        break;
      }
      
      const connectedNodeIndices = this.getConnectedNodes(currentIndex);
      const currentNode = nodes[currentIndex];
      
      for (const neighborIndex of connectedNodeIndices) {
        const neighborNode = nodes[neighborIndex];
        
        // Calculate distance between nodes
        const distance = Math.sqrt(
          Math.pow(currentNode.position.x - neighborNode.position.x, 2) +
          Math.pow(currentNode.position.y - neighborNode.position.y, 2)
        );
        
        const newDist = distances[currentIndex] + distance;
        
        if (newDist < distances[neighborIndex]) {
          distances[neighborIndex] = newDist;
          previousNodes[neighborIndex] = currentIndex;
          pq.push({ index: neighborIndex, priority: newDist });
        }
      }
    }
    
    // Reconstruct path
    return this.reconstructPath(startNodeIndex, endNodeIndex, previousNodes);
  }
  
  /**
   * Reconstruct path from previous nodes map
   */
  private reconstructPath(
    startNodeIndex: number,
    endNodeIndex: number,
    previousNodes: { [key: number]: number | null }
  ): number[] {
    const path: number[] = [];
    let currentNodeIndex: number | null = endNodeIndex;
    
    while (currentNodeIndex !== null && currentNodeIndex !== startNodeIndex) {
      path.unshift(currentNodeIndex);
      currentNodeIndex = previousNodes[currentNodeIndex];
    }
    
    if (currentNodeIndex === startNodeIndex) {
      path.unshift(startNodeIndex);
      return path;
    }
    
    return []; // No path found
  }
  
  /**
   * Move battalion along a path
   */
  moveAlongPath(battalion: IBattalion, path: number[], nodes: INode[]): { battalion: IBattalion; completed: boolean } {
    if (path.length < 2) {
      return { battalion, completed: true };
    }
    
    const updatedBattalion = { ...battalion };
    
    // Calculate movement speed based on battalion stats
    const movementSpeed = battalion.stats.speed;
    
    // For now, move one node per movement action
    // In a real implementation, this would be based on time and speed
    if (!updatedBattalion.remainingPath || updatedBattalion.remainingPath.length === 0) {
      // Start movement
      updatedBattalion.remainingPath = [...path];
      updatedBattalion.finalTarget = path[path.length - 1];
    }
    
    // Move to next node in path
    if (updatedBattalion.remainingPath && updatedBattalion.remainingPath.length > 1) {
      const nextNodeIndex = updatedBattalion.remainingPath[1];
      updatedBattalion.position.nodeIndex = nextNodeIndex;
      updatedBattalion.remainingPath = updatedBattalion.remainingPath.slice(1);
      
      // Check if movement is complete
      if (updatedBattalion.remainingPath.length === 1) {
        updatedBattalion.remainingPath = [];
        updatedBattalion.finalTarget = undefined;
        return { battalion: updatedBattalion, completed: true };
      }
    }
    
    return { battalion: updatedBattalion, completed: false };
  }
  
  /**
   * Check if battalion can move to target node
   */
  canMoveToNode(battalion: IBattalion, targetNodeIndex: number, nodes: INode[]): boolean {
    // Check if target node is connected to current node
    const connectedNodes = this.getConnectedNodes(battalion.position.nodeIndex);
    if (!connectedNodes.includes(targetNodeIndex)) {
      return false;
    }
    
    // Check if battalion is already moving
    if (battalion.remainingPath && battalion.remainingPath.length > 0) {
      return false;
    }
    
    // Check if target node is occupied by enemy battalion
    const targetNode = nodes[targetNodeIndex];
    if (targetNode.owner === 'enemy' && battalion.owner === 'user') {
      return false;
    }
    if (targetNode.owner === 'user' && battalion.owner === 'enemy') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get all valid movement targets for a battalion
   */
  getValidMovementTargets(battalion: IBattalion, nodes: INode[]): number[] {
    const connectedNodes = this.getConnectedNodes(battalion.position.nodeIndex);
    
    return connectedNodes.filter(nodeIndex => {
      const node = nodes[nodeIndex];
      
      // Can't move to nodes owned by enemy
      if (node.owner === 'enemy' && battalion.owner === 'user') {
        return false;
      }
      if (node.owner === 'user' && battalion.owner === 'enemy') {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Calculate movement cost between nodes
   */
  calculateMovementCost(fromNodeIndex: number, toNodeIndex: number, nodes: INode[]): number {
    const fromNode = nodes[fromNodeIndex];
    const toNode = nodes[toNodeIndex];
    
    if (!fromNode || !toNode) {
      return Infinity;
    }
    
    // Base cost is distance
    const distance = Math.sqrt(
      Math.pow(fromNode.position.x - toNode.position.x, 2) + Math.pow(fromNode.position.y - toNode.position.y, 2)
    );
    
    // Add terrain modifiers (for future use)
    // TODO: Implement terrain-based movement costs
    
    return distance;
  }
  
  /**
   * Find the closest available target for a battalion
   * Based on intentions document: "Always pick the closest available target"
   */
  findClosestTarget(
    battalion: IBattalion,
    nodes: INode[],
    allBattalions: IBattalion[]
  ): { targetType: 'node' | 'battalion'; targetId: string | number; distance: number; path: number[] } | null {
    const availableTargets: Array<{
      targetType: 'node' | 'battalion';
      targetId: string | number;
      distance: number;
      path: number[];
    }> = [];
    
    // Check neutral nodes as targets
    const neutralNodes = nodes.filter(n => n.owner === 'neutral');
    for (const node of neutralNodes) {
      const path = this.calculatePath(battalion.position.nodeIndex, node.index, nodes);
      if (path.length > 0) {
        const distance = this.calculatePathDistance(path, nodes);
        availableTargets.push({
          targetType: 'node',
          targetId: node.index,
          distance,
          path
        });
      }
    }
    
    // Check enemy battalions as targets
    const enemyBattalions = allBattalions.filter(b => b.owner !== battalion.owner);
    for (const enemyBattalion of enemyBattalions) {
      if (!this.checkDestruction(enemyBattalion)) {
        const path = this.calculatePath(battalion.position.nodeIndex, enemyBattalion.position.nodeIndex, nodes);
        if (path.length > 0) {
          const distance = this.calculatePathDistance(path, nodes);
                  availableTargets.push({
          targetType: 'battalion',
          targetId: enemyBattalion.id,
          distance,
          path
        });
        }
      }
    }
    
    // Return the closest target
    if (availableTargets.length === 0) {
      return null;
    }
    
    availableTargets.sort((a, b) => a.distance - b.distance);
    return availableTargets[0];
  }
  
  /**
   * Calculate total distance of a path
   */
  private calculatePathDistance(path: number[], nodes: INode[]): number {
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      totalDistance += this.calculateMovementCost(path[i], path[i + 1], nodes);
    }
    return totalDistance;
  }
  
  /**
   * Check if a battalion is destroyed (helper method)
   */
  private checkDestruction(battalion: IBattalion): boolean {
    return battalion.quantity <= 0 || battalion.currentHealth <= 0;
  }
  
  /**
   * Calculate position at attack range from target
   * Battalions should stop at exact attack range distance from targets
   */
  calculateAttackPosition(
    battalion: IBattalion,
    targetNodeIndex: number,
    nodes: INode[]
  ): { x: number; y: number; nodeIndex: number } | null {
    const path = this.calculatePath(battalion.position.nodeIndex, targetNodeIndex, nodes);
    if (path.length === 0) {
      return null;
    }
    
    const attackRange = battalion.stats.range;
    let currentDistance = 0;
    
    // Walk along the path until we reach attack range
    for (let i = 0; i < path.length - 1; i++) {
      const segmentDistance = this.calculateMovementCost(path[i], path[i + 1], nodes);
      
      if (currentDistance + segmentDistance <= attackRange) {
        currentDistance += segmentDistance;
      } else {
        // We need to stop partway along this segment
        const remainingRange = attackRange - currentDistance;
        const ratio = remainingRange / segmentDistance;
        
        const fromNode = nodes[path[i]];
        const toNode = nodes[path[i + 1]];
        
        const x = fromNode.position.x + (toNode.position.x - fromNode.position.x) * ratio;
        const y = fromNode.position.y + (toNode.position.y - fromNode.position.y) * ratio;
        
        return { x, y, nodeIndex: path[i] };
      }
    }
    
    // If we can reach the target node within range, position there
    return {
      x: nodes[targetNodeIndex].position.x,
      y: nodes[targetNodeIndex].position.y,
      nodeIndex: targetNodeIndex
    };
  }
} 