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
import { DefenderDeploymentService } from './DefenderDeploymentService';
import { BattleInventorySettlementService } from './BattleInventorySettlementService';
import { sendBattleNotifications } from './BattleNotificationService';
import { processPvPBattleMoneyTransfer } from './PvPBattleMoneyService';
import { BattleReplayRecorder } from './BattleReplayRecorder';
import {
  detachHeadlessWorkingBattle,
  getHeadlessWorkingBattle,
  isHeadlessWorkingBattleActive,
} from './HeadlessBattleRunner';
import { MovementService } from './MovementService';

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

  async createBattle(
    attackerId: string,
    defenderId: string,
    screenWidth: number,
    screenHeight: number,
    userBattalions?: Array<{ type: string; quantity: number; markLevel?: number }>,
    defenderNpcSlug?: string,
    unlockHackRigOnWin?: boolean,
    defenderNpcInstanceId?: string,
    hackMapCellX?: number,
    hackMapCellY?: number,
    marchMeta?: { marchSourcedAttack: boolean; sourceMarchId: string }
  ): Promise<IBattleDocument> {
    try {
      const battle = await BattleSetupService.createBattle(
        attackerId,
        defenderId,
        screenWidth,
        screenHeight,
        userBattalions,
        defenderNpcSlug,
        unlockHackRigOnWin === true,
        defenderNpcInstanceId,
        hackMapCellX,
        hackMapCellY,
        marchMeta
      );
      
      ScreenDimensionService.setBattleScreenDimensions(battle.battleId, screenWidth, screenHeight);
      
      this.timerService.startTimer(battle.battleId);
      
      this.setupTimerListeners(battle.battleId);

      void BattleReplayRecorder.getInstance()
        .onBattleCreated(battle)
        .catch((err) => {
          console.error('[BattleService] BattleReplayRecorder.onBattleCreated failed:', err);
        });

      return battle;
    } catch (error) {
      throw error;
    }
  }
  
  async getBattle(battleId: string): Promise<IBattleDocument | null> {
    const w = getHeadlessWorkingBattle(battleId);
    if (w) {
      return w;
    }
    return Battle.findOne({ battleId });
  }
  
  async endBattle(battleId: string, winner: NodeOwner): Promise<IBattleDocument | null> {
    BattalionService.stopMovementUpdates(battleId);
    this.removeBattleListeners(battleId);
    
    const battle = getHeadlessWorkingBattle(battleId) ?? (await Battle.findOne({ battleId }));
    if (!battle) {
      detachHeadlessWorkingBattle(battleId);
      return null;
    }
    
    battle.phase = BattlePhase.COMPLETE;
    battle.winner = winner;
    battle.endTime = new Date();
    
    const updatedBattle = await battle.save();
    detachHeadlessWorkingBattle(battleId);

    BattalionService.clearTargetingResults(battleId);
    AttackService.clearBattleAttacks(battleId);
    AttackService.clearRetargetingQueueForBattle(battleId);
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
      { name: 'battleTimeUpdate', handler: (data: any) => this.handleBattleTimeUpdate(battleId, data) },
      { name: 'battleEnd', handler: () => this.handleBattleEnd(battleId) }
    ];

    events.forEach(({ name, handler }) => {
      const listener = (data: any) => {
        if (data.battleId === battleId) {
          return handler(data);
        }
        return undefined;
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

  private async updateBattle(battleId: string, updates: { countdown?: number; phase?: BattlePhase; battleTime?: number }): Promise<void> {
    const battle = await this.getBattle(battleId);
    if (!battle) return;

    Object.assign(battle, updates);
    if (isHeadlessWorkingBattleActive(battleId)) {
      return;
    }
    await battle.save();
  }

  private async handlePhaseChange(battleId: string, phase: BattlePhase): Promise<void> {
    const updates: { phase: BattlePhase; countdown?: number; battleTime?: number } = { phase };

    if (phase === BattlePhase.ACTIVE) {
      updates.countdown = 0;
      updates.battleTime = 0;
      BattalionService.startMovementUpdates(battleId);
    }

    // Persist phase (and ACTIVE countdown/battleTime) before defender first-wave deploy so deployWave
    // cannot strand the battle in a non-ACTIVE DB state if retargeting throws after inventory writes.
    await this.updateBattle(battleId, updates);

    if (phase === BattlePhase.ACTIVE) {
      const battle = await this.getBattle(battleId);
      if (battle?.isUserDefender) {
        await DefenderDeploymentService.onTick(battleId);
      }
      // Async march battles never hit BattleController.getBattleState; without this, targeting never
      // starts and timer expiry yields a 0–0 tie → defender wins (Hack Failed, no casualties).
      const marchSourced = (battle as { marchSourcedAttack?: boolean } | null)?.marchSourcedAttack === true;
      if (marchSourced && battle && BattalionService.getTargetingResults(battleId).length === 0) {
        await this.triggerInitialTargeting(battleId);
        const primed = await this.getBattle(battleId);
        if (primed) {
          await MovementService.updateBattleMovement(
            battleId,
            primed,
            BattalionService.getTargetingResults(battleId)
          );
        }
      }
    }
  }

  private async handleBattleTimeUpdate(battleId: string, data: any): Promise<void> {
    
    // Update battle time
    await this.updateBattle(battleId, { battleTime: data.battleTime });
    
    // Check if this is a user defender battle and deploy waves if needed
    const battle = await this.getBattle(battleId);
    
    if (battle?.isUserDefender && battle.phase === BattlePhase.ACTIVE) {
      await DefenderDeploymentService.onTick(battleId);
    }
  }

  private async handleBattleEnd(battleId: string): Promise<void> {
    BattalionService.stopMovementUpdates(battleId);
    
    const battle = await this.getBattle(battleId);
    if (!battle) {
      BattleReplayRecorder.getInstance().abandonRecording(battleId);
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
      winner = NodeOwner.ENEMY;
      endCondition = 'elimination';
    } else if (eliminationResult.enemyEliminated) {
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
    if (!isHeadlessWorkingBattleActive(battleId)) {
      await battle.save();
    }

    // Unlock hack rig if user wins by elimination (only if flagged)
    if (winner === NodeOwner.USER && endCondition === 'elimination' && (battle as any).unlockHackRigOnWin) {
      try {
        const user = await User.findById(battle.attackerId);
        if (!user) {
          return;
        }

        if (!user.unlockedFeatures?.hackRig) {
          user.unlockedFeatures = user.unlockedFeatures || {};
          user.unlockedFeatures.hackRig = true;
          await user.save();
        }
      } catch (error) {
        console.error('Failed to unlock hack rig for user', battle.attackerId, error);
      }
    }

    // If battle was against an NPC and user won, clear NPC and schedule respawn
    const npcSlug: string = (battle as any).defenderNpcSlug || '';
    const npcInstanceId: string = (battle as any).defenderNpcInstanceId || '';
    
    if (npcSlug && winner === NodeOwner.USER) {
      if (npcInstanceId) {
        try {
          await NPCRespawnService.clearNpcInstanceFromMap(npcInstanceId, 'main');
          try {
            const npcDoc: any = await NPCService.getNPCBySlug(npcSlug);
            const delay = typeof npcDoc?.mapRecoverySeconds === 'number' ? npcDoc.mapRecoverySeconds : 300;
            await NPCRespawnService.scheduleRespawnForInstance(npcSlug, npcInstanceId, delay, 'main');
          } catch (schedErr) {
            console.error(
              '[BattleService.handleBattleEnd] NPC respawn schedule failed (map already cleared):',
              { battleId, npcSlug, npcInstanceId },
              schedErr
            );
          }
          try {
            const { sweepQueuedMarchesAfterNpcInstanceDefeated } = await import(
              './MarchNpcKnockoutSweepService'
            );
            await sweepQueuedMarchesAfterNpcInstanceDefeated(npcInstanceId);
          } catch (sweepErr) {
            console.error(
              '[BattleService.handleBattleEnd] NPC knockout march sweep failed:',
              { battleId, npcInstanceId },
              sweepErr
            );
          }
        } catch (clearErr) {
          console.error(
            '[BattleService.handleBattleEnd] NPC clear from map failed (knockout sweep skipped):',
            { battleId, npcSlug, npcInstanceId },
            clearErr
          );
        }
      } else {
        console.warn('[BattleService.handleBattleEnd] Skipping NPC respawn schedule: battle has defenderNpcSlug but no defenderNpcInstanceId. Ensure the client sends defenderNpcInstanceId when starting an NPC battle.', { battleId, defenderNpcSlug: npcSlug });
      }
    }

    // Process inventory settlement for user-vs-user battles
    if (battle.isUserDefender) {
      try {
        await BattleInventorySettlementService.processBattleEndSettlement(battle);
      } catch (e) {
        console.error('Battle inventory settlement failed for', battleId, e);
        // Continue with battle end even if settlement fails
      }

      // Record battle statistics for user-vs-user battles
      try {
        const { BattleStatisticsService } = require('./BattleStatisticsService');
        await BattleStatisticsService.recordBattleStats(battle);
      } catch (e) {
        console.error('Battle statistics recording failed for', battleId, e);
        // Continue with battle end even if statistics recording fails
      }

      // PvP wallet theft (defender → attacker) when attacker wins; idempotent per battle
      let pvpCashTransferred = 0;
      try {
        const pvpResult = await processPvPBattleMoneyTransfer(battleId);
        pvpCashTransferred = pvpResult.transferredAmount;
      } catch (e) {
        console.error('PvP battle money transfer failed for', battleId, e);
      }

      // Send battle result DMs to attacker and defender (same pattern as Probe Report)
      try {
        const battleForNotifications = await this.getBattle(battleId);
        if (!battleForNotifications) {
          console.error('Battle document missing before notifications for', battleId);
        } else {
          // Fresh read so BTL payload uses persisted battalions (in-memory battle can diverge if battle doc is updated between save and send).
          await sendBattleNotifications(battleForNotifications, pvpCashTransferred);
        }
      } catch (e) {
        console.error('Battle notifications failed for', battleId, e);
      }

      // March-sourced PvP: return leg + reconcile queue (NPC march uses the path inside NPC rewards)
      const marchSourced = (battle as { marchSourcedAttack?: boolean }).marchSourcedAttack === true;
      if (marchSourced) {
        try {
          const { onMarchNpcBattleEnded } = await import('./MarchBattleFollowupService');
          await onMarchNpcBattleEnded(battle);
        } catch (marchFollowErr) {
          console.error('[BattleService.handleBattleEnd] March follow-up (PvP) failed:', battleId, marchFollowErr);
        }
      }
    }

    // Process battle rewards and bot losses if this was a battle against an NPC
    if (npcSlug) {
      try {
        const rewardResult = await BattleRewardService.processBattleRewards(battle, battle.attackerId);
        if (rewardResult.success) {
          try {
            const { onMarchNpcBattleEnded } = await import('./MarchBattleFollowupService');
            await onMarchNpcBattleEnded(battle);
          } catch (marchFollowErr) {
            console.error('[BattleService.handleBattleEnd] March follow-up failed:', battleId, marchFollowErr);
          }
        } else {
          console.error(
            '[BattleService.handleBattleEnd] NPC rewards failed; march follow-up skipped:',
            battleId,
            rewardResult.error
          );
        }
      } catch (e) {
        console.error('Battle reward processing failed for', battleId, e);
      }
      try {
        const battleForNpcDm = await this.getBattle(battleId);
        if (battleForNpcDm && !battleForNpcDm.isUserDefender) {
          const { sendNpcBattleNotification } = await import('./BattleNotificationService');
          await sendNpcBattleNotification(battleForNpcDm);
        }
      } catch (dmErr) {
        console.error('[BattleService.handleBattleEnd] NPC battle report DM failed:', battleId, dmErr);
      }
    }

    const completed = await this.endBattle(battleId, winner);
    if (completed) {
      await BattleReplayRecorder.getInstance().finalizeAfterBattleEnd(battleId, completed);
    }
  }

  /**
   * Stop timer/listeners/movement/replay capture and mark the battle COMPLETE with enemy win,
   * without running `handleBattleEnd` (used when a march stays `resolving` too long).
   */
  async abandonMarchBattleRuntimeNoSettlement(battleId: string): Promise<void> {
    BattalionService.stopMovementUpdates(battleId);
    this.removeBattleListeners(battleId);
    this.timerService.stopTimer(battleId);
    BattalionService.clearTargetingResults(battleId);
    AttackService.clearBattleAttacks(battleId);
    AttackService.clearRetargetingQueueForBattle(battleId);
    ScreenDimensionService.clearBattleScreenDimensions(battleId);
    BattleReplayRecorder.getInstance().abandonRecording(battleId);
    detachHeadlessWorkingBattle(battleId);

    const battle = await Battle.findOne({ battleId });
    if (!battle) {
      return;
    }
    if (battle.phase === BattlePhase.COMPLETE) {
      return;
    }
    battle.phase = BattlePhase.COMPLETE;
    battle.winner = NodeOwner.ENEMY;
    battle.endTime = new Date();
    await battle.save();
  }

  private async unlockHackRigForUser(userId: string): Promise<void> {
    try {
      // Convert string ID to ObjectId for MongoDB query
      const objectId = new mongoose.Types.ObjectId(userId);
      const user = await User.findById(objectId);
      
      if (!user) {
        return;
      }

      // Only unlock if not already unlocked
      if (!user.unlockedFeatures?.hackRig) {
        user.unlockedFeatures = user.unlockedFeatures || {};
        user.unlockedFeatures.hackRig = true;
        await user.save();
      }
    } catch (error) {
      console.error('Failed to unlock hack rig for user', userId, error);
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