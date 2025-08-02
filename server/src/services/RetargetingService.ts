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
  static getBattalionStartNode(battalion: IBattalion, battleId: string): number {
    if (!battleId) {
      throw new Error('battleId is required for getBattalionStartNode');
    }
    
    const { calculateNodePositions } = require('./NodeService');
    const { ScreenDimensionService } = require('./ScreenDimensionService');
    
    const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
    const nodePositions = calculateNodePositions(screenDimensions.width, screenDimensions.height);
    
    let closestNodeIndex = battalion.position.nodeIndex;
    let closestDistance = Infinity;
    
    for (let i = 0; i < nodePositions.length; i++) {
      const nodePos = nodePositions[i];
      const distance = Math.sqrt(
        Math.pow(battalion.position.x - nodePos.position.x, 2) + 
        Math.pow(battalion.position.y - nodePos.position.y, 2)
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestNodeIndex = i;
      }
    }
    
    return closestNodeIndex;
  }

  static retargetBattalionsAfterCapture(
    capturedNodeIndex: number,
    affectedBattalionIds: string[],
    allBattalions: IBattalion[],
    allNodes: INode[],
    battleId: string
  ): RetargetingResult[] {
    
    const retargetingResults: RetargetingResult[] = [];
    
    for (const battalionId of affectedBattalionIds) {
      const battalion = allBattalions.find(b => b.id === battalionId);
      if (!battalion) {
        continue;
      }
      
      const battalionStartNode = this.getBattalionStartNode(battalion, battleId);
      
      const neutralNodes = allNodes.filter(node => node.owner === NodeOwner.NEUTRAL);
      const enemyBattalions = allBattalions.filter(b => b.owner !== battalion.owner);
      
      const targetResult = this.findClosestTarget(battalion, neutralNodes, enemyBattalions, battleId);
      if (targetResult) {
        
        if (targetResult.targetType === 'enemy_battalion') {
          const targetBattalion = enemyBattalions.find(b => b.position.nodeIndex === targetResult.targetNodeIndex);
          if (targetBattalion) {
          }
        }
        
        retargetingResults.push({
          battalionId: battalion.id,
          currentNodeIndex: battalionStartNode,
          newTargetNodeIndex: targetResult.targetNodeIndex,
          pathToTarget: targetResult.pathToTarget,
          pathDistance: targetResult.pathDistance,
          targetType: targetResult.targetType,
          targetBattalionId: targetResult.targetBattalionId
        });
      } 
    }
    
    return retargetingResults;
  }
  
  static findClosestTarget(
    battalion: IBattalion,
    neutralNodes: INode[],
    enemyBattalions: IBattalion[],
    battleId: string
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
    
    const battalionStartNode = this.getBattalionStartNode(battalion, battleId);
    
    // Evaluate neutral nodes
    for (const node of neutralNodes) {
      if (battalionStartNode === node.index) continue;
      
      const path = PathfindingService.findNetworkPath(battalionStartNode, node.index);
      if (path.length > 0) {
        evaluateTarget(node.index, path, path.length - 1, 'neutral_node');
      }
    }
    
    // Evaluate enemy battalions
    for (const enemyBattalion of enemyBattalions) {
      if (!CombatService.canTargetBattalion(enemyBattalion)) {
        continue;
      }
      
      let distance: number;
      let path: number[];
      
      if (battalionStartNode === enemyBattalion.position.nodeIndex) {
        distance = 0;
        path = [battalionStartNode];
      } else {
        path = PathfindingService.findNetworkPath(battalionStartNode, enemyBattalion.position.nodeIndex);
        if (path.length === 0) continue;
        distance = path.length - 1;
      }
      
      evaluateTarget(enemyBattalion.position.nodeIndex, path, distance, 'enemy_battalion', enemyBattalion.id);
    }
    
    if (candidateTargets.length === 0) {
      return null;
    }
    
    const selectedTarget = candidateTargets.length === 1 
      ? candidateTargets[0] 
      : candidateTargets[Math.floor(Math.random() * candidateTargets.length)];
    
    return {
      targetNodeIndex: selectedTarget.nodeIndex,
      pathToTarget: selectedTarget.path,
      pathDistance: selectedTarget.distance,
      targetType: selectedTarget.targetType,
      targetBattalionId: selectedTarget.targetBattalionId
    };
  }
} 