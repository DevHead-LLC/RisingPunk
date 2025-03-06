import { BattleState } from './BattleTypes';

export interface BattleService {
  startSync(
    battleId: string,
    onUpdate: (state: BattleState) => void,
    onError: (error: Error) => void
  ): void;
  stopSync(battleId: string): void;
  syncState(battleId: string, state: BattleState): Promise<void>;
}

export class MockBattleService implements BattleService {
  private onUpdate: ((state: BattleState) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private battleId: string | null = null;
  private mockState: BattleState | null = null;

  public startSync(
    battleId: string,
    onUpdate: (state: BattleState) => void,
    onError: (error: Error) => void
  ): void {
    this.battleId = battleId;
    this.onUpdate = onUpdate;
    this.onError = onError;
  }

  public stopSync(battleId: string): void {
    if (this.battleId === battleId) {
      this.battleId = null;
      this.onUpdate = null;
      this.onError = null;
    }
  }

  public async syncState(battleId: string, state: BattleState): Promise<void> {
    if (this.battleId === battleId) {
      this.mockState = state;
      if (this.onUpdate) {
        this.onUpdate(state);
      }
    }
  }

  // Test helper methods
  public triggerError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    }
  }

  public getMockState(): BattleState | null {
    return this.mockState;
  }
} 