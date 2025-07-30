import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, NodeOwner, BattalionTargetingResult } from '../types/battle';
import { BattleTimerService } from './BattleTimer';
import { BattalionService } from './BattalionService';
import { BattleSetupService } from './BattleSetupService';
import { AttackService } from './AttackService';
import { ScreenDimensionService } from './ScreenDimensionService';

export class BattleService {
  private timerService: BattleTimerService;

  constructor() {
    this.timerService = BattleTimerService.getInstance();
  }

  getTimerService(): BattleTimerService {
    return this.timerService;
  }

  async triggerInitialTargeting(battleId: string): Promise<BattalionTargetingResult[]> {
    const battle = await this.getBattle(battleId);
    if (!battle) {
      console.log('❌ BATTLE NOT FOUND for initial targeting:', battleId);
      return [];
    }
    return BattalionService.triggerInitialTargeting(battle.battalions, battle.nodes, battleId);
  }

  async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number): Promise<IBattleDocument> {
    const savedBattle = await BattleSetupService.createBattle(attackerId, defenderId, screenWidth, screenHeight);
    
    ScreenDimensionService.setBattleScreenDimensions(savedBattle.battleId, screenWidth, screenHeight);
    this.timerService.startTimer(savedBattle.battleId);
    this.setupTimerListeners(savedBattle.battleId);
    
    return savedBattle;
  }
  
  async getBattle(battleId: string): Promise<IBattleDocument | null> {
    return Battle.findOne({ battleId });
  }
  
  async endBattle(battleId: string, winner: NodeOwner): Promise<IBattleDocument | null> {
    BattalionService.stopMovementUpdates(battleId);
    
    const battle = await Battle.findOne({ battleId });
    if (!battle) return null;
    
    battle.phase = BattlePhase.COMPLETE;
    battle.winner = winner;
    battle.endTime = new Date();
    
    const updatedBattle = await battle.save();
    
    BattalionService.clearTargetingResults(battleId);
    AttackService.clearAllAttacks();
    
    return updatedBattle;
  }

  private setupTimerListeners(battleId: string): void {
    const events = [
      { name: 'countdownUpdate', handler: (data: any) => this.updateBattle(battleId, { countdown: data.countdown, phase: data.phase }) },
      { name: 'phaseChange', handler: (data: any) => this.handlePhaseChange(battleId, data.phase) },
      { name: 'battleEnd', handler: () => this.handleBattleEnd(battleId) }
    ];

    events.forEach(({ name, handler }) => {
      this.timerService.on(name, (data: any) => {
        if (data.battleId === battleId) handler(data);
      });
    });
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
      console.log(`🎮 BATTLE ACTIVE - Starting movement for ${battleId}`);
      BattalionService.startMovementUpdates(battleId);
    }
    
    await this.updateBattle(battleId, updates);
  }

  private async handleBattleEnd(battleId: string): Promise<void> {
    BattalionService.stopMovementUpdates(battleId);
    await this.endBattle(battleId, NodeOwner.ENEMY);
  }
} 