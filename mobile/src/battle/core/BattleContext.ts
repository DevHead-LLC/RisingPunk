// Implementation of @battle-core-mechanics.mdc#Battle-Flow
// Core battle context management including phases, state transitions, and timer handling

import { Position, NodeOwnership } from './types';

export enum BattlePhase {
  PRE_BATTLE = 'PRE_BATTLE',
  ACTIVE_BATTLE = 'ACTIVE_BATTLE',
  RESULTS = 'RESULTS'
}

export interface BattleTimer {
  elapsed: number;
  duration: number;
  remaining: number;
}

export interface BattalionState {
  id: string;
  health: number;
  position: Position;
}

export interface NodeState {
  id: string;
  health: number;
  owner?: string;
}

export interface BattalionStateUpdate {
  id: string;
  health?: number;
  position?: Position;
}

export interface NodeStateUpdate {
  id: string;
  health?: number;
  owner?: string;
}

export interface BattleStateUpdate {
  elapsedTime?: number;
  forcedPhase?: BattlePhase;
  battalionUpdates?: BattalionStateUpdate[];
  nodeUpdates?: NodeStateUpdate[];
}

export class BattleStateError extends Error {
  constructor(message: string, public context: Record<string, unknown>) {
    super(message);
    this.name = 'BattleStateError';
  }
}

export interface BattleContext {
  currentPhase: BattlePhase;
  timer: BattleTimer;
  battalions: Map<string, BattalionState>;
  nodes: Map<string, NodeState>;
  updateId: number;
  logger?: (error: { level: string; message: string; context: Record<string, unknown> }) => void;
}

const PHASE_DURATIONS: Record<BattlePhase, number> = {
  [BattlePhase.PRE_BATTLE]: 3,
  [BattlePhase.ACTIVE_BATTLE]: 20,
  [BattlePhase.RESULTS]: 0
};

const VALID_PHASE_TRANSITIONS = new Map<BattlePhase, Set<BattlePhase>>([
  [BattlePhase.PRE_BATTLE, new Set([BattlePhase.ACTIVE_BATTLE])],
  [BattlePhase.ACTIVE_BATTLE, new Set([BattlePhase.RESULTS])],
  [BattlePhase.RESULTS, new Set()]
]);

function validatePhaseTransition(currentPhase: BattlePhase, nextPhase: BattlePhase, context?: BattleContext): void {
  const validTransitions = VALID_PHASE_TRANSITIONS.get(currentPhase);
  if (!validTransitions?.has(nextPhase)) {
    const errorContext = { currentPhase, nextPhase, validTransitions: Array.from(validTransitions || []) };
    if (context?.logger) {
      context.logger({
        level: 'error',
        message: `Invalid phase transition from ${currentPhase} to ${nextPhase}`,
        context: errorContext
      });
    }
    throw new BattleStateError(
      `Invalid phase transition from ${currentPhase} to ${nextPhase}`,
      errorContext
    );
  }
}

function determineNextPhase(currentPhase: BattlePhase, elapsedTime: number, forcedPhase?: BattlePhase, context?: BattleContext): BattlePhase {
  if (forcedPhase !== undefined) {
    validatePhaseTransition(currentPhase, forcedPhase, context);
    return forcedPhase;
  }

  let totalElapsed = elapsedTime;
  switch (currentPhase) {
    case BattlePhase.PRE_BATTLE:
      if (totalElapsed >= PHASE_DURATIONS[BattlePhase.PRE_BATTLE]) {
        return BattlePhase.ACTIVE_BATTLE;
      }
      break;
    case BattlePhase.ACTIVE_BATTLE:
      totalElapsed -= PHASE_DURATIONS[BattlePhase.PRE_BATTLE];
      if (totalElapsed >= PHASE_DURATIONS[BattlePhase.ACTIVE_BATTLE]) {
        return BattlePhase.RESULTS;
      }
      break;
  }

  return currentPhase;
}

function updateTimer(phase: BattlePhase, elapsedTime: number, currentElapsed: number): BattleTimer {
  if (elapsedTime < currentElapsed) {
    throw new BattleStateError(
      'Time cannot move backwards',
      { current: currentElapsed, attempted: elapsedTime }
    );
  }

  const duration = PHASE_DURATIONS[phase];
  let phaseElapsed = elapsedTime;
  
  if (phase === BattlePhase.ACTIVE_BATTLE) {
    phaseElapsed -= PHASE_DURATIONS[BattlePhase.PRE_BATTLE];
  }

  return {
    elapsed: elapsedTime,
    duration,
    remaining: Math.max(0, duration - phaseElapsed)
  };
}

export function createBattleContext(): BattleContext {
  return {
    currentPhase: BattlePhase.PRE_BATTLE,
    timer: {
      elapsed: 0,
      duration: PHASE_DURATIONS[BattlePhase.PRE_BATTLE],
      remaining: PHASE_DURATIONS[BattlePhase.PRE_BATTLE]
    },
    battalions: new Map(),
    nodes: new Map(),
    updateId: 0
  };
}

function validateBattalionUpdate(update: BattalionStateUpdate): void {
  if (update.health !== undefined && update.health < 0) {
    throw new BattleStateError(
      'Battalion health cannot be negative',
      { update }
    );
  }
}

function validateNodeUpdate(update: NodeStateUpdate): void {
  if (update.health !== undefined && update.health < 0) {
    throw new BattleStateError(
      'Node health cannot be negative',
      { update }
    );
  }
}

function validateBattleStateUpdate(update: BattleStateUpdate, currentState: BattleContext): void {
  if (update.elapsedTime !== undefined && update.elapsedTime < currentState.timer.elapsed) {
    throw new BattleStateError(
      'Time cannot move backwards',
      { current: currentState.timer.elapsed, attempted: update.elapsedTime }
    );
  }

  if (update.forcedPhase !== undefined) {
    validatePhaseTransition(currentState.currentPhase, update.forcedPhase, currentState);
  }

  if (update.battalionUpdates) {
    for (const battalionUpdate of update.battalionUpdates) {
      validateBattalionUpdate(battalionUpdate);
      if (battalionUpdate.health !== undefined && battalionUpdate.health < 0) {
        throw new BattleStateError(
          'Battalion health cannot be negative',
          { update: battalionUpdate }
        );
      }
    }
  }

  if (update.nodeUpdates) {
    for (const nodeUpdate of update.nodeUpdates) {
      validateNodeUpdate(nodeUpdate);
    }
  }
}

function updateBattalionState(
  battalionUpdate: BattalionStateUpdate,
  current: BattalionState | undefined
): BattalionState | undefined {
  if (!current) {
    // For new battalions, require both health and position
    if (battalionUpdate.health === undefined || battalionUpdate.position === undefined) {
      return undefined;
    }
    return {
      id: battalionUpdate.id,
      health: battalionUpdate.health,
      position: battalionUpdate.position
    };
  }

  // Validate health before updating
  if (battalionUpdate.health !== undefined) {
    if (typeof battalionUpdate.health !== 'number') {
      // For updates with invalid health, keep the current health
      return {
        id: current.id,
        health: current.health,
        position: battalionUpdate.position ?? current.position
      };
    }
    if (battalionUpdate.health < 0) {
      throw new BattleStateError(
        'Battalion health cannot be negative',
        { update: battalionUpdate }
      );
    }
  }

  // For partial updates, we don't require all fields
  return {
    id: current.id,
    health: battalionUpdate.health ?? current.health,
    position: battalionUpdate.position ?? current.position
  };
}

function updateNodeState(
  nodeUpdate: NodeStateUpdate,
  current: NodeState | undefined
): NodeState | undefined {
  if (!current) {
    // For new nodes, require both health and owner
    if (nodeUpdate.health === undefined || nodeUpdate.owner === undefined || 
        typeof nodeUpdate.health !== 'number' || nodeUpdate.health < 0) {
      return undefined;
    }
    return {
      id: nodeUpdate.id,
      health: nodeUpdate.health,
      owner: nodeUpdate.owner
    };
  }

  // For existing nodes, update only provided fields and validate health
  if (nodeUpdate.health !== undefined) {
    if (typeof nodeUpdate.health !== 'number' || nodeUpdate.health < 0) {
      return current;
    }
  }

  return {
    id: current.id,
    health: nodeUpdate.health ?? current.health,
    owner: nodeUpdate.owner ?? current.owner
  };
}

export function updateBattleState(
  currentState: BattleContext,
  update: BattleStateUpdate
): BattleContext {
  validateBattleStateUpdate(update, currentState);

  const nextPhase = determineNextPhase(
    currentState.currentPhase,
    update.elapsedTime ?? currentState.timer.elapsed,
    update.forcedPhase,
    currentState
  );

  const timer = updateTimer(
    nextPhase,
    update.elapsedTime ?? currentState.timer.elapsed,
    currentState.timer.elapsed
  );

  const battalions = new Map(currentState.battalions);
  if (update.battalionUpdates) {
    for (const battalionUpdate of update.battalionUpdates) {
      const updatedBattalion = updateBattalionState(battalionUpdate, battalions.get(battalionUpdate.id));
      if (updatedBattalion) {
        battalions.set(battalionUpdate.id, updatedBattalion);
      } else {
        battalions.delete(battalionUpdate.id);
      }
    }
  }

  const nodes = new Map(currentState.nodes);
  if (update.nodeUpdates) {
    for (const nodeUpdate of update.nodeUpdates) {
      const currentNode = nodes.get(nodeUpdate.id);
      const updatedNode = updateNodeState(nodeUpdate, currentNode);
      if (updatedNode) {
        nodes.set(nodeUpdate.id, updatedNode);
      } else if (currentNode) {
        nodes.delete(nodeUpdate.id);
      }
    }
  }

  return {
    currentPhase: nextPhase,
    timer,
    battalions,
    nodes,
    updateId: currentState.updateId + 1,
    logger: currentState.logger
  };
} 