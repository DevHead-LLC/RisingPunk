/**
 * @file BattleResponseService.ts
 * @description Battle response object creation for client API responses
 */

import { BattleStateResponse, ClientBattalion } from '../types/battle';
import { IBattleDocument } from '../models/Battle';
import { MovementState } from '../types/battle';

export interface NetworkData {
  networkConnections: any[];
  lineProperties: any[];
  updatedNodes: any[];
}

export class BattleResponseService {
  static createBattleStateResponse(
    battle: IBattleDocument,
    mappedBattalions: ClientBattalion[],
    networkData: NetworkData,
    targetingResults: any[] = [],
    retargetingStatus?: {nodeIndex: number, affectedBattalionIds: string[]}
  ): BattleStateResponse {
    if (retargetingStatus) {
      console.log(`📡 CLIENT SYNC: Including retargeting status in response`);
      console.log(`📡 CLIENT SYNC: Node ${retargetingStatus.nodeIndex} captured, ${retargetingStatus.affectedBattalionIds.length} battalions affected`);
    }

    return {
      battleId: battle.battleId,
      phase: battle.phase,
      countdown: battle.countdown,
      battleTime: battle.battleTime,
      winner: battle.winner,
      battalions: mappedBattalions,
      nodes: networkData.updatedNodes,
      networkConnections: networkData.networkConnections,
      lineProperties: networkData.lineProperties,
      targetingResults,
      retargetingStatus,
      lastUpdated: battle.updatedAt
    };
  }

  static createBattleStateResponseWithTimer(
    battle: IBattleDocument,
    mappedBattalions: ClientBattalion[],
    networkData: NetworkData,
    currentPhase: any,
    currentCountdown: number,
    currentBattleTime: number,
    targetingResults: any[] = [],
    movementStates: Map<string, MovementState> = new Map()
  ): BattleStateResponse {
    return {
      battleId: battle.battleId,
      phase: currentPhase,
      countdown: currentCountdown,
      battleTime: currentBattleTime,
      winner: battle.winner,
      battalions: mappedBattalions,
      nodes: networkData.updatedNodes,
      networkConnections: networkData.networkConnections,
      lineProperties: networkData.lineProperties,
      targetingResults,
      movementStates: Array.from(movementStates.values()),
      lastUpdated: battle.updatedAt
    };
  }
} 