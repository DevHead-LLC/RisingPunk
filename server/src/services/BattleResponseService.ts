/**
 * @file BattleResponseService.ts
 * @description Battle response object creation for client API responses
 */

import { BattleStateResponse, ClientBattalion, BattleEndData, BattleLosses, BattalionLoss } from '../types/battle';
import { IBattleDocument } from '../models/Battle';
import { MovementState, NodeOwner, BotType } from '../types/battle';
import { BattleTimerService } from './BattleTimer';
import { PointTrackingService } from './PointTrackingService';

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

    // Calculate battle end data if battle is complete
    let battleEndData: BattleEndData | undefined;
    if (currentPhase === 'complete' && battle.winner) {
      battleEndData = this.createBattleEndData(battle);
    }

    const response = {
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
      lastUpdated: battle.updatedAt,
      battleEndData
    };



    return response;
  }

  private static createBattleEndData(battle: IBattleDocument): BattleEndData {
    // Calculate losses using PointTrackingService
    const battleLosses = PointTrackingService.calculateBattleLosses(
      battle.startingBattalions || [],
      battle.battalions
    );

    // Create battalion loss details
    const battalionLosses: BattalionLoss[] = [];
    
    // Process user battalions
    const userStartingBattalions = battle.startingBattalions?.filter(b => b.owner === NodeOwner.USER) || [];
    const userEndingBattalions = battle.battalions.filter(b => b.owner === NodeOwner.USER);
    
    userStartingBattalions.forEach(startingBattalion => {
      const endingBattalion = userEndingBattalions.find(b => b.id === startingBattalion.id);
      const startingPoints = PointTrackingService.calculateBattalionPoints(startingBattalion);
      const endingPoints = endingBattalion ? PointTrackingService.calculateBattalionPoints(endingBattalion) : 0;
      const losses = startingPoints - endingPoints;
      
      battalionLosses.push({
        battalionId: startingBattalion.id,
        type: startingBattalion.type,
        mark: startingBattalion.mark,
        startingQuantity: startingBattalion.quantity,
        endingQuantity: endingBattalion?.quantity || 0,
        startingPoints,
        endingPoints,
        losses,
        owner: NodeOwner.USER
      });
    });

    // Process enemy battalions
    const enemyStartingBattalions = battle.startingBattalions?.filter(b => b.owner === NodeOwner.ENEMY) || [];
    const enemyEndingBattalions = battle.battalions.filter(b => b.owner === NodeOwner.ENEMY);
    
    enemyStartingBattalions.forEach(startingBattalion => {
      const endingBattalion = enemyEndingBattalions.find(b => b.id === startingBattalion.id);
      const startingPoints = PointTrackingService.calculateBattalionPoints(startingBattalion);
      const endingPoints = endingBattalion ? PointTrackingService.calculateBattalionPoints(endingBattalion) : 0;
      const losses = startingPoints - endingPoints;
      
      battalionLosses.push({
        battalionId: startingBattalion.id,
        type: startingBattalion.type,
        mark: startingBattalion.mark,
        startingQuantity: startingBattalion.quantity,
        endingQuantity: endingBattalion?.quantity || 0,
        startingPoints,
        endingPoints,
        losses,
        owner: NodeOwner.ENEMY
      });
    });

    // Determine victory message
    const victoryMessage = battleLosses.winner === NodeOwner.USER ? 'Breach defended!' : 'Attacker breach!';
    
    // Determine end condition - use stored condition or fallback to timer logic
    const endCondition = (battle as any).endCondition || (battle.battleTime >= 45 ? 'timer' : 'elimination');
    
    // Calculate battle duration
    const battleDuration = battle.endTime && battle.startTime 
      ? Math.floor((battle.endTime.getTime() - battle.startTime.getTime()) / 1000)
      : 0;

    const losses: BattleLosses = {
      userLosses: battleLosses.userLosses,
      enemyLosses: battleLosses.enemyLosses,
      winner: battleLosses.winner,
      userStartingPoints: battleLosses.userStartingPoints,
      userEndingPoints: battleLosses.userEndingPoints,
      enemyStartingPoints: battleLosses.enemyStartingPoints,
      enemyEndingPoints: battleLosses.enemyEndingPoints,
      battalionLosses,
      victoryMessage,
      endCondition,
      battleDuration
    };

    return {
      battleId: battle.battleId,
      winner: battleLosses.winner,
      losses,
      endTime: battle.endTime || new Date(),
      phase: battle.phase
    };
  }
} 