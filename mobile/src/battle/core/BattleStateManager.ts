// Implementation of @battle-state-persistence.mdc#State-Management-Philosophy
// Core battle state management system with frontend focus

import { BattlePhase } from './BattleContext';
import { Position, NodeOwnership } from './types';
import { BattleService } from '../../services/BattleService';
import { BattlePerformanceMonitor } from './BattlePerformanceMonitor';

export interface BattleState {
  phase: BattlePhase;
  timeRemaining: number;
  battalions: Map<string, BattalionState>;
  nodes: Map<number, NodeState>;
  updateId: number;
  lastUpdated: Date;
}

export interface BattalionState {
  id: string;
  type: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  health: number;
  position: Position;
  targetId: string | null;
  team: 'user' | 'enemy';
}

export interface NodeState {
  id: number;
  position: Position;
  controllingTeam: 'user' | 'enemy' | null;
  controlProgress: number;
  health: number;
}

export interface StateUpdate {
  battalionUpdates?: Partial<BattalionState>[];
  nodeUpdates?: Partial<NodeState>[];
  phaseUpdate?: BattlePhase;
  timeUpdate?: number;
}

export class BattleStateManager {
  private state: BattleState;
  private subscribers: Set<(state: BattleState) => void>;
  private updateTimer: NodeJS.Timeout | null;
  private battleId: string | null = null;
  private battleService: BattleService;
  private syncEnabled: boolean = false;
  private performanceMonitor: BattlePerformanceMonitor;

  constructor() {
    this.state = this.createInitialState();
    this.subscribers = new Set();
    this.updateTimer = null;
    this.battleService = BattleService.getInstance();
    this.performanceMonitor = BattlePerformanceMonitor.getInstance();
    this.performanceMonitor.startMonitoring();
  }

  private createInitialState(): BattleState {
    return {
      phase: BattlePhase.PRE_BATTLE,
      timeRemaining: 20,
      battalions: new Map(),
      nodes: new Map(),
      updateId: 0,
      lastUpdated: new Date()
    };
  }

  // Initialize battle with ID and start sync
  public initializeBattle(battleId: string): void {
    this.battleId = battleId;
    this.syncEnabled = true;
    this.battleService.startSync(
      battleId,
      (state) => this.handleServerState(state),
      (error) => this.handleSyncError(error)
    );
  }

  // Handle incoming server state
  private handleServerState(serverState: BattleState): void {
    // Only update if server state is newer
    if (serverState.updateId > this.state.updateId) {
      this.state = serverState;
      this.notifySubscribers();
    }
  }

  // Handle sync errors
  private handleSyncError(error: string): void {
    console.error('Battle state sync error:', error);
    // Continue with local state if sync fails
    this.syncEnabled = false;
  }

  // Subscribe to state updates
  public subscribe(callback: (state: BattleState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Start the global update timer
  public startUpdateTimer(): void {
    if (this.updateTimer) return;

    this.updateTimer = setInterval(() => {
      this.updateState({
        timeUpdate: this.state.timeRemaining - 1
      });

      if (this.state.timeRemaining <= 0) {
        this.stopUpdateTimer();
        this.updateState({ phaseUpdate: BattlePhase.RESULTS });
      }
    }, 1000);
  }

  // Stop the global update timer
  public stopUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  // Update state with validation and sync
  public async updateState(update: StateUpdate): Promise<void> {
    const startTime = performance.now();
    const newState = {
      ...this.state,
      battalions: new Map(this.state.battalions),
      nodes: new Map(this.state.nodes)
    };

    let hasChanges = false;

    try {
      // Update phase if provided
      if (update.phaseUpdate) {
        if (this.isValidPhaseTransition(this.state.phase, update.phaseUpdate)) {
          newState.phase = update.phaseUpdate;
          hasChanges = true;
        }
      }

      // Update time if provided
      if (update.timeUpdate !== undefined) {
        newState.timeRemaining = Math.max(0, update.timeUpdate);
        hasChanges = true;
      }

      // Update battalions
      if (update.battalionUpdates) {
        update.battalionUpdates.forEach(battalionUpdate => {
          if (!battalionUpdate.id) return;

          const currentBattalion = this.state.battalions.get(battalionUpdate.id);
          if (currentBattalion) {
            newState.battalions.set(battalionUpdate.id, {
              ...currentBattalion,
              ...battalionUpdate
            });
          } else {
            // Only add new battalion if it has all required fields
            if (this.isValidBattalionState(battalionUpdate as BattalionState)) {
              newState.battalions.set(battalionUpdate.id, battalionUpdate as BattalionState);
            }
          }
          hasChanges = true;
        });
      }

      // Update nodes
      if (update.nodeUpdates) {
        update.nodeUpdates.forEach(nodeUpdate => {
          if (nodeUpdate.id === undefined) return;

          const currentNode = this.state.nodes.get(nodeUpdate.id);
          if (currentNode) {
            newState.nodes.set(nodeUpdate.id, {
              ...currentNode,
              ...nodeUpdate
            });
          } else {
            // Only add new node if it has all required fields
            if (this.isValidNodeState(nodeUpdate as NodeState)) {
              newState.nodes.set(nodeUpdate.id, nodeUpdate as NodeState);
            }
          }
          hasChanges = true;
        });
      }

      // Only update if there are changes
      if (hasChanges) {
        newState.updateId++;
        newState.lastUpdated = new Date();
        this.state = newState;
        this.notifySubscribers();

        // Sync with backend if enabled
        if (this.syncEnabled && this.battleId) {
          try {
            await this.battleService.updateState(this.battleId, this.state);
          } catch (error) {
            console.error('Failed to sync state update:', error);
            // Continue with local state if sync fails
          }
        }
      }

      // Record performance metrics
      const endTime = performance.now();
      const jsThreadUsage = (endTime - startTime) / 16.67; // 16.67ms is one frame at 60fps
      this.performanceMonitor.recordJSThreadUsage(jsThreadUsage);
      this.performanceMonitor.recordFrame();

    } catch (error) {
      console.error('Error during state update:', error);
      throw error;
    }
  }

  // Validate phase transitions
  private isValidPhaseTransition(current: BattlePhase, next: BattlePhase): boolean {
    const validTransitions = new Map([
      [BattlePhase.PRE_BATTLE, [BattlePhase.ACTIVE_BATTLE]],
      [BattlePhase.ACTIVE_BATTLE, [BattlePhase.RESULTS]],
      [BattlePhase.RESULTS, []]
    ]);

    const allowed = validTransitions.get(current);
    return allowed ? allowed.includes(next) : false;
  }

  // Validate battalion state
  private isValidBattalionState(battalion: any): battalion is BattalionState {
    return (
      typeof battalion.id === 'string' &&
      ['breacher', 'guardian', 'phreak'].includes(battalion.type) &&
      typeof battalion.quantity === 'number' &&
      typeof battalion.health === 'number' &&
      battalion.position &&
      typeof battalion.position.x === 'number' &&
      typeof battalion.position.y === 'number' &&
      ['user', 'enemy'].includes(battalion.team)
    );
  }

  // Validate node state
  private isValidNodeState(node: any): node is NodeState {
    return (
      typeof node.id === 'number' &&
      node.position &&
      typeof node.position.x === 'number' &&
      typeof node.position.y === 'number' &&
      typeof node.health === 'number' &&
      typeof node.controlProgress === 'number' &&
      (node.controllingTeam === null || ['user', 'enemy'].includes(node.controllingTeam))
    );
  }

  // Notify all subscribers of state changes
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.state));
  }

  // Get current state (immutable)
  public getState(): Readonly<BattleState> {
    return Object.freeze({ ...this.state });
  }

  // Reset state and stop sync
  public reset(): void {
    this.stopUpdateTimer();
    if (this.battleId) {
      this.battleService.stopSync();
    }
    this.battleId = null;
    this.syncEnabled = false;
    this.state = this.createInitialState();
    this.notifySubscribers();
  }

  // Clean up resources
  public cleanup(): void {
    this.subscribers.clear();
    this.performanceMonitor.cleanup();
    this.reset();
  }
} 