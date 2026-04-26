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
import { NPCRespawnService } from './NPCRespawnService';
import { NPCService } from './NPCService';
import { BattleRewardService } from './BattleRewardService';
import { DefenderDeploymentService } from './DefenderDeploymentService';
import { BattleInventorySettlementService } from './BattleInventorySettlementService';
import { sendBattleNotifications } from './BattleNotificationService';
import { processPvPBattleMoneyTransfer } from './PvPBattleMoneyService';
import { processPvPBattleExperienceReward } from './PvPBattleExperienceService';
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
    marchMeta?: { marchSourcedAttack: boolean; sourceMarchId: string },
    hunterBattleContract?: { hunterRosterId: string; hunterVisualKey: string }
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
        marchMeta,
        hunterBattleContract
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
      if (!isHeadlessWorkingBattleActive(battleId)) {
        BattalionService.startMovementUpdates(battleId);
      }
    }

    // Persist phase (and ACTIVE countdown/battleTime) before defender first-wave deploy so deployWave
    // cannot strand the battle in a non-ACTIVE DB state if retargeting throws after inventory writes.
    await this.updateBattle(battleId, updates);

    if (phase === BattlePhase.ACTIVE) {
      const battle = await this.getBattle(battleId);
      const marchSourced = (battle as { marchSourcedAttack?: boolean } | null)?.marchSourcedAttack === true;

      if (battle?.isUserDefender) {
        await DefenderDeploymentService.onTick(battleId);
      }
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

    // Store end condition and winner for response.
    // Must persist before PvP money transfer (reads winner from MongoDB).
    // Bugbot: do not set phase to COMPLETE (or endTime) here. Clients poll phase === complete and
    // BattleResponseService only attaches battleEndData when phase is complete; an early COMPLETE
    // save created a window with COMPLETE + missing XP/cash/level-up. endBattle() persists COMPLETE
    // + endTime after NPC/PvP rewards and related battle fields are written.
    (battle as any).endCondition = endCondition;
    battle.winner = winner;
    await battle.save();

    // Unlock hack rig on the first successful flagged hack-rig battle win.
    if (winner === NodeOwner.USER && (battle as any).unlockHackRigOnWin) {
      try {
        await User.updateOne(
          { _id: battle.attackerId, 'unlockedFeatures.hackRig': { $ne: true } },
          { $set: { 'unlockedFeatures.hackRig': true } }
        );
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

      let pvpXpAttacker = 0;
      let pvpXpDefender = 0;
      let isSwarmMarchBattle = false;
      /** Only true after `settleSwarmBattleIfNeeded` completes — if false, per-participant `BTL|` were not sent (Bugbot / ios-bugs.md). */
      let swarmSettlementSucceeded = false;
      const marchSourcedPvp =
        (battle as { marchSourcedAttack?: boolean }).marchSourcedAttack === true &&
        !!(battle as { sourceMarchId?: string }).sourceMarchId;
      if (marchSourcedPvp) {
        try {
          const { AttackMarch } = await import('../models/AttackMarch');
          const m = await AttackMarch.findOne({
            marchId: String((battle as { sourceMarchId?: string }).sourceMarchId),
          })
            .select('swarmSessionId')
            .lean();
          isSwarmMarchBattle = Boolean(m?.swarmSessionId);
        } catch (swarmDetectErr) {
          console.error('[BattleService.handleBattleEnd] failed to detect swarm march source:', battleId, swarmDetectErr);
        }
      }
      if (isSwarmMarchBattle) {
        try {
          const { computePvpXpFromOpponentLosses } = await import('./PvPBattleExperienceService');
          pvpXpAttacker = computePvpXpFromOpponentLosses(
            battle.startingBattalions ?? [],
            battle.battalions ?? [],
            NodeOwner.ENEMY
          );
          pvpXpDefender = computePvpXpFromOpponentLosses(
            battle.startingBattalions ?? [],
            battle.battalions ?? [],
            NodeOwner.USER
          );
          const { settleSwarmBattleIfNeeded } = await import('./SwarmService');
          await settleSwarmBattleIfNeeded(battle, pvpCashTransferred, {
            attackerTotal: pvpXpAttacker,
            defenderTotal: pvpXpDefender,
          });
          swarmSettlementSucceeded = true;
        } catch (swarmSettleErr) {
          console.error('Swarm PvP settlement failed for', battleId, swarmSettleErr);
        }
      } else {
        try {
          const xpResult = await processPvPBattleExperienceReward(battleId);
          pvpXpAttacker = xpResult.attackerXp;
          pvpXpDefender = xpResult.defenderXp;
        } catch (e) {
          console.error('PvP battle experience reward failed for', battleId, e);
        }
      }

      // Send battle result DMs to attacker and defender (same pattern as Probe Report)
      try {
        const battleForNotifications = await this.getBattle(battleId);
        if (!battleForNotifications) {
          console.error('Battle document missing before notifications for', battleId);
        } else {
          // Fresh read so BTL payload uses persisted battalions (in-memory battle can diverge if battle doc is updated between save and send).
          // Bugbot / ios-bugs.md: Omit attacker + `swarm:1` only when settlement succeeded and per-participant `BTL|` were sent. If settlement threw, fall back to standard attacker+defender DMs so the lead still gets a battle report.
          await sendBattleNotifications(
            battleForNotifications,
            pvpCashTransferred,
            pvpXpAttacker,
            pvpXpDefender,
            isSwarmMarchBattle && swarmSettlementSucceeded
              ? { omitAttackerNotification: true, swarmMarchPvp: true }
              : undefined
          );
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
      const marchNpcSourced =
        (battle as { marchSourcedAttack?: boolean }).marchSourcedAttack === true;
      const runMarchNpcFollowUp = async (): Promise<void> => {
        if (!marchNpcSourced) {
          return;
        }
        try {
          const { onMarchNpcBattleEnded } = await import('./MarchBattleFollowupService');
          await onMarchNpcBattleEnded(battle);
        } catch (marchFollowErr) {
          console.error('[BattleService.handleBattleEnd] March follow-up failed:', battleId, marchFollowErr);
        }
      };

      try {
        const rewardResult = await BattleRewardService.processBattleRewards(battle, battle.attackerId);
        if (!rewardResult.success) {
          console.error(
            '[BattleService.handleBattleEnd] NPC rewards failed (march follow-up still attempted if hack march):',
            battleId,
            rewardResult.error
          );
        }
        await runMarchNpcFollowUp();
      } catch (e) {
        console.error('Battle reward processing failed for', battleId, e);
        await runMarchNpcFollowUp();
      }
      // March-sourced NPC: always advance `resolving` → `returning` + schedule return + queue reconcile.
      // Previously this ran only when `processBattleRewards` succeeded; a reward/save failure left the row
      // stuck in `resolving` (no return march, no DM, client commitment locked, second attack pulses at target).
      const marchSourcedNpc = (battle as { marchSourcedAttack?: boolean }).marchSourcedAttack === true;
      if (marchSourcedNpc) {
        try {
          const { onMarchNpcBattleEnded } = await import('./MarchBattleFollowupService');
          await onMarchNpcBattleEnded(battle);
        } catch (marchFollowErr) {
          console.error('[BattleService.handleBattleEnd] March follow-up failed:', battleId, marchFollowErr);
        }
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