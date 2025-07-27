// server/src/services/RetargetingService.ts
import { IBattalion, INode, NodeOwner } from '../types/battle';
import { PathfindingService } from './PathfindingService';

export interface RetargetingResult {
  battalionId: string;
  currentNodeIndex: number;
  newTargetNodeIndex: number;
  pathToTarget: number[];  // Full path including start and end
  pathDistance: number;    // Hop count
  targetType: 'neutral_node' | 'enemy_battalion';  // Both neutral nodes and enemy battalions
  
  // NEW PHASE 4 PROPERTY for specific battalion targeting:
  targetBattalionId?: string;  // When targetType is 'enemy_battalion', this specifies which specific battalion
                              // Used to identify the exact enemy battalion to attack at the target node
                              // Essential for multi-battalion nodes where target selection must be precise
}

/**
 * AUTHORITY: Post-capture proximity targeting for NEAREST targets (neutral nodes OR enemy battalions)
 * OVERLAPS: Uses PathfindingService for distances, integrates with AttackService
 * DEPENDENCIES: PathfindingService, node ownership validation
 */
export class RetargetingService {
  /**
   * Main retargeting function called after node capture
   */
  static retargetBattalionsAfterCapture(
    capturedNodeIndex: number,
    affectedBattalionIds: string[],
    allBattalions: IBattalion[],
    allNodes: INode[]
  ): RetargetingResult[] {
    console.log(`🎯 RETARGETING START: Node ${capturedNodeIndex} captured, ${affectedBattalionIds.length} battalions affected`);
    
    const retargetingResults: RetargetingResult[] = [];
    
    for (const battalionId of affectedBattalionIds) {
      const battalion = allBattalions.find(b => b.id === battalionId);
      if (!battalion) {
        console.log(`🎯 RETARGETING ERROR: Battalion ${battalionId} not found`);
        continue;
      }
      
      // ENHANCED: Log specific battalion being retargeted
      console.log(`🎯 TRACKING: Retargeting ${battalion.owner} ${battalion.type} (${battalionId}) from node ${battalion.position.nodeIndex}`);
      
      // Find the NEAREST target (neutral nodes OR enemy battalions)
      const neutralNodes = allNodes.filter(node => node.owner === NodeOwner.NEUTRAL);
      const enemyBattalions = allBattalions.filter(b => b.owner !== battalion.owner);
      
      const targetResult = this.findClosestTarget(battalion, neutralNodes, enemyBattalions);
      if (targetResult) {
        console.log(`🎯 PROXIMITY: Selected ${targetResult.targetType} at node ${targetResult.targetNodeIndex} (${targetResult.pathDistance} hops via ${targetResult.pathToTarget.join(' → ')})`);
        
        // ENHANCED: Log the specific retargeting decision
        if (targetResult.targetType === 'enemy_battalion') {
          const targetBattalion = enemyBattalions.find(b => b.position.nodeIndex === targetResult.targetNodeIndex);
          if (targetBattalion) {
            console.log(`🎯 DECISION: ${battalion.owner} ${battalion.type} (${battalionId}) → targeting ${targetBattalion.owner} ${targetBattalion.type} at node ${targetResult.targetNodeIndex}`);
          } else {
            console.log(`🎯 DECISION: ${battalion.owner} ${battalion.type} (${battalionId}) → targeting enemy battalion at node ${targetResult.targetNodeIndex}`);
          }
        } else {
          console.log(`🎯 DECISION: ${battalion.owner} ${battalion.type} (${battalionId}) → targeting neutral node ${targetResult.targetNodeIndex}`);
        }
        
        // DETAILED LOGGING: Show battalion position and target details
        if (targetResult.targetType === 'enemy_battalion') {
          const targetBattalion = enemyBattalions.find(b => b.position.nodeIndex === targetResult.targetNodeIndex);
          if (targetBattalion) {
            console.log(`📊 RETARGETING DETAILS: ${battalion.owner} ${battalion.type}-type battalion at position node ${battalion.position.nodeIndex} retargeting results: targeted ${targetBattalion.owner} ${targetBattalion.type}-type battalion at position node ${targetBattalion.position.nodeIndex}`);
          }
        } else {
          console.log(`📊 RETARGETING DETAILS: ${battalion.owner} ${battalion.type}-type battalion at position node ${battalion.position.nodeIndex} retargeting results: targeted neutral node at position node ${targetResult.targetNodeIndex}`);
        }
        
        retargetingResults.push({
          battalionId: battalion.id,
          currentNodeIndex: battalion.position.nodeIndex,
          newTargetNodeIndex: targetResult.targetNodeIndex,
          pathToTarget: targetResult.pathToTarget,
          pathDistance: targetResult.pathDistance,
          targetType: targetResult.targetType
        });
      } else {
        console.log(`🎯 PROXIMITY ERROR: No reachable targets for ${battalion.owner} ${battalion.type}`);
      }
    }
    
    console.log(`🎯 RETARGETING END: ${retargetingResults.length}/${affectedBattalionIds.length} battalions retargeted`);
    return retargetingResults;
  }
  
  /**
   * Find closest target (neutral node OR enemy battalion) using network pathfinding
   */
  static findClosestTarget(
    battalion: IBattalion,
    neutralNodes: INode[],
    enemyBattalions: IBattalion[]
  ): {targetNodeIndex: number, pathToTarget: number[], pathDistance: number, targetType: 'neutral_node' | 'enemy_battalion', targetBattalionId?: string} | null {
    
    let closestDistance = Infinity;
    let candidateTargets: Array<{nodeIndex: number, path: number[], distance: number, targetType: 'neutral_node' | 'enemy_battalion', targetBattalionId?: string}> = [];
    
    // Calculate network distance to each neutral node
    for (const node of neutralNodes) {
      // Skip if battalion is already at this node
      if (battalion.position.nodeIndex === node.index) {
        continue;
      }
      
      const path = PathfindingService.findNetworkPath(battalion.position.nodeIndex, node.index);
      
      if (path.length > 0) {
        const distance = path.length - 1; // Hop count

        
        if (distance < closestDistance) {
          // Found closer target - reset candidates
          closestDistance = distance;
          candidateTargets = [{nodeIndex: node.index, path: path, distance: distance, targetType: 'neutral_node'}];
        } else if (distance === closestDistance) {
          // Tied for closest - add to candidates
          candidateTargets.push({nodeIndex: node.index, path: path, distance: distance, targetType: 'neutral_node'});
        }
      } else {
        console.log(`🎯 PROXIMITY: Neutral node ${node.index} unreachable via network`);
      }
    }
    
    // Calculate network distance to each enemy battalion
    for (const enemyBattalion of enemyBattalions) {
      // PHASE 3: Skip destroyed battalions - they cannot be targeted
      // TRANSITION FIX: Also check health/units for legacy battles where isDestroyed might not be set
      if (enemyBattalion.isDestroyed === true || enemyBattalion.currentHealth <= 0 || enemyBattalion.quantity <= 0) {
        console.log(`🎯 SKIPPING DESTROYED: ${enemyBattalion.owner} ${enemyBattalion.type} cannot be targeted (destroyed: ${enemyBattalion.isDestroyed}, health: ${enemyBattalion.currentHealth}, units: ${enemyBattalion.quantity})`);
        continue;
      }
      
      // FIXED: Don't skip same-node enemy battalions - they should be the primary target!
      // When two enemy battalions are at the same node, they should target each other
      
      let distance: number;
      let path: number[];
      
      if (battalion.position.nodeIndex === enemyBattalion.position.nodeIndex) {
        // Same node - distance is 0, path is just the current node
        distance = 0;
        path = [battalion.position.nodeIndex];
        console.log(`🎯 SAME-NODE TARGET: ${battalion.owner} ${battalion.type} at node ${battalion.position.nodeIndex} can target ${enemyBattalion.owner} ${enemyBattalion.type} at same node (distance: 0)`);
      } else {
        // Different node - calculate network path
        path = PathfindingService.findNetworkPath(battalion.position.nodeIndex, enemyBattalion.position.nodeIndex);
        if (path.length === 0) {
          console.log(`🎯 PROXIMITY: Enemy battalion at node ${enemyBattalion.position.nodeIndex} unreachable via network`);
          continue;
        }
        distance = path.length - 1; // Hop count
      }
      
      if (distance < closestDistance) {
        // Found closer target - reset candidates
        closestDistance = distance;
        candidateTargets = [{nodeIndex: enemyBattalion.position.nodeIndex, path: path, distance: distance, targetType: 'enemy_battalion', targetBattalionId: enemyBattalion.id}];
      } else if (distance === closestDistance) {
        // Tied for closest - add to candidates
        candidateTargets.push({nodeIndex: enemyBattalion.position.nodeIndex, path: path, distance: distance, targetType: 'enemy_battalion', targetBattalionId: enemyBattalion.id});
      }
    }
    
    if (candidateTargets.length === 0) {
      console.log(`🎯 PROXIMITY ERROR: No reachable targets for battalion`);
      return null;
    }
    
    // Random selection from equidistant targets
    let selectedTarget;
    if (candidateTargets.length === 1) {
      selectedTarget = candidateTargets[0];
    } else {
      const randomIndex = Math.floor(Math.random() * candidateTargets.length);
      selectedTarget = candidateTargets[randomIndex];
      console.log(`🎯 PROXIMITY: Selected ${selectedTarget.targetType} at node ${selectedTarget.nodeIndex} (random from ${candidateTargets.length} equidistant)`);
    }
    
    return {
      targetNodeIndex: selectedTarget.nodeIndex,
      pathToTarget: selectedTarget.path,
      pathDistance: selectedTarget.distance,
      targetType: selectedTarget.targetType,
      // PHASE 4: Include target battalion ID for precise targeting
      targetBattalionId: selectedTarget.targetBattalionId  // Will be undefined for neutral nodes, specific ID for enemy battalions
                                                          // This enables MovementService to target the exact enemy battalion
                                                          // Prevents confusion when multiple enemies are at the same node
    };
  }
} 