/**
 * @file BattleResponseService.ts
 * @description Battle response object creation for client API responses
 */

import { BattleStateResponse, ClientBattalion } from '../types/battle';
import { IBattleDocument } from '../models/Battle';
import { MovementState } from '../types/battle';
import { BattleTimerService } from './BattleTimer';

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
    retargetingStatus?: {nodeIndex: number, affectedBattalionIds: string[]},
    movementStates?: Map<string, MovementState>,
    timerState?: {countdown: number, battleTime: number, timeRemaining: number, phase: any}
  ): BattleStateResponse {
    if (retargetingStatus) {
      console.log(`📡 CLIENT SYNC: Including retargeting status in response`);
      console.log(`📡 CLIENT SYNC: Node ${retargetingStatus.nodeIndex} captured, ${retargetingStatus.affectedBattalionIds.length} battalions affected`);
    }

    // Use timer state if provided, otherwise use battle data
    const currentPhase = timerState ? timerState.phase : battle.phase;
    const currentCountdown = timerState ? timerState.countdown : battle.countdown;
    const currentBattleTime = timerState ? timerState.battleTime : battle.battleTime;

    // Use timeRemaining from timerState if available, otherwise calculate it
    const timeRemaining = timerState?.timeRemaining !== undefined ? 
      timerState.timeRemaining : 
      (currentPhase === 'battle' ? (BattleTimerService.getTimerConfig().BATTLE_DURATION - currentBattleTime) : currentCountdown);

    // Convert movement states to array only if needed
    const movementStatesArray = movementStates && movementStates.size > 0 ? Array.from(movementStates.values()) : undefined;

    return {
      battleId: battle.battleId,
      phase: currentPhase,
      countdown: currentCountdown,
      battleTime: currentBattleTime,
      timeRemaining: timeRemaining,
      winner: battle.winner,
      battalions: mappedBattalions,
      nodes: networkData.updatedNodes,
      networkConnections: networkData.networkConnections,
      lineProperties: networkData.lineProperties,
      targetingResults,
      retargetingStatus,
      movementStates: movementStatesArray,
      lastUpdated: battle.updatedAt
    };
  }
} 