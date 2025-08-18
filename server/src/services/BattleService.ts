import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, NodeOwner, BattalionTargetingResult } from '../types/battle';
import { BattleTimerService } from './BattleTimer';
import { BattalionService } from './BattalionService';
import { BattleSetupService } from './BattleSetupService';
import { AttackService } from './AttackService';
import { ScreenDimensionService } from './ScreenDimensionService';
import { PointTrackingService } from './PointTrackingService';
import { CombatService } from './CombatService';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { NPCRespawnService } from './NPCRespawnService';
import { NPCService } from './NPCService';
import { BattleRewardService } from './BattleRewardService';

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

  async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number, userBattalions?: Array<{type: string, quantity: number}>, defenderNpcSlug?: string, unlockHackRigOnWin?: boolean, defenderNpcInstanceId?: string): Promise<IBattleDocument> {
    const battle = await BattleSetupService.createBattle(attackerId, defenderId, screenWidth, screenHeight, userBattalions, defenderNpcSlug, unlockHackRigOnWin === true, defenderNpcInstanceId);
    
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

  async processBattleEnd(battleId: string): Promise<void> {
    // Public method to handle complete battle end processing
    // This can be called from BattleTimer when elimination is detected
    await this.handleBattleEnd(battleId);
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
    
    // Register elimination callback with BattleTimer
    this.timerService.registerEliminationCallback(battleId, async (battleId: string) => {
      const endConditions = await this.checkBattleEndConditions(battleId);
      return endConditions.shouldEnd;
    });
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
    
    const battle = await this.getBattle(battleId);
    if (!battle) {
      return;
    }

    // Check for complete elimination first
    const eliminationResult = CombatService.checkCompleteElimination(battle.battalions);
    
    let winner: NodeOwner;
    let endCondition: 'timer' | 'elimination' = 'timer';
    
    if (eliminationResult.userEliminated && eliminationResult.enemyEliminated) {
      // Both sides eliminated - determine winner by losses
      const battleLosses = PointTrackingService.calculateBattleLosses(
        battle.startingBattalions || [],
        battle.battalions
      );
      winner = battleLosses.winner;
      endCondition = 'elimination';
    } else if (eliminationResult.userEliminated) {
      // User eliminated - enemy wins
      winner = NodeOwner.ENEMY;
      endCondition = 'elimination';
    } else if (eliminationResult.enemyEliminated) {
      // Enemy eliminated - user wins
      winner = NodeOwner.USER;
      endCondition = 'elimination';
    } else {
      // Timer expiration - determine winner by losses
      const battleLosses = PointTrackingService.calculateBattleLosses(
        battle.startingBattalions || [],
        battle.battalions
      );
      winner = battleLosses.winner;
      endCondition = 'timer';
    }

    // Store end condition and winner for response
    (battle as any).endCondition = endCondition;
    battle.winner = winner;
    await battle.save();

    // Unlock hack rig if user wins by elimination (only if flagged)
    if (winner === NodeOwner.USER && endCondition === 'elimination' && (battle as any).unlockHackRigOnWin) {
      try {
        const user = await User.findById(battle.attackerId);
        if (!user) {
          console.log(`⚠️ BATTLE VICTORY: User ${battle.attackerId} not found for hack rig unlock`);
          return;
        }

        if (!user.unlockedFeatures?.hackRig) {
          user.unlockedFeatures = user.unlockedFeatures || {};
          user.unlockedFeatures.hackRig = true;
          await user.save();
          console.log(`🎉 BATTLE VICTORY: Hack rig unlocked for user ${battle.attackerId}`);
        } else {
          console.log(`ℹ️ BATTLE VICTORY: Hack rig already unlocked for user ${battle.attackerId}`);
        }
      } catch (error) {
        console.error('Failed to unlock hack rig for user', battle.attackerId, error);
      }
    }

    // If battle was against an NPC and user won, clear NPC and schedule respawn
    const npcSlug: string = (battle as any).defenderNpcSlug || '';
    const npcInstanceId: string = (battle as any).defenderNpcInstanceId || '';
    
    if (npcSlug && winner === NodeOwner.USER) {
      try {
        if (npcInstanceId) {
          await (NPCRespawnService as any).clearNpcInstanceFromMap(npcInstanceId, 'main');
          
          const npcDoc: any = await NPCService.getNPCBySlug(npcSlug);
          const delay = typeof npcDoc?.mapRecoverySeconds === 'number' ? npcDoc.mapRecoverySeconds : 300;
          (NPCRespawnService as any).scheduleRespawnForInstance(npcSlug, npcInstanceId, delay, 'main');
        } else {
          // Handle case where no npcInstanceId is available
        }
      } catch (error) {
        // NPC handling failed, but battle will complete
      }
    }

    // Process battle rewards and bot losses if this was a battle against an NPC
    if (npcSlug) {
      try {
        const result = await BattleRewardService.processBattleRewards(battle, battle.attackerId);
      } catch (e) {
        console.error('Battle reward processing failed for', battleId, e);
        console.log('Battle will complete but reward handling failed. Manual intervention may be required.');
      }
    }

    await this.endBattle(battleId, winner);
  }

  private async unlockHackRigForUser(userId: string): Promise<void> {
    try {
      // Convert string ID to ObjectId for MongoDB query
      const objectId = new mongoose.Types.ObjectId(userId);
      const user = await User.findById(objectId);
      
      if (!user) {
        console.log(`⚠️ BATTLE VICTORY: User ${userId} not found for hack rig unlock`);
        return;
      }

      // Only unlock if not already unlocked
      if (!user.unlockedFeatures?.hackRig) {
        user.unlockedFeatures = user.unlockedFeatures || {};
        user.unlockedFeatures.hackRig = true;
        await user.save();
        console.log(`🎉 BATTLE VICTORY: Hack rig unlocked for user ${userId}`);
      } else {
        console.log(`ℹ️ BATTLE VICTORY: Hack rig already unlocked for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ BATTLE VICTORY: Failed to unlock hack rig for user', userId, error);
    }
  }

  async checkBattleEndConditions(battleId: string): Promise<{ shouldEnd: boolean; winner?: NodeOwner; endCondition?: 'timer' | 'elimination' }> {
    const battle = await this.getBattle(battleId);
    if (!battle || battle.phase !== BattlePhase.ACTIVE) {
      return { shouldEnd: false };
    }

    // Check for complete elimination
    const eliminationResult = CombatService.checkCompleteElimination(battle.battalions);
    
    if (eliminationResult.userEliminated || eliminationResult.enemyEliminated) {
      let winner: NodeOwner;
      
      if (eliminationResult.userEliminated && eliminationResult.enemyEliminated) {
        // Both sides eliminated - determine winner by losses
        const battleLosses = PointTrackingService.calculateBattleLosses(
          battle.startingBattalions || [],
          battle.battalions
        );
        winner = battleLosses.winner;
      } else if (eliminationResult.userEliminated) {
        winner = NodeOwner.ENEMY;
      } else {
        winner = NodeOwner.USER;
      }
      
      return { shouldEnd: true, winner, endCondition: 'elimination' };
    }

    return { shouldEnd: false };
  }
} 