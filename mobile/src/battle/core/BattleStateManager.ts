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
  damagingTeam?: string;
}

interface Position {
  x: number;
  y: number;
}

interface StateUpdate {
  type: 'health' | 'position' | 'target';
  value: any;
  timestamp: number;
}

export class BattleStateManager {
  private static instance: BattleStateManager | null = null;
  private battleService: BattleService;
  private currentState: BattleState;
  private subscribers: ((state: BattleState) => void)[] = [];
  private stateQueue: any[] = [];
  private battleId: string | null = null;
  private queuedUpdates: BattleStateUpdate[] = [];
  private isProcessingUpdates: boolean = false;
  private pendingUpdates: StateUpdate[] = [];
  private updateBuffer: StateUpdate[];
  private readonly BUFFER_FLUSH_INTERVAL = 1000; // 1 second
  private readonly MAX_BUFFER_SIZE = 100;
  private bufferTimer: NodeJS.Timeout | null;
  private updateTimer: NodeJS.Timeout | null = null;
  private nodeDamageByTeam: Map<string, Map<string, number>> = new Map();
  // Default capture threshold percentage
  private readonly CAPTURE_THRESHOLD_PERCENTAGE = 0.75;

  constructor(battleService: BattleService) {
    if (!battleService) {
      throw new Error('BattleService is required for BattleStateManager');
    }
    this.battleService = battleService;
    this.currentState = {
      phase: BattlePhase.PRE_BATTLE,
      timeRemaining: 20,
      nodes: new Map(),
      battalions: new Map(),
      updateId: 0,
      lastUpdated: new Date()
    };
    this.updateBuffer = [];
    this.bufferTimer = null;
    this.startBufferTimer();
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
    
    // Reset damage tracking on new battle initialization
    this.resetDamageTracking();
    
    // Use provided initial state or create default state
    this.currentState = initialState || {
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
      this.handleStateUpdate.bind(this),
      (error) => console.error('Battle sync error:', error)
    );
  }

  public getState(): BattleState {
    return this.currentState;
  }

  public async queueStateUpdate(update: BattleStateUpdate): Promise<void> {
    // Add update to queue
    this.queuedUpdates.push(update);

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
      while (this.queuedUpdates.length > 0) {
        const update = this.queuedUpdates.shift();
        if (update) {
          await this.updateState(update);
        }
      }
    } catch (error) {
      console.error('Error processing updates:', error);
      // Clear pending updates on error to prevent deadlock
      this.queuedUpdates = [];
    } finally {
      this.isProcessingUpdates = false;
    }
  }

  public async updateState(update: BattleStateUpdate): Promise<void> {
    const newState = { ...this.currentState };

    if (update.phaseUpdate !== undefined) {
      const isValidTransition = this.validatePhaseTransition(this.currentState.phase, update.phaseUpdate);
      if (!isValidTransition) {
        console.warn(`Invalid phase transition from ${this.currentState.phase} to ${update.phaseUpdate}`);
        return;
      }
      newState.phase = update.phaseUpdate;
      
      // Handle phase-specific logic
      if (update.phaseUpdate === BattlePhase.COMBAT) {
        this.stopUpdateTimer(); // Clear any existing timer
        newState.timeRemaining = update.timeUpdate !== undefined ? update.timeUpdate : 20;
        this.currentState = newState; // Update state before starting timer
        this.startUpdateTimer();
        this.notifySubscribers();
        return; // Return early since we've already notified subscribers
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

    const nodesToUpdate: string[] = [];

    if (update.nodeUpdates) {
      const newNodes = new Map(this.currentState.nodes);
      update.nodeUpdates.forEach((nodeUpdate, nodeId) => {
        const existingNode = newNodes.get(nodeId);
        if (!existingNode && !nodeUpdate.position) {
          console.warn(`Attempted to update non-existent node without position: ${nodeId}`);
          return;
        }
        
        if (existingNode && nodeUpdate.health !== undefined && existingNode.health > nodeUpdate.health) {
          const damageAmount = existingNode.health - nodeUpdate.health;
          
          let damagingTeam: string | null = update.damagingTeam || null;
          
          if (!damagingTeam) {
            for (const battalion of this.currentState.battalions.values()) {
              if (battalion.targetId === nodeId) {
                damagingTeam = battalion.team;
                break;
              }
            }
          }
          
          if (damagingTeam) {
            this.trackNodeDamage(nodeId, damagingTeam, damageAmount);
            nodesToUpdate.push(nodeId);
          }
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
      const newBattalions = new Map(this.currentState.battalions);
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
      
      // Check if any battalions were updated that might affect capture thresholds
      if (nodesToUpdate.length === 0) {
        // Find nodes that currently have damage and need control recalculation
        for (const [nodeId] of this.nodeDamageByTeam.entries()) {
          nodesToUpdate.push(nodeId);
        }
      }
    }

    // Apply control status updates for all affected nodes
    for (const nodeId of nodesToUpdate) {
      this.updateNodeControlStatus(nodeId, newState);
    }

    newState.updateId++;
    newState.lastUpdated = new Date();
    this.currentState = newState;

    if (this.battleId) {
      try {
        await this.battleService.syncState(this.battleId, newState);
      } catch (error) {
        console.error('Failed to sync state with server:', error);
      }
    }

    this.notifySubscribers();
  }

  private validatePhaseTransition(currentPhase: BattlePhase, nextPhase: BattlePhase): boolean {
    const validTransitions = {
      [BattlePhase.PRE_BATTLE]: [BattlePhase.DEPLOYMENT],
      [BattlePhase.DEPLOYMENT]: [BattlePhase.COMBAT],
      [BattlePhase.COMBAT]: [BattlePhase.RESULTS],
      [BattlePhase.RESULTS]: [BattlePhase.PRE_BATTLE]
    };

    return validTransitions[currentPhase]?.includes(nextPhase) || false;
  }

  private validateBattalionUpdate(battalionId: string, battalionUpdate: Partial<Battalion>): boolean {
    const existingBattalion = this.currentState.battalions.get(battalionId);
    
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

  public subscribe(callback: (state: BattleState) => void): void {
    this.subscribers.push(callback);
    // Immediately notify the new subscriber of the current state
    callback(this.getState());
  }

  public subscribeToUpdates(callback: (state: BattleState) => void): void {
    this.subscribers.push(callback);
  }

  public queueStateChanges(changes: any[]): void {
    this.stateQueue.push(...changes);
  }

  public getStateBuffer(): any[] {
    return [...this.stateQueue];
  }

  public startUpdateTimer(): void {
    if (this.updateTimer === null && this.currentState.phase === BattlePhase.COMBAT) {
      this.updateTimer = setInterval(() => {
        if (this.currentState.timeRemaining > 0) {
          this.updateState({
            timeUpdate: this.currentState.timeRemaining - 1
          }).catch(error => {
            console.error('Failed to update timer:', error);
          });
        }
      }, 1000);
    }
  }

  public stopUpdateTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private startBufferTimer(): void {
    if (this.bufferTimer === null) {
      this.bufferTimer = setInterval(() => this.flushBuffer(), this.BUFFER_FLUSH_INTERVAL);
    }
  }

  private flushBuffer(): void {
    if (this.updateBuffer.length > 0) {
      // Process buffered updates
      const updates = [...this.updateBuffer];
      this.updateBuffer = [];
      
      // Apply updates
      updates.forEach(update => {
        this.pendingUpdates.push(update);
      });
      
      this.notifySubscribers();
    }
  }

  public notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
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
    this.pendingUpdates = [];
    this.updateBuffer = [];
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
      this.bufferTimer = null;
    }
  }

  private handleStateUpdate(state: BattleState): void {
    this.currentState = state;
    this.notifySubscribers();
  }

  public processStateQueue(): void {
    if (this.stateQueue.length === 0) return;

    const changes = [...this.stateQueue];
    this.stateQueue = [];

    // Process all queued changes
    const newState = { ...this.currentState };
    for (const change of changes) {
      switch (change.type) {
        case 'MOVE':
          // Update battalion position
          if (newState.battalions.has(change.data.id)) {
            const battalion = newState.battalions.get(change.data.id)!;
            battalion.position = change.data.position;
          }
          break;
        case 'ATTACK':
          // Update battalion combat state
          if (newState.battalions.has(change.data.id)) {
            const battalion = newState.battalions.get(change.data.id)!;
            battalion.targetId = change.data.target;
          }
          break;
        // Add more cases as needed
      }
    }

    // Update state and notify subscribers
    this.handleStateUpdate(newState);
  }

  public getNodeDamageByTeam(nodeId: string, team: string): number {
    const nodeDamageMap = this.nodeDamageByTeam.get(nodeId) || new Map<string, number>();
    return nodeDamageMap.get(team) || 0;
  }

  private trackNodeDamage(nodeId: string, team: string, damage: number): void {
    const nodeDamageMap = this.nodeDamageByTeam.get(nodeId) || new Map<string, number>();
    const currentDamage = nodeDamageMap.get(team) || 0;
    nodeDamageMap.set(team, currentDamage + damage);
    this.nodeDamageByTeam.set(nodeId, nodeDamageMap);
    
    // Note: Control status update is now handled in updateState method
  }

  // Updated method to update a node's control status
  private updateNodeControlStatus(nodeId: string, newState: BattleState): void {
    const node = newState.nodes.get(nodeId);
    if (!node) return;
    
    // Find team with highest damage percentage relative to their threshold
    let highestProgressTeam: string | null = null;
    let highestProgress = 0;
    
    // Track all teams that have reached 100% capture
    const capturedTeams: string[] = [];
    
    // Calculate progress for each team that has dealt damage
    const nodeDamageMap = this.nodeDamageByTeam.get(nodeId) || new Map<string, number>();
    
    // Get all teams that have dealt damage to this node
    for (const [team, damage] of nodeDamageMap.entries()) {
      const threshold = this.getCaptureThreshold(team);
      if (threshold <= 0) continue; // Skip teams with no threshold
      
      // Calculate capture progress as percentage of threshold
      const progress = damage / threshold;
      
      // Track teams that have fully captured the node
      if (progress >= 1.0) {
        capturedTeams.push(team);
      }
      
      // Update highest progress team
      if (progress > highestProgress) {
        highestProgress = progress;
        highestProgressTeam = team;
      }
    }
    
    // Update node control status
    if (highestProgressTeam) {
      // Determine the controlling team
      let controlTeam = highestProgressTeam;
      
      // If multiple teams have reached 100%, use the most recent one to attack
      // This is determined by the order in the capturedTeams array (last one is most recent)
      if (capturedTeams.length > 0) {
        controlTeam = capturedTeams[capturedTeams.length - 1];
      }
      
      // Create a new node object with updated control values
      const updatedNode = { 
        ...node,
        controllingTeam: controlTeam,
        controlProgress: Math.min(highestProgress, 1.0) // Cap at 1.0 (100%)
      };
      
      // Update the node in the state
      newState.nodes.set(nodeId, updatedNode);
    }
  }

  public resetDamageTracking(): void {
    this.nodeDamageByTeam = new Map();
  }

  // Calculate total army health for a given team
  public getTotalArmyHealth(team: string): number {
    let totalHealth = 0;
    
    // Iterate through all battalions
    for (const battalion of this.currentState.battalions.values()) {
      // Sum up health for the specified team
      if (battalion.team === team) {
        // Total health = health per unit * number of units
        totalHealth += battalion.health * battalion.quantity;
      }
    }
    
    return totalHealth;
  }
  
  // Calculate the capture threshold for a team (75% of total army health)
  public getCaptureThreshold(team: string): number {
    const totalHealth = this.getTotalArmyHealth(team);
    return Math.floor(totalHealth * this.CAPTURE_THRESHOLD_PERCENTAGE);
  }
  
  // Check if a node has been captured by a team
  public isNodeCaptured(nodeId: string, team: string): boolean {
    // Get the damage dealt by the team to this node
    const damageDealt = this.getNodeDamageByTeam(nodeId, team);
    
    // Get the capture threshold for this team
    const threshold = this.getCaptureThreshold(team);
    
    // Node is captured if damage exceeds threshold
    return damageDealt >= threshold;
  }

  // Calculate the percentage of damage towards capturing a node
  public getNodeControlProgress(nodeId: string, team: string): number {
    const damageDealt = this.getNodeDamageByTeam(nodeId, team);
    const threshold = this.getCaptureThreshold(team);
    
    if (threshold <= 0) return 0;
    return Math.min(damageDealt / threshold, 1.0);
  }
  
  // Get the team with the highest control progress for a node
  public getDominantTeam(nodeId: string): string | null {
    const nodeDamageMap = this.nodeDamageByTeam.get(nodeId);
    if (!nodeDamageMap || nodeDamageMap.size === 0) return null;
    
    let highestProgressTeam: string | null = null;
    let highestProgress = 0;
    
    for (const [team, damage] of nodeDamageMap.entries()) {
      const progress = this.getNodeControlProgress(nodeId, team);
      if (progress > highestProgress) {
        highestProgress = progress;
        highestProgressTeam = team;
      }
    }
    
    return highestProgressTeam;
  }
}