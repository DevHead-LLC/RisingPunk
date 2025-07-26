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
        console.log(`🎯 DECISION: ${battalion.owner} ${battalion.type} (${battalionId}) → targeting node ${targetResult.targetNodeIndex}`);
        
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
  ): {targetNodeIndex: number, pathToTarget: number[], pathDistance: number, targetType: 'neutral_node' | 'enemy_battalion'} | null {
    
    let closestDistance = Infinity;
    let candidateTargets: Array<{nodeIndex: number, path: number[], distance: number, targetType: 'neutral_node' | 'enemy_battalion'}> = [];
    
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
      // Skip if battalion is already at this node
      if (battalion.position.nodeIndex === enemyBattalion.position.nodeIndex) {
        continue;
      }
      
      const path = PathfindingService.findNetworkPath(battalion.position.nodeIndex, enemyBattalion.position.nodeIndex);
      
      if (path.length > 0) {
        const distance = path.length - 1; // Hop count

        
        if (distance < closestDistance) {
          // Found closer target - reset candidates
          closestDistance = distance;
          candidateTargets = [{nodeIndex: enemyBattalion.position.nodeIndex, path: path, distance: distance, targetType: 'enemy_battalion'}];
        } else if (distance === closestDistance) {
          // Tied for closest - add to candidates
          candidateTargets.push({nodeIndex: enemyBattalion.position.nodeIndex, path: path, distance: distance, targetType: 'enemy_battalion'});
        }
      } else {
        console.log(`🎯 PROXIMITY: Enemy battalion at node ${enemyBattalion.position.nodeIndex} unreachable via network`);
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
      targetType: selectedTarget.targetType
    };
  }
} 