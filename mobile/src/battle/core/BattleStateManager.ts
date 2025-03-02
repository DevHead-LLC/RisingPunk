// Implementation of @battle-state-persistence.mdc#State-Management-Philosophy
// Core battle state management system with frontend focus

import { BattlePhase, BattalionType, Battalion as BattleTypeBattalion, Node as BattleTypeNode } from './BattleTypes';
import { BattleService } from './BattleService';
import { BattlePerformanceMonitor } from './BattlePerformanceMonitor';

export interface BattleState {
  phase: BattlePhase;
  timeRemaining: number;
  nodes: Map<string, BattleTypeNode>;
  battalions: Map<string, BattleTypeBattalion>;
  updateId: number;
  lastUpdated: Date;
}

export interface Node {
  id: string;
  position: { x: number; y: number };
  controllingTeam: string | null;
  controlProgress: number;
  health: number;
}

export interface Battalion {
  id: string;
  position: { x: number; y: number };
  team: string;
  type: BattalionType;
  health: number;
  quantity: number;
  targetId: string | null;
}

export interface BattleStateUpdate {
  phaseUpdate?: BattlePhase;
  timeUpdate?: number;
  nodeUpdates?: Map<string, Partial<Node>>;
  battalionUpdates?: Map<string, Partial<Battalion>>;
}

export class BattleStateManager {
  private static instance: BattleStateManager | null = null;
  private state: BattleState;
  private subscribers: Array<(state: BattleState) => void> = [];
  private updateTimer: NodeJS.Timeout | null = null;
  private battleId: string | null = null;
  private battleService: BattleService;
  private queuedUpdates: BattleStateUpdate[] = [];
  private isProcessingUpdates: boolean = false;
  private pendingUpdates: BattleStateUpdate[] = [];

  constructor(battleService: BattleService) {
    if (!battleService) {
      throw new Error('BattleService is required for BattleStateManager');
    }
    this.battleService = battleService;
    this.state = {
      phase: BattlePhase.PRE_BATTLE,
      timeRemaining: 20,
      nodes: new Map(),
      battalions: new Map(),
      updateId: 0,
      lastUpdated: new Date()
    };
  }

  public static getInstance(battleService: BattleService): BattleStateManager {
    if (!BattleStateManager.instance) {
      BattleStateManager.instance = new BattleStateManager(battleService);
    }
    return BattleStateManager.instance;
  }

  public initializeBattle(battleId: string, initialState?: BattleState): void {
    if (!battleId) {
      throw new Error('Battle ID is required for initialization');
    }
    this.battleId = battleId;
    
    // Use provided initial state or create default state
    this.state = initialState || {
      phase: BattlePhase.PRE_BATTLE,
      timeRemaining: 20,
      nodes: new Map(),
      battalions: new Map(),
      updateId: 0,
      lastUpdated: new Date()
    };

    this.notifySubscribers();
    this.battleService.startSync(
      battleId,
      this.handleServerUpdate.bind(this),
      this.handleSyncError.bind(this)
    );
  }

  public getState(): BattleState {
    return {
      ...this.state,
      nodes: new Map(this.state.nodes),
      battalions: new Map(this.state.battalions)
    };
  }

  public async queueStateUpdate(update: BattleStateUpdate): Promise<void> {
    // Add update to queue
    this.pendingUpdates.push(update);

    // If we're not already processing updates, start processing
    if (!this.isProcessingUpdates) {
      await this.processUpdates();
    }
  }

  private async processUpdates(): Promise<void> {
    if (this.isProcessingUpdates) {
      return;
    }

    this.isProcessingUpdates = true;

    try {
      while (this.pendingUpdates.length > 0) {
        const update = this.pendingUpdates.shift();
        if (update) {
          await this.updateState(update);
        }
      }
    } catch (error) {
      console.error('Error processing updates:', error);
      // Clear pending updates on error to prevent deadlock
      this.pendingUpdates = [];
    } finally {
      this.isProcessingUpdates = false;
    }
  }

  public async updateState(update: BattleStateUpdate): Promise<void> {
    const newState = { ...this.state };

    if (update.phaseUpdate !== undefined) {
      const isValidTransition = this.validatePhaseTransition(this.state.phase, update.phaseUpdate);
      if (!isValidTransition) {
        console.warn(`Invalid phase transition from ${this.state.phase} to ${update.phaseUpdate}`);
        return;
      }
      newState.phase = update.phaseUpdate;
      
      // Handle phase-specific logic
      if (update.phaseUpdate === BattlePhase.DEPLOYMENT) {
        this.startUpdateTimer();
      } else if (update.phaseUpdate === BattlePhase.RESULTS) {
        this.stopUpdateTimer();
      }
    }

    if (update.timeUpdate !== undefined) {
      newState.timeRemaining = Math.max(0, update.timeUpdate);
      if (newState.timeRemaining === 0 && newState.phase === BattlePhase.COMBAT) {
        if (this.validatePhaseTransition(newState.phase, BattlePhase.RESULTS)) {
          newState.phase = BattlePhase.RESULTS;
          this.stopUpdateTimer();
        }
      }
    }

    if (update.nodeUpdates) {
      const newNodes = new Map(this.state.nodes);
      update.nodeUpdates.forEach((nodeUpdate, nodeId) => {
        const existingNode = newNodes.get(nodeId);
        if (!existingNode && !nodeUpdate.position) {
          console.warn(`Attempted to update non-existent node without position: ${nodeId}`);
          return;
        }
        
        const updatedNode = {
          ...(existingNode || {
            id: nodeId,
            position: { x: 0, y: 0 },
            controllingTeam: null,
            controlProgress: 0,
            health: 100
          }),
          ...nodeUpdate
        };
        
        newNodes.set(nodeId, updatedNode);
      });
      newState.nodes = newNodes;
    }

    if (update.battalionUpdates) {
      const newBattalions = new Map(this.state.battalions);
      update.battalionUpdates.forEach((battalionUpdate, battalionId) => {
        if (!this.validateBattalionUpdate(battalionId, battalionUpdate)) {
          return;
        }
        
        const existingBattalion = newBattalions.get(battalionId) || {
          id: battalionId,
          position: battalionUpdate.position || { x: 0, y: 0 },
          team: battalionUpdate.team || '',
          type: battalionUpdate.type || BattalionType.GUARDIAN,
          health: 100,
          quantity: 10,
          targetId: null
        };
        
        newBattalions.set(battalionId, {
          ...existingBattalion,
          ...battalionUpdate
        });
      });
      newState.battalions = newBattalions;
    }

    newState.updateId++;
    newState.lastUpdated = new Date();
    this.state = newState;

    if (this.battleId) {
      try {
        await this.battleService.syncState(this.battleId, newState);
      } catch (error) {
        console.error('Failed to sync state with server:', error);
      }
    }

    this.notifySubscribers();
  }

  private validatePhaseTransition(currentPhase: BattlePhase, newPhase: BattlePhase): boolean {
    const validTransitions = {
      [BattlePhase.PRE_BATTLE]: [BattlePhase.DEPLOYMENT],
      [BattlePhase.DEPLOYMENT]: [BattlePhase.COMBAT],
      [BattlePhase.COMBAT]: [BattlePhase.RESULTS],
      [BattlePhase.RESULTS]: [BattlePhase.PRE_BATTLE]
    };

    return validTransitions[currentPhase]?.includes(newPhase) || false;
  }

  private validateBattalionUpdate(battalionId: string, battalionUpdate: Partial<Battalion>): boolean {
    const existingBattalion = this.state.battalions.get(battalionId);
    
    // For existing battalions, allow any updates
    if (existingBattalion) {
      return true;
    }
    
    // For new battalions, require position
    if (!battalionUpdate.position) {
      console.warn(`Attempted to create new battalion without position: ${battalionId}`);
      return false;
    }

    // Validate position coordinates
    const { x, y } = battalionUpdate.position;
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
      console.warn(`Invalid position coordinates for battalion ${battalionId}: x=${x}, y=${y}`);
      return false;
    }

    return true;
  }

  public subscribe(callback: (state: BattleState) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notifySubscribers(): void {
    const state = this.getState();
    this.subscribers.forEach(callback => callback(state));
  }

  public startUpdateTimer(): void {
    if (this.updateTimer) return;
    this.updateTimer = setInterval(() => {
      if (this.state.phase === BattlePhase.COMBAT) {
        const newTimeRemaining = Math.max(0, this.state.timeRemaining - 1);
        this.queueStateUpdate({ timeUpdate: newTimeRemaining });
      }
    }, 1000);
  }

  public stopUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  public cleanup(): void {
    this.stopUpdateTimer();
    this.subscribers = [];
    this.queuedUpdates = [];
    this.isProcessingUpdates = false;
    if (this.battleId) {
      this.battleService.stopSync(this.battleId);
      this.battleId = null;
    }
  }

  private async handleServerUpdate(serverState: BattleState): Promise<void> {
    await this.updateState({
      phaseUpdate: serverState.phase,
      timeUpdate: serverState.timeRemaining,
      nodeUpdates: serverState.nodes,
      battalionUpdates: serverState.battalions
    });
  }

  private handleSyncError(error: Error): void {
    console.error('Battle sync error:', error);
    const performanceMonitor = BattlePerformanceMonitor.getInstance();
    performanceMonitor.recordNetworkError(error);
    
    // During network errors, we preserve the existing state to maintain consistency
    // If no state exists, we initialize with PRE_BATTLE phase
    if (!this.state) {
      this.state = {
        phase: BattlePhase.PRE_BATTLE,
        timeRemaining: 0,
        updateId: 0,
        lastUpdated: new Date(),
        nodes: new Map(),
        battalions: new Map()
      };
    }

    // Clear any pending updates to ensure we can accept new ones
    this.pendingUpdates = [];
    this.isProcessingUpdates = false;

    // Notify subscribers of the error state
    this.notifySubscribers();
  }
} 