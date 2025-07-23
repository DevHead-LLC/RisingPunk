import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, NodeOwner, IBattalion, INode, BattalionTargetingResult } from '../types/battle';
import { BattleTimerService } from './BattleTimer';
import { BattalionService } from './BattalionService';
import { MovementService } from './MovementService';
import { MovementState } from '../../../mobile/src/types/battleTypes';
import { BattleSetupService } from './BattleSetupService';
import { CombatService } from './CombatService';
import { AttackService } from './AttackService';
import { ScreenDimensionService } from './ScreenDimensionService';



export class BattleService {
  private timerService: BattleTimerService;

  constructor() {
    this.timerService = BattleTimerService.getInstance();
  }

  /**
   * Get timer service instance
   */
  getTimerService(): BattleTimerService {
    return this.timerService;
  }

  /**
   * Trigger initial targeting when countdown ends
   */
  async triggerInitialTargeting(battleId: string): Promise<BattalionTargetingResult[]> {
    const battle = await this.getBattle(battleId);
    if (!battle) {
      console.log('❌ BATTLE NOT FOUND for initial targeting:', battleId);
      return [];
    }

    // Use BattalionService for targeting state management
    return BattalionService.triggerInitialTargeting(battle.battalions, battle.nodes, battleId);
  }

  /**
   * Get current targeting results for a specific battle
   */
  getTargetingResults(battleId?: string): BattalionTargetingResult[] {
    return BattalionService.getTargetingResults(battleId);
  }

  /**
   * Get current movement states for a specific battle
   */
  getMovementStates(battleId: string): Map<string, MovementState> {
    return BattalionService.getMovementStates(battleId);
  }

  /**
   * Store screen dimensions for a battle (delegates to ScreenDimensionService)
   */
  setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    ScreenDimensionService.setBattleScreenDimensions(battleId, width, height);
  }

  /**
   * Get screen dimensions for a battle (delegates to ScreenDimensionService)
   */
  getBattleScreenDimensions(battleId: string): { width: number; height: number } {
    return ScreenDimensionService.getBattleScreenDimensions(battleId);
  }

  /**
   * Start smooth movement updates (separate from timer) at 100ms intervals
   */
  private startMovementUpdates(battleId: string): void {
    BattalionService.startMovementUpdates(battleId);
  }

  /**
   * Stop movement updates for a battle
   */
  private stopMovementUpdates(battleId: string): void {
    BattalionService.stopMovementUpdates(battleId);
  }

  /**
   * Create a new battle with initial setup
   * REUSE: BattleSetupService for battle creation
   */
  async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number): Promise<IBattleDocument> {
    // Use BattleSetupService to create battle
    const savedBattle = await BattleSetupService.createBattle(attackerId, defenderId, screenWidth, screenHeight);
    
    // Store screen dimensions for this battle
    this.setBattleScreenDimensions(savedBattle.battleId, screenWidth, screenHeight);

    // Start server-side timer for this battle
    this.timerService.startTimer(savedBattle.battleId);

    // Set up timer event listeners
    this.timerService.on('countdownUpdate', (data) => {
      if (data.battleId === savedBattle.battleId) {
        this.updateBattleTimer(savedBattle.battleId, data.countdown, data.phase);
      }
    });

    this.timerService.on('phaseChange', (data) => {
      if (data.battleId === savedBattle.battleId) {
        this.updateBattlePhase(savedBattle.battleId, data.phase);
        
        // Start movement updates when battle enters ACTIVE phase
        if (data.phase === BattlePhase.ACTIVE) {
          console.log(`🎮 BATTLE ACTIVE - Starting movement for ${savedBattle.battleId}`);
          this.startMovementUpdates(savedBattle.battleId);
        }
      }
    });

    this.timerService.on('battleEnd', (data) => {
      if (data.battleId === savedBattle.battleId) {
        this.stopMovementUpdates(savedBattle.battleId); // Stop movement before ending battle
        this.endBattle(savedBattle.battleId, NodeOwner.ENEMY); // Default to enemy win on timeout
      }
    });
    

    
    return savedBattle;
  }
  
  /**
   * Get battle by ID
   */
  async getBattle(battleId: string): Promise<IBattleDocument | null> {
    return Battle.findOne({ battleId });
  }
  
  /**
   * End battle and determine winner
   */
  async endBattle(battleId: string, winner: NodeOwner): Promise<IBattleDocument | null> {
    // Stop movement updates first
    this.stopMovementUpdates(battleId);
    
    const battle = await Battle.findOne({ battleId });
    if (!battle) return null;
    
    battle.phase = BattlePhase.COMPLETE;
    battle.winner = winner;
    battle.endTime = new Date();
    
    const updatedBattle = await battle.save();
    
    // Clean up targeting states
    BattalionService.clearTargetingResults(battleId);
    
    // Clean up attack states
    AttackService.clearAllAttacks();
    

    
    return updatedBattle;
  }
  
  /**
   * Get all battles for a user
   */
  async getUserBattles(userId: string): Promise<IBattleDocument[]> {
    return Battle.find({
      $or: [
        { attackerId: userId },
        { defenderId: userId }
      ]
    }).sort({ startTime: -1 });
  }
  
  /**
   * Get active battles
   */
  async getActiveBattles(): Promise<IBattleDocument[]> {
    return Battle.find({
      phase: { $in: [BattlePhase.SETUP, BattlePhase.COUNTDOWN, BattlePhase.ACTIVE] }
    });
  }

  /**
   * Update battle timer state
   */
  private async updateBattleTimer(battleId: string, countdown: number, phase: BattlePhase): Promise<void> {
    const battle = await Battle.findOne({ battleId });
    if (!battle) return;

    battle.countdown = countdown;
    battle.phase = phase;
    await battle.save();
  }

  /**
   * Update battle phase
   */
  private async updateBattlePhase(battleId: string, phase: BattlePhase): Promise<void> {
    const battle = await Battle.findOne({ battleId });
    if (!battle) return;

    battle.phase = phase;
    if (phase === BattlePhase.ACTIVE) {
      battle.countdown = 0;
      battle.battleTime = 0;
    }
    await battle.save();
  }
} 