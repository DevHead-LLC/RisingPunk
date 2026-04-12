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
    const neutralNodeIndices = new Set(neutralNodes.map(n => n.index));
    
    // Evaluate neutral nodes as direct targets.
    for (const node of neutralNodes) {
      if (battalionStartNode === node.index) continue;
      
      const path = PathfindingService.findNetworkPath(battalionStartNode, node.index);
      if (path.length > 0) {
        evaluateTarget(node.index, path, path.length - 1, 'neutral_node');
      }
    }
    
    // Evaluate enemy battalions. If the path to an enemy passes through a neutral
    // node, redirect to the first neutral on the path so it must be captured first
    // (neutral nodes act as walls that block passage to enemies behind them).
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
      
      const intermediateNodes = path.slice(1, -1);
      const firstNeutralIdx = intermediateNodes.findIndex(idx => neutralNodeIndices.has(idx));
      
      if (firstNeutralIdx !== -1) {
        const wallNodeIndex = intermediateNodes[firstNeutralIdx];
        const wallPath = path.slice(0, firstNeutralIdx + 2);
        evaluateTarget(wallNodeIndex, wallPath, wallPath.length - 1, 'neutral_node');
      } else {
        evaluateTarget(enemyBattalion.position.nodeIndex, path, distance, 'enemy_battalion', enemyBattalion.id);
      }
    }
    
    if (candidateTargets.length === 0) {
      return null;
    }

    // At equal distance, still prefer neutral nodes as a tiebreaker (e.g. enemy and
    // neutral co-located on the same node — capture the node before engaging).
    const neutralAtClosest = candidateTargets.filter(c => c.targetType === 'neutral_node');
    const selectionPool = neutralAtClosest.length > 0 ? neutralAtClosest : candidateTargets;

    const selectedTarget = selectionPool.length === 1 
      ? selectionPool[0] 
      : selectionPool[Math.floor(Math.random() * selectionPool.length)];

    return {
      targetNodeIndex: selectedTarget.nodeIndex,
      pathToTarget: selectedTarget.path,
      pathDistance: selectedTarget.distance,
      targetType: selectedTarget.targetType,
      targetBattalionId: selectedTarget.targetBattalionId
    };
  }
} 