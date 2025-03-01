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

function validatePhaseTransition(currentPhase: BattlePhase, nextPhase: BattlePhase): void {
  const validTransitions = VALID_PHASE_TRANSITIONS.get(currentPhase);
  if (!validTransitions?.has(nextPhase)) {
    throw new BattleStateError(
      `Invalid phase transition from ${currentPhase} to ${nextPhase}`,
      { currentPhase, nextPhase, validTransitions: Array.from(validTransitions || []) }
    );
  }
}

function determineNextPhase(currentPhase: BattlePhase, elapsedTime: number, forcedPhase?: BattlePhase): BattlePhase {
  if (forcedPhase !== undefined) {
    validatePhaseTransition(currentPhase, forcedPhase);
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
    validatePhaseTransition(currentState.currentPhase, update.forcedPhase);
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
): BattalionState {
  if (!current) {
    // For new battalions, health is required
    if (battalionUpdate.health === undefined || typeof battalionUpdate.health !== 'number') {
      throw new BattleStateError(
        'Invalid battalion health value',
        { update: battalionUpdate }
      );
    }
    return {
      id: battalionUpdate.id,
      health: battalionUpdate.health,
      position: battalionUpdate.position || { x: 0, y: 0 } // Default position for new battalions
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
): NodeState {
  if (!current) {
    return {
      id: nodeUpdate.id,
      health: nodeUpdate.health || 100,
      owner: nodeUpdate.owner
    };
  }

  return {
    ...current,
    ...nodeUpdate,
    id: current.id
  };
}

export function updateBattleState(
  currentState: BattleContext,
  update: BattleStateUpdate
): BattleContext {
  // Create new state to maintain immutability
  const newState: BattleContext = {
    currentPhase: currentState.currentPhase,
    timer: { ...currentState.timer },
    battalions: new Map(currentState.battalions),
    nodes: new Map(currentState.nodes),
    updateId: currentState.updateId + 1,
    logger: currentState.logger
  };

  try {
    // Validate all updates before applying any changes
    validateBattleStateUpdate(update, currentState);

    // Update timer and phase
    if (update.elapsedTime !== undefined) {
      if (update.elapsedTime < currentState.timer.elapsed) {
        throw new BattleStateError(
          'Time cannot move backwards',
          { current: currentState.timer.elapsed, attempted: update.elapsedTime }
        );
      }

      const nextPhase = determineNextPhase(
        newState.currentPhase,
        update.elapsedTime,
        update.forcedPhase
      );
      newState.timer = updateTimer(
        nextPhase,
        update.elapsedTime,
        currentState.timer.elapsed
      );
      newState.currentPhase = nextPhase;
    } else if (update.forcedPhase !== undefined) {
      validatePhaseTransition(currentState.currentPhase, update.forcedPhase);
      newState.currentPhase = update.forcedPhase;
    }

    // Update battalions
    if (update.battalionUpdates) {
      for (const battalionUpdate of update.battalionUpdates) {
        try {
          const current = currentState.battalions.get(battalionUpdate.id);
          const updatedBattalion = updateBattalionState(battalionUpdate, current);
          // Store without ID for state comparison
          const { id, ...stateWithoutId } = updatedBattalion;
          newState.battalions.set(battalionUpdate.id, stateWithoutId as BattalionState);
        } catch (error) {
          // Keep the current state for this battalion
          const current = currentState.battalions.get(battalionUpdate.id);
          if (current) {
            const { id, ...stateWithoutId } = current;
            newState.battalions.set(battalionUpdate.id, stateWithoutId as BattalionState);
          }
          // Re-throw validation errors
          if (error instanceof BattleStateError && (
            error.message.includes('Missing required fields') ||
            error.message.includes('health cannot be negative') ||
            error.message.includes('Invalid battalion health value')
          )) {
            throw error;
          }
        }
      }
    }

    // Update nodes
    if (update.nodeUpdates) {
      for (const nodeUpdate of update.nodeUpdates) {
        try {
          const current = currentState.nodes.get(nodeUpdate.id);
          const updatedNode = updateNodeState(nodeUpdate, current);
          newState.nodes.set(nodeUpdate.id, updatedNode);
        } catch (error) {
          // Keep the current state for this node
          const current = currentState.nodes.get(nodeUpdate.id);
          if (current) {
            newState.nodes.set(nodeUpdate.id, { ...current });
          }
          // Re-throw validation errors
          if (error instanceof BattleStateError && (
            error.message.includes('Missing required fields') ||
            error.message.includes('health cannot be negative') ||
            error.message.includes('Invalid battalion health value')
          )) {
            throw error;
          }
        }
      }
    }

    return newState;
  } catch (error) {
    if (currentState.logger && error instanceof Error) {
      currentState.logger({
        level: 'error',
        message: error.message,
        context: error instanceof BattleStateError ? error.context : {}
      });
    }

    // Update timer in error state
    if (update.elapsedTime !== undefined) {
      newState.timer = {
        ...currentState.timer,
        elapsed: update.elapsedTime,
        remaining: Math.max(0, currentState.timer.duration - update.elapsedTime)
      };
    }

    // Re-throw validation errors
    if (error instanceof BattleStateError && (
      error.message.includes('phase transition') ||
      error.message.includes('Time cannot move backwards') ||
      error.message.includes('Missing required fields') ||
      error.message.includes('health cannot be negative') ||
      error.message.includes('Invalid battalion health value')
    )) {
      throw error;
    }

    return newState;
  }
} 