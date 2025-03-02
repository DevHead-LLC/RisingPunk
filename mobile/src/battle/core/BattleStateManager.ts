// Implementation of @battle-state-persistence.mdc#State-Management-Philosophy
// Core battle state management system with frontend focus

import { BattlePhase } from './BattleTypes';
import { BattleService } from './BattleService';

export interface BattleState {
  phase: BattlePhase;
  timeRemaining: number;
  nodes: Map<string, Node>;
  battalions: Map<string, Battalion>;
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

  public initializeBattle(battleId: string): void {
    if (!battleId) {
      throw new Error('Battle ID is required for initialization');
    }
    this.battleId = battleId;
    this.state = {
      phase: BattlePhase.PRE_BATTLE,
      timeRemaining: 20,
      nodes: new Map(),
      battalions: new Map(),
      updateId: 0,
      lastUpdated: new Date()
    };
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

  public queueStateUpdate(update: BattleStateUpdate): void {
    this.queuedUpdates.push(update);
    if (!this.isProcessingUpdates) {
      this.processQueuedUpdates();
    }
  }

  private async processQueuedUpdates(): Promise<void> {
    if (this.isProcessingUpdates || this.queuedUpdates.length === 0) return;
    
    this.isProcessingUpdates = true;
    while (this.queuedUpdates.length > 0) {
      const update = this.queuedUpdates.shift();
      if (update) {
        await this.updateState(update);
      }
    }
    this.isProcessingUpdates = false;
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
        const existingBattalion = newBattalions.get(battalionId);
        if (!existingBattalion && !battalionUpdate.position) {
          console.warn(`Attempted to update non-existent battalion without position: ${battalionId}`);
          return;
        }
        
        const updatedBattalion = {
          ...(existingBattalion || {
            id: battalionId,
            position: { x: 0, y: 0 },
            team: '',
            health: 100,
            quantity: 10,
            targetId: null
          }),
          ...battalionUpdate
        };
        
        newBattalions.set(battalionId, updatedBattalion);
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
    // Implement retry logic
    setTimeout(() => {
      if (this.battleId) {
        this.battleService.startSync(
          this.battleId,
          this.handleServerUpdate.bind(this),
          this.handleSyncError.bind(this)
        );
      }
    }, 5000);
  }
} 