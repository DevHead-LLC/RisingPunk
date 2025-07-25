# Phase 2: Pathfinding Service with Network Lock-in

## 🎯 GOAL: 
Create BFS pathfinding that respects NETWORK_CONNECTIONS and validates network reachability for cross-network targeting

## 🔍 LOGIC HOLES ADDRESSED:

### HOLE #2: CROSS-NETWORK TARGETING & LINE-OF-SIGHT VALIDATION
**INTENDED.MD:** "Cross-network targeting is valid: Battalion at 0-3 line can target enemy at 5-8 line"
**CURRENT PLAN:** Line-of-sight validation was too restrictive - only checking direct connections
**CLARIFIED:** Line-of-sight means "reachable via network pathfinding" not "directly connected"
**SOLUTION:** PathfindingService validates network reachability, not direct line-of-sight

## 🏗️ WHAT WE'LL BUILD:

### 1. PathfindingService.ts (NEW FILE):
```typescript
// server/src/services/PathfindingService.ts
import { NETWORK_CONNECTIONS } from '../config/networkConfig';

/**
 * AUTHORITY: Multi-hop pathfinding through NETWORK_CONNECTIONS
 * NO OVERLAPS: Pure pathfinding algorithm - no movement or targeting logic
 * DEPENDENCIES: networkConfig.ts NETWORK_CONNECTIONS only
 */
export class PathfindingService {
  /**
   * Find shortest path using BFS algorithm with NETWORK_CONNECTIONS validation
   */
  static findNetworkPath(startNode: number, targetNode: number): number[] {
    console.log(`🗺️ PATHFINDING: BFS from node ${startNode} to node ${targetNode}`);
    
    // Validate both nodes exist in NETWORK_CONNECTIONS
    if (!this.isValidNode(startNode) || !this.isValidNode(targetNode)) {
      console.log(`🗺️ PATHFINDING ERROR: Invalid nodes - start:${startNode} target:${targetNode}`);
      return [];
    }
    
    if (startNode === targetNode) {
      console.log(`🗺️ PATHFINDING: Same node - no movement needed`);
      return [startNode];
    }
    
    // BFS implementation with parent tracking
    const queue: Array<{node: number, path: number[]}> = [{node: startNode, path: [startNode]}];
    const visited = new Set<number>();
    
    while (queue.length > 0) {
      const {node, path} = queue.shift()!;
      
      if (node === targetNode) {
        console.log(`🗺️ PATHFINDING SUCCESS: [${path.join(' → ')}] (${path.length - 1} hops)`);
        return path;
      }
      
      if (visited.has(node)) continue;
      visited.add(node);
      
      const neighbors = this.getValidNeighbors(node);
      console.log(`🗺️ PATHFINDING: Node ${node} → neighbors [${neighbors.join(', ')}]`);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({node: neighbor, path: [...path, neighbor]});
        }
      }
    }
    
    console.log(`🗺️ PATHFINDING FAILED: No path from ${startNode} to ${targetNode}`);
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
    const isReachable = path.length > 0;
    
    console.log(`🎯 NETWORK REACHABLE: Node ${fromNode} → ${toNode}: ${isReachable ? 'YES' : 'NO'}`);
    console.log(`🎯 CROSS-NETWORK: Supports targeting across different network lines via pathfinding`);
    
    return isReachable;
  }
}
```

## 📋 STEP-BY-STEP IMPLEMENTATION:

### Step 1: Create PathfindingService File
- Create new file: `server/src/services/PathfindingService.ts`
- Import only `NETWORK_CONNECTIONS` from networkConfig
- No dependencies on other services

### Step 2: Implement BFS Algorithm
- Build breadth-first search with path tracking
- Use queue-based traversal for shortest path
- Include parent/path reconstruction

### Step 3: Add Network Validation
- Validate nodes exist in NETWORK_CONNECTIONS
- Get valid neighbors for each node
- Handle edge cases (same node, unreachable targets)

### Step 4: Add Cross-Network Support
- Implement `isNetworkReachable()` for targeting validation
- Support pathfinding across different network segments
- Replace restrictive line-of-sight checks

### Step 5: Add Utility Methods
- `calculateNetworkHops()` for distance calculations
- `isValidNode()` for input validation
- Consistent neighbor ordering

## 🐛 DEBUG LOGS EXPECTED:
```
🗺️ PATHFINDING: BFS from node 0 to node 8
🗺️ PATHFINDING: Node 0 → neighbors [3]
🗺️ PATHFINDING: Node 3 → neighbors [0, 1, 6, 7]  
🗺️ PATHFINDING: Node 7 → neighbors [3, 4, 5, 8]
🗺️ PATHFINDING SUCCESS: [0 → 3 → 7 → 5 → 8] (4 hops)
🎯 NETWORK REACHABLE: Node 0 → 8: YES
🎯 CROSS-NETWORK: Supports targeting across different network lines via pathfinding
```

## 🔧 CROSS-NETWORK TARGETING EXAMPLES:

### Example 1: User Home to Enemy Line
- **Start:** Node 0 (user home)
- **Target:** Node 8 (enemy line)
- **Path:** `0 → 3 → 7 → 5 → 8`
- **Result:** Cross-network targeting validated ✅

### Example 2: Neutral to Neutral Cross-Network
- **Start:** Node 4 (neutral center)
- **Target:** Node 5 (neutral center)
- **Path:** `4 → 1 → 3 → 7 → 5`
- **Result:** Multi-hop path through network ✅

### Example 3: Invalid Targeting
- **Start:** Node 0
- **Target:** Node 999 (non-existent)
- **Path:** `[]` (empty)
- **Result:** Properly rejected ❌

## ✅ SUCCESS CRITERIA:
- BFS pathfinding works correctly for all valid node combinations
- Cross-network targeting supported (0 → 8, 1 → 5, etc.)
- Invalid nodes properly rejected
- Network distance calculations accurate
- No dependencies on movement or targeting logic
- Foundation ready for retargeting implementation (Phase 3)

## 🚀 NEXT PHASE:
After Phase 2 completion, Phase 3 will implement the RetargetingService using PathfindingService for proximity-based targeting. 