/**
 * @file BattleResponseService.ts
 * @description Battle response object creation for client API responses
 */

import { BattleStateResponse, ClientBattalion } from '../types/battle';
import { IBattleDocument } from '../models/Battle';
import { MovementState } from './MovementService';

export interface NetworkData {
  networkConnections: any[];
  lineProperties: any[];
  updatedNodes: any[];
}

export class BattleResponseService {
  /**
   * Create battle state response for client
   */
  static createBattleStateResponse(
    battle: IBattleDocument,
    mappedBattalions: ClientBattalion[],
    networkData: NetworkData,
    targetingResults: any[] = []
  ): BattleStateResponse {
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