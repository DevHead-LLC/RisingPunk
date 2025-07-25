/**
 * @file BattleResponseService.ts
 * @description Battle response object creation for client API responses
 * 
 * AUTHORITY: Client data formatting and API response structure
 * OVERLAPS: Uses MovementState and targeting data - MUST coordinate with retargeting implementation
 * CONFLICTS: May need to include retargeting data in client responses
 * DEPENDENCIES: BattalionMappingService, MovementService states, targeting results
 */

import { BattleStateResponse, ClientBattalion } from '../types/battle';
import { IBattleDocument } from '../models/Battle';
import { MovementState } from '../../../mobile/src/types/battleTypes';

export interface NetworkData {
  networkConnections: any[];
  lineProperties: any[];
  updatedNodes: any[];
}

export class BattleResponseService {
  /**
   * Create battle state response for client (PHASE 1: Enhanced with retargeting support)
   */
  static createBattleStateResponse(
    battle: IBattleDocument,
    mappedBattalions: ClientBattalion[],
    networkData: NetworkData,
    targetingResults: any[] = [],
    retargetingStatus?: {nodeIndex: number, affectedBattalionIds: string[]} // NEW parameter
  ): BattleStateResponse {
    // PHASE 1: Log retargeting status for verification
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
      lastUpdated: battle.updatedAt
    };
  }

  /**
   * Create battle state response with custom timer values
   */
  static createBattleStateResponseWithTimer(
    battle: IBattleDocument,
    mappedBattalions: ClientBattalion[],
    networkData: NetworkData,
    currentPhase: any,
    currentCountdown: number,
    currentBattleTime: number,
    targetingResults: any[] = [],
    movementStates: Map<string, MovementState> = new Map() // Add movement data
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
      movementStates: Array.from(movementStates.values()), // Add movement data to response
      lastUpdated: battle.updatedAt
    };
  }
} 