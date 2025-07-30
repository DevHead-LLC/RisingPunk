// server/src/services/RetargetingService.ts
import { IBattalion, INode, NodeOwner } from '../types/battle';
import { PathfindingService } from './PathfindingService';
import { CombatService } from './CombatService';

export interface RetargetingResult {
  battalionId: string;
  currentNodeIndex: number;
  newTargetNodeIndex: number;
  pathToTarget: number[];
  pathDistance: number;
  targetType: 'neutral_node' | 'enemy_battalion';
  targetBattalionId?: string;
}

export class RetargetingService {
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
      
      console.log(`🎯 TRACKING: Retargeting ${battalion.owner} ${battalion.type} (${battalionId}) from node ${battalion.position.nodeIndex}`);
      
      const neutralNodes = allNodes.filter(node => node.owner === NodeOwner.NEUTRAL);
      const enemyBattalions = allBattalions.filter(b => b.owner !== battalion.owner);
      
      const targetResult = this.findClosestTarget(battalion, neutralNodes, enemyBattalions);
      if (targetResult) {
        console.log(`🎯 PROXIMITY: Selected ${targetResult.targetType} at node ${targetResult.targetNodeIndex} (${targetResult.pathDistance} hops via ${targetResult.pathToTarget.join(' → ')})`);
        
        if (targetResult.targetType === 'enemy_battalion') {
          const targetBattalion = enemyBattalions.find(b => b.position.nodeIndex === targetResult.targetNodeIndex);
          if (targetBattalion) {
            console.log(`🎯 DECISION: ${battalion.owner} ${battalion.type} (${battalionId}) → targeting ${targetBattalion.owner} ${targetBattalion.type} at node ${targetResult.targetNodeIndex}`);
          }
        } else {
          console.log(`🎯 DECISION: ${battalion.owner} ${battalion.type} (${battalionId}) → targeting neutral node ${targetResult.targetNodeIndex}`);
        }
        
        retargetingResults.push({
          battalionId: battalion.id,
          currentNodeIndex: battalion.position.nodeIndex,
          newTargetNodeIndex: targetResult.targetNodeIndex,
          pathToTarget: targetResult.pathToTarget,
          pathDistance: targetResult.pathDistance,
          targetType: targetResult.targetType,
          targetBattalionId: targetResult.targetBattalionId
        });
      } else {
        console.log(`🎯 PROXIMITY ERROR: No reachable targets for ${battalion.owner} ${battalion.type}`);
      }
    }
    
    console.log(`🎯 RETARGETING END: ${retargetingResults.length}/${affectedBattalionIds.length} battalions retargeted`);
    return retargetingResults;
  }
  
  static findClosestTarget(
    battalion: IBattalion,
    neutralNodes: INode[],
    enemyBattalions: IBattalion[]
  ): {targetNodeIndex: number, pathToTarget: number[], pathDistance: number, targetType: 'neutral_node' | 'enemy_battalion', targetBattalionId?: string} | null {
    
    let closestDistance = Infinity;
    let candidateTargets: Array<{nodeIndex: number, path: number[], distance: number, targetType: 'neutral_node' | 'enemy_battalion', targetBattalionId?: string}> = [];
    
    const evaluateTarget = (nodeIndex: number, path: number[], distance: number, targetType: 'neutral_node' | 'enemy_battalion', targetBattalionId?: string) => {
      if (distance < closestDistance) {
        closestDistance = distance;
        candidateTargets = [{nodeIndex, path, distance, targetType, targetBattalionId}];
      } else if (distance === closestDistance) {
        candidateTargets.push({nodeIndex, path, distance, targetType, targetBattalionId});
      }
    };
    
    // Evaluate neutral nodes
    for (const node of neutralNodes) {
      if (battalion.position.nodeIndex === node.index) continue;
      
      const path = PathfindingService.findNetworkPath(battalion.position.nodeIndex, node.index);
      if (path.length > 0) {
        evaluateTarget(node.index, path, path.length - 1, 'neutral_node');
      }
    }
    
    // Evaluate enemy battalions
    for (const enemyBattalion of enemyBattalions) {
      if (!CombatService.canTargetBattalion(enemyBattalion)) {
        console.log(`🎯 SKIPPING DESTROYED: ${enemyBattalion.owner} ${enemyBattalion.type} cannot be targeted`);
        continue;
      }
      
      let distance: number;
      let path: number[];
      
      if (battalion.position.nodeIndex === enemyBattalion.position.nodeIndex) {
        distance = 0;
        path = [battalion.position.nodeIndex];
        console.log(`🎯 SAME-NODE TARGET: ${battalion.owner} ${battalion.type} at node ${battalion.position.nodeIndex} can target ${enemyBattalion.owner} ${enemyBattalion.type} at same node`);
      } else {
        path = PathfindingService.findNetworkPath(battalion.position.nodeIndex, enemyBattalion.position.nodeIndex);
        if (path.length === 0) continue;
        distance = path.length - 1;
      }
      
      evaluateTarget(enemyBattalion.position.nodeIndex, path, distance, 'enemy_battalion', enemyBattalion.id);
    }
    
    if (candidateTargets.length === 0) {
      console.log(`🎯 PROXIMITY ERROR: No reachable targets for battalion`);
      return null;
    }
    
    const selectedTarget = candidateTargets.length === 1 
      ? candidateTargets[0] 
      : candidateTargets[Math.floor(Math.random() * candidateTargets.length)];
    
    if (candidateTargets.length > 1) {
      console.log(`🎯 PROXIMITY: Selected ${selectedTarget.targetType} at node ${selectedTarget.nodeIndex} (random from ${candidateTargets.length} equidistant)`);
    }
    
    return {
      targetNodeIndex: selectedTarget.nodeIndex,
      pathToTarget: selectedTarget.path,
      pathDistance: selectedTarget.distance,
      targetType: selectedTarget.targetType,
      targetBattalionId: selectedTarget.targetBattalionId
    };
  }
} 