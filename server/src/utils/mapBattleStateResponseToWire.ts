/**
 * Maps server {@link BattleStateResponse} to the GET /api/battle/:id/state `data` wire shape
 * (shared {@link BattleState}) so replay frames match live client polling.
 */

import type {
  BattleState,
  BattleWireBattleEndData,
  BattleWireBattleEndPhase,
  BattleWireBattleLosses,
  BattleWireBattalionLoss,
} from '../../../shared/battleReplay';
import {
  BattleEndData,
  BattleLosses,
  BattalionLoss,
  BattleStateResponse,
  BotType,
  NodeOwner,
} from '../types/battle';

function nodeOwnerToWire(o: NodeOwner): 'user' | 'enemy' {
  if (o === NodeOwner.USER) return 'user';
  return 'enemy';
}

function mapWirePhase(phase: string): BattleState['phase'] {
  const p = String(phase);
  if (p === 'countdown') return 'countdown';
  if (p === 'active' || p === 'battle') return 'battle';
  if (p === 'complete') return 'victory';
  return 'setup';
}

function mapServerPhaseToBattleEndWire(phase: string): BattleWireBattleEndPhase {
  const p = String(phase);
  if (p === 'setup') return 'setup';
  if (p === 'countdown') return 'countdown';
  if (p === 'active' || p === 'battle') return 'active';
  if (p === 'complete') return 'complete';
  throw new Error(`mapServerPhaseToBattleEndWire: unknown battle phase "${String(phase)}"`);
}

function mapBattalionLoss(l: BattalionLoss): BattleWireBattalionLoss {
  return {
    battalionId: l.battalionId,
    type: l.type as BotType as BattleWireBattalionLoss['type'],
    mark: l.mark,
    startingQuantity: l.startingQuantity,
    endingQuantity: l.endingQuantity,
    startingPoints: l.startingPoints,
    endingPoints: l.endingPoints,
    losses: l.losses,
    owner: nodeOwnerToWire(l.owner),
  };
}

function mapBattleLosses(losses: BattleLosses): BattleWireBattleLosses {
  return {
    userLosses: losses.userLosses,
    enemyLosses: losses.enemyLosses,
    winner: nodeOwnerToWire(losses.winner),
    userStartingPoints: losses.userStartingPoints,
    userEndingPoints: losses.userEndingPoints,
    enemyStartingPoints: losses.enemyStartingPoints,
    enemyEndingPoints: losses.enemyEndingPoints,
    battalionLosses: losses.battalionLosses.map(mapBattalionLoss),
    victoryMessage: losses.victoryMessage,
    endCondition: losses.endCondition,
    battleDuration: losses.battleDuration,
  };
}

function mapBattleEndDataToWire(data: BattleEndData): BattleWireBattleEndData {
  const ext = data as BattleEndData & {
    lifetimeHighUpdated?: boolean;
    isUserDefender?: boolean;
  };
  return {
    battleId: data.battleId,
    winner: nodeOwnerToWire(data.winner),
    losses: mapBattleLosses(data.losses),
    endTime: data.endTime,
    phase: mapServerPhaseToBattleEndWire(String(data.phase)),
    experienceGained: data.experienceGained,
    hackerRewards: data.hackerRewards,
    levelUp: data.levelUp,
    attackerId: data.attackerId,
    defenderId: data.defenderId,
    pvpExperienceAttacker: data.pvpExperienceAttacker,
    pvpExperienceDefender: data.pvpExperienceDefender,
    levelUpAttacker: data.levelUpAttacker,
    levelUpDefender: data.levelUpDefender,
    lifetimeHighUpdated: ext.lifetimeHighUpdated,
    isUserDefender: ext.isUserDefender,
    isPvPBattle: data.isPvPBattle,
  };
}

export function mapBattleStateResponseToWire(battleState: BattleStateResponse): BattleState {
  const phase = mapWirePhase(String(battleState.phase));
  const winner =
    battleState.winner === undefined ? undefined : nodeOwnerToWire(battleState.winner);

  const wire: BattleState = {
    battleId: battleState.battleId,
    phase,
    timeRemaining: battleState.timeRemaining ?? 0,
    winner,
    battalions: (battleState.battalions || []).map((b) => ({
      id: b.id,
      type: b.type as BattleState['battalions'][number]['type'],
      quantity: b.quantity,
      currentHealth: b.currentHealth,
      maxHealth: b.maxHealth,
      baseHealthPerUnit: b.baseHealthPerUnit,
      isDestroyed: b.isDestroyed,
      destroyedAt: b.destroyedAt,
      position: { ...b.position },
      isUser: b.isUser,
      mark: b.mark,
      stats: { ...b.stats },
      movementState: b.movementState,
    })),
    nodes: (battleState.nodes || []).map((n) => ({
      index: n.index,
      owner: n.owner as BattleState['nodes'][number]['owner'],
      tugOfWarProgress: n.tugOfWarProgress,
      maxCaptureThreshold: n.maxCaptureThreshold,
      position: { ...n.position },
    })),
    networkConnections: [...(battleState.networkConnections || [])],
    lineProperties: [...(battleState.lineProperties || [])],
    movementStates: battleState.movementStates?.map((m) => ({ ...m })),
    victoryCondition: battleState.winner
      ? {
          winner: nodeOwnerToWire(battleState.winner),
          reason: 'timeout',
        }
      : undefined,
    battleEndData: battleState.battleEndData
      ? mapBattleEndDataToWire(battleState.battleEndData)
      : undefined,
  };

  return wire;
}
