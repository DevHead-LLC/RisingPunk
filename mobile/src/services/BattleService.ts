import { API_URL } from '../config';
import { BattleState } from '../battle/core/BattleStateManager';
import { Node } from '../battle/core/BattleTypes';
import { Position } from '../battle/core/types';

interface BattleStateResponse {
  success: boolean;
  state?: BattleState;
  error?: string;
}

export class BattleService {
  private static instance: BattleService;
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncTime: Date = new Date();
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL = 1000; // 1 second

  private constructor() {}

  public static getInstance(): BattleService {
    if (!BattleService.instance) {
      BattleService.instance = new BattleService();
    }
    return BattleService.instance;
  }

  // Start state synchronization
  public startSync(battleId: string, onStateUpdate: (state: BattleState) => void, onError: (error: string) => void): void {
    if (this.syncTimer) return;

    this.syncTimer = setInterval(async () => {
      try {
        const response = await this.syncState(battleId);
        if (response.success && response.state) {
          onStateUpdate(response.state);
          this.retryCount = 0;
          this.lastSyncTime = new Date();
        } else if (response.error) {
          this.handleSyncError(response.error, onError);
        }
      } catch (error) {
        this.handleSyncError(error instanceof Error ? error.message : 'Unknown error', onError);
      }
    }, this.SYNC_INTERVAL);
  }

  // Stop state synchronization
  public stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.retryCount = 0;
  }

  // Sync state with backend
  private async syncState(battleId: string): Promise<BattleStateResponse> {
    try {
      const response = await fetch(`${API_URL}/battles/${battleId}/state`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        state: this.transformStateFromServer(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync state',
      };
    }
  }

  // Update state on backend
  public async updateState(battleId: string, state: Partial<BattleState>): Promise<BattleStateResponse> {
    try {
      const response = await fetch(`${API_URL}/battles/${battleId}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.transformStateToServer(state)),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        state: this.transformStateFromServer(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update state',
      };
    }
  }

  // Handle sync errors with retry logic
  private handleSyncError(error: string, onError: (error: string) => void): void {
    this.retryCount++;
    if (this.retryCount >= this.MAX_RETRIES) {
      this.stopSync();
      onError(`Sync failed after ${this.MAX_RETRIES} retries: ${error}`);
    } else {
      onError(`Sync attempt ${this.retryCount} failed: ${error}`);
    }
  }

  // Transform state from server format
  private transformStateFromServer(data: any): BattleState {
    return {
      phase: data.phase,
      timeRemaining: data.timeRemaining,
      battalions: new Map(Object.entries(data.battalions)),
      nodes: new Map(Object.entries(data.nodes).map(([key, value]) => [
        key,
        value as Node
      ])),
      updateId: data.updateId,
      lastUpdated: new Date(data.lastUpdated),
    };
  }

  // Transform state to server format
  private transformStateToServer(state: Partial<BattleState>): any {
    return {
      ...state,
      battalions: state.battalions ? Object.fromEntries(state.battalions) : undefined,
      nodes: state.nodes ? Object.fromEntries(state.nodes) : undefined,
    };
  }

  // Move battalion with optimistic updates
  public async moveBattalion(
    battleId: string,
    battalionId: string,
    newPosition: Position,
    onUpdate: (state: BattleState) => void
  ): Promise<BattleStateResponse> {
    try {
      // Get current state
      const currentState = await this.syncState(battleId);
      if (!currentState.success || !currentState.state) {
        throw new Error('Failed to get current state');
      }

      // Create optimistic update
      const optimisticState = this.cloneState(currentState.state);
      const battalion = optimisticState.battalions.get(battalionId);
      if (!battalion) {
        throw new Error('Battalion not found');
      }

      // Store original position for rollback
      const originalPosition = { ...battalion.position };

      // Apply optimistic update
      battalion.position = newPosition;
      onUpdate(optimisticState);

      try {
        // Send update to server
        const response = await this.updateState(battleId, {
          battalions: new Map([[battalionId, battalion]])
        });

        if (!response.success) {
          // Rollback on failure
          battalion.position = originalPosition;
          onUpdate(optimisticState);
          throw new Error(response.error || 'Failed to update battalion position');
        }

        return response;
      } catch (error) {
        // Rollback on error
        battalion.position = originalPosition;
        onUpdate(optimisticState);
        throw error;
      }
    } catch (error) {
      // Ensure error is propagated
      throw error;
    }
  }

  // Capture node with optimistic updates
  public async captureNode(
    battleId: string,
    nodeId: string,
    team: string,
    onUpdate: (state: BattleState) => void
  ): Promise<BattleStateResponse> {
    try {
      // Get current state
      const currentState = await this.syncState(battleId);
      if (!currentState.success || !currentState.state) {
        throw new Error('Failed to get current state');
      }

      // Create optimistic update
      const optimisticState = this.cloneState(currentState.state);
      const node = optimisticState.nodes.get(nodeId);
      if (!node) {
        throw new Error('Node not found');
      }

      // Store original values for rollback
      const originalControllingTeam = node.controllingTeam;
      const originalControlProgress = node.controlProgress;

      // Apply optimistic update
      node.controllingTeam = team;
      node.controlProgress = 100;
      onUpdate(optimisticState);

      try {
        // Send update to server
        const response = await this.updateState(battleId, {
          nodes: new Map([[nodeId, node]])
        });

        if (!response.success) {
          // Rollback on failure
          node.controllingTeam = originalControllingTeam;
          node.controlProgress = originalControlProgress;
          onUpdate(optimisticState);
          throw new Error(response.error || 'Failed to update node control');
        }

        return response;
      } catch (error) {
        // Rollback on error
        node.controllingTeam = originalControllingTeam;
        node.controlProgress = originalControlProgress;
        onUpdate(optimisticState);
        throw error;
      }
    } catch (error) {
      // Ensure error is propagated
      throw error;
    }
  }

  // Deep clone state to prevent mutations
  private cloneState(state: BattleState): BattleState {
    return {
      ...state,
      battalions: new Map(Array.from(state.battalions.entries()).map(([key, value]) => [
        key,
        { ...value, position: { ...value.position } }
      ])),
      nodes: new Map(Array.from(state.nodes.entries()).map(([key, value]) => [
        key,
        { ...value, position: { ...value.position } }
      ])),
      lastUpdated: new Date(state.lastUpdated)
    };
  }
} 