import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, NodeOwner, BattalionTargetingResult } from '../types/battle';
import { BattleTimerService } from './BattleTimer';
import { BattalionService } from './BattalionService';
import { BattleSetupService } from './BattleSetupService';
import { AttackService } from './AttackService';
import { ScreenDimensionService } from './ScreenDimensionService';

export class BattleService {
  private timerService: BattleTimerService;
  private battleListeners: Map<string, Array<{ event: string; handler: (...args: any[]) => void }>> = new Map();

  constructor() {
    this.timerService = BattleTimerService.getInstance();
  }

  getTimerService(): BattleTimerService {
    return this.timerService;
  }

  async triggerInitialTargeting(battleId: string): Promise<BattalionTargetingResult[]> {
    const battle = await this.getBattle(battleId);
    if (!battle) {
      return [];
    }
    return BattalionService.triggerInitialTargeting(battle.battalions, battle.nodes, battleId);
  }

  async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number, userBattalions?: Array<{type: string, quantity: number}>): Promise<IBattleDocument> {
    const battle = await BattleSetupService.createBattle(attackerId, defenderId, screenWidth, screenHeight, userBattalions);
    
    ScreenDimensionService.setBattleScreenDimensions(battle.battleId, screenWidth, screenHeight);
    
    this.timerService.startTimer(battle.battleId);
    this.setupTimerListeners(battle.battleId);
    
    return battle;
  }
  
  async getBattle(battleId: string): Promise<IBattleDocument | null> {
    return Battle.findOne({ battleId });
  }
  
  async endBattle(battleId: string, winner: NodeOwner): Promise<IBattleDocument | null> {
    BattalionService.stopMovementUpdates(battleId);
    this.removeBattleListeners(battleId);
    
    const battle = await Battle.findOne({ battleId });
    if (!battle) return null;
    
    battle.phase = BattlePhase.COMPLETE;
    battle.winner = winner;
    battle.endTime = new Date();
    
    const updatedBattle = await battle.save();
    
    BattalionService.clearTargetingResults(battleId);
    AttackService.clearAllAttacks();
    ScreenDimensionService.clearBattleScreenDimensions(battleId);
    
    return updatedBattle;
  }

  private setupTimerListeners(battleId: string): void {
    const listeners: Array<{ event: string; handler: (...args: any[]) => void }> = [];
    
    const events = [
      { name: 'countdownUpdate', handler: (data: any) => this.updateBattle(battleId, { countdown: data.countdown, phase: data.phase }) },
      { name: 'phaseChange', handler: (data: any) => this.handlePhaseChange(battleId, data.phase) },
      { name: 'battleEnd', handler: () => this.handleBattleEnd(battleId) }
    ];

    events.forEach(({ name, handler }) => {
      const listener = (data: any) => {
        if (data.battleId === battleId) handler(data);
      };
      
      this.timerService.on(name, listener);
      listeners.push({ event: name, handler: listener });
    });
    
    this.battleListeners.set(battleId, listeners);
  }

  private removeBattleListeners(battleId: string): void {
    const listeners = this.battleListeners.get(battleId);
    if (!listeners) return;
    
    listeners.forEach(({ event, handler }) => {
      this.timerService.off(event, handler);
    });
    
    this.battleListeners.delete(battleId);
  }

  private async updateBattle(battleId: string, updates: { countdown?: number; phase?: BattlePhase }): Promise<void> {
    const battle = await Battle.findOne({ battleId });
    if (!battle) return;

    Object.assign(battle, updates);
    await battle.save();
  }

  private async handlePhaseChange(battleId: string, phase: BattlePhase): Promise<void> {
    const updates: { phase: BattlePhase; countdown?: number; battleTime?: number } = { phase };
    
    if (phase === BattlePhase.ACTIVE) {
      updates.countdown = 0;
      updates.battleTime = 0;
      BattalionService.startMovementUpdates(battleId);
    }
    
    await this.updateBattle(battleId, updates);
  }

  private async handleBattleEnd(battleId: string): Promise<void> {
    BattalionService.stopMovementUpdates(battleId);
    await this.endBattle(battleId, NodeOwner.ENEMY);
  }
} 