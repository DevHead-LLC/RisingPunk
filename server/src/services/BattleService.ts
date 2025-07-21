import { Battle, IBattleDocument } from '../models/Battle';
import { BattleEvent } from '../models/BattleEvent';
import { BattlePhase, NodeOwner, BotType, IBattalion, INode } from '../types/battle';
import { BattleTimerService } from './BattleTimer';
import { BATTLE_CONFIG } from '../config/battleConfig';
import { TargetingService, TargetingResult } from './TargetingService';
import { MovementService } from './MovementService';
import { MovementState } from '../../../mobile/src/types/battleTypes';
import { calculateBattalionHealth } from '../utils/battleUtils';

// Bot stats from battleConfig (single source of truth)
const BOT_CATEGORIES = BATTLE_CONFIG.BOT_STATS;
const ENEMY_BOT_CATEGORIES = BATTLE_CONFIG.ENEMY_BOT_STATS;

export class BattleService {
  private timerService: BattleTimerService;
  private targetingResults: Map<string, TargetingResult[]> = new Map();
  private movementStates: Map<string, Map<string, MovementState>> = new Map(); // battleId -> battalionId -> MovementState
  private movementIntervals: Map<string, NodeJS.Timeout> = new Map(); // battleId -> movement interval
  private battleScreenDimensions: Map<string, { width: number; height: number }> = new Map(); // battleId -> screen dimensions

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
  async triggerInitialTargeting(battleId: string): Promise<TargetingResult[]> {
    const battle = await this.getBattle(battleId);
    if (!battle) {
      console.log('❌ BATTLE NOT FOUND for initial targeting:', battleId);
      return [];
    }

    console.log('🎯 TRIGGERING INITIAL TARGETING for battle:', battleId);
    
    // Assign initial targets to all battalions
    const results = TargetingService.assignInitialTargets(battle.battalions, battle.nodes);
    this.targetingResults.set(battleId, results);
    
    return results;
  }

  /**
   * Get current targeting results for a specific battle
   */
  getTargetingResults(battleId?: string): TargetingResult[] {
    if (!battleId) {
      return [];
    }
    return this.targetingResults.get(battleId) || [];
  }

  /**
   * Get current movement states for a specific battle
   */
  getMovementStates(battleId: string): Map<string, MovementState> {
    return this.movementStates.get(battleId) || new Map();
  }

  /**
   * Store screen dimensions for a battle (called when client requests battle state)
   */
  setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    this.battleScreenDimensions.set(battleId, { width, height });
  }

  /**
   * Get screen dimensions for a battle (for movement calculations)
   */
  getBattleScreenDimensions(battleId: string): { width: number; height: number } {
    return this.battleScreenDimensions.get(battleId) || { 
      width: BATTLE_CONFIG.STANDARD_SCREEN_WIDTH, 
      height: BATTLE_CONFIG.STANDARD_SCREEN_HEIGHT 
    };
  }

  /**
   * Start smooth movement updates (separate from timer) at 100ms intervals
   */
  private startMovementUpdates(battleId: string): void {
    // Don't start if already running
    if (this.movementIntervals.has(battleId)) {
      return;
    }

    console.log(`🏃 STARTING MOVEMENT UPDATES for battle ${battleId} (100ms intervals)`);

    const movementInterval = setInterval(async () => {
      await this.updateBattleMovement(battleId);
    }, 100); // 100ms for smooth movement

    this.movementIntervals.set(battleId, movementInterval);
  }

  /**
   * Stop movement updates for a battle
   */
  private stopMovementUpdates(battleId: string): void {
    const interval = this.movementIntervals.get(battleId);
    if (interval) {
      clearInterval(interval);
      this.movementIntervals.delete(battleId);
      console.log(`⏹️ STOPPED MOVEMENT UPDATES for battle ${battleId}`);
    }
    
    // Clean up screen dimensions and movement states for this battle
    this.battleScreenDimensions.delete(battleId);
    this.movementStates.delete(battleId);
  }

  /**
   * Update battle movement for all battalions (called every 100ms)
   */
  private async updateBattleMovement(battleId: string): Promise<void> {
    const battle = await this.getBattle(battleId);
    if (!battle) return;

    // Get targeting results from existing getTargetingResults() method
    const targetingResults = this.getTargetingResults(battleId);
    if (targetingResults.length === 0) return;

    // Ensure movement states map exists for this battle
    if (!this.movementStates.has(battleId)) {
      this.movementStates.set(battleId, new Map());
    }
    
    const battleMovementStates = this.movementStates.get(battleId)!;
    let activeMovements = 0;
    
    // For each battalion with valid target, call MovementService.initiateMovement()
    for (const targetResult of targetingResults) {
      const battalion = battle.battalions.find(b => b.id === targetResult.battalionId);
      if (!battalion || targetResult.targetNode === -1) continue;

      // Check if movement already exists for this battalion
      let movementState = battleMovementStates.get(battalion.id);
      
      if (!movementState) {
        // Get actual client screen dimensions for this battle
        const screenDimensions = this.getBattleScreenDimensions(battleId);
        
        // Initiate new movement using actual client screen dimensions
        movementState = MovementService.initiateMovement(
          battalion,
          targetResult.targetNode,
          screenDimensions.width,  // ✅ Use actual client screen dimensions
          screenDimensions.height  // ✅ Use actual client screen dimensions
        );
        battleMovementStates.set(battalion.id, movementState);
        
        // Movement initiated successfully
      } else if (movementState.movementStatus === 'moving') {
        // Check if movement is complete using MovementService.updateMovementProgress()
        const updatedMovementState = MovementService.updateMovementProgress(
          movementState,
          100, // 100ms deltaTime (unused in new time-based approach)
          battalion.stats.speed,
          0, // screenWidth (unused)
          0  // screenHeight (unused)
        );
        battleMovementStates.set(battalion.id, updatedMovementState);
        
        // Log movement status changes
        if (updatedMovementState.movementStatus === 'arrived') {
          console.log(`✅ ${battalion.owner} ${battalion.type} ARRIVED at node ${updatedMovementState.targetPosition.nodeIndex}`);
        }
      }
      
      if (movementState?.movementStatus === 'moving') {
        activeMovements++;
      }
    }
    
    // Log active movements periodically
    if (activeMovements > 0 && Date.now() % 2000 < 100) { // Every ~2 seconds
      console.log(`📊 ACTIVE MOVEMENTS: ${activeMovements} battalions moving`);
    }
  }

  /**
   * Create a new battle with initial setup
   */
  async createBattle(attackerId: string, defenderId: string): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize nodes with server-calculated positions (moved from client for security)
    // Use standard screen dimensions for positioning (client will scale if needed)
    const positionedNodes = BATTLE_CONFIG.calculateNodePositions(
      BATTLE_CONFIG.STANDARD_SCREEN_WIDTH, 
      BATTLE_CONFIG.STANDARD_SCREEN_HEIGHT, 
      125
    );
    
    const nodes: INode[] = positionedNodes.map((nodeTemplate) => {
      let health = 100;
      
      // Neutral nodes (3, 4, 5) - temporary health, will be updated below
      if (nodeTemplate.owner === 'neutral') {
        health = 75; // Temporary value, will be updated below
      }
      
      return {
        index: nodeTemplate.index,
        position: nodeTemplate.position, // Server-calculated position
        owner: nodeTemplate.owner === 'user' ? NodeOwner.USER : 
               nodeTemplate.owner === 'enemy' ? NodeOwner.ENEMY : NodeOwner.NEUTRAL,
        health,
        captureProgress: 0,
      };
    });
    
    // Initialize battalions
    const battalions: IBattalion[] = [];
    
    // User battalions on nodes 0, 1, 2
    const userBattalions = [
      { type: 'guardian' as BotType, quantity: 10, nodeIndex: 0 },
      { type: 'breacher' as BotType, quantity: 8, nodeIndex: 1 },
      { type: 'phreak' as BotType, quantity: 6, nodeIndex: 2 },
    ];
    
    userBattalions.forEach((battalion, index) => {
      const stats = BOT_CATEGORIES[battalion.type].stats;
      const maxHealth = calculateBattalionHealth(stats.health, battalion.quantity);
      
      battalions.push({
        id: `user-battalion-${index}`,
        type: battalion.type,
        quantity: battalion.quantity,
        currentHealth: maxHealth,
        maxHealth,
        position: {
          x: nodes[battalion.nodeIndex].position.x,
          y: nodes[battalion.nodeIndex].position.y,
          nodeIndex: battalion.nodeIndex,
        },
        owner: NodeOwner.USER,
        stats,
        mark: 1,
      });
    });
    
    // Enemy battalions on nodes 6, 7, 8
    const enemyBattalions = [
      { type: 'guardian' as BotType, quantity: 8, nodeIndex: 6 },
      { type: 'breacher' as BotType, quantity: 10, nodeIndex: 7 },
      { type: 'phreak' as BotType, quantity: 7, nodeIndex: 8 },
    ];
    
    enemyBattalions.forEach((battalion, index) => {
      const stats = ENEMY_BOT_CATEGORIES[battalion.type].stats;
      const maxHealth = calculateBattalionHealth(stats.health, battalion.quantity);
      
      battalions.push({
        id: `enemy-battalion-${index}`,
        type: battalion.type,
        quantity: battalion.quantity,
        currentHealth: maxHealth,
        maxHealth,
        position: {
          x: nodes[battalion.nodeIndex].position.x,
          y: nodes[battalion.nodeIndex].position.y,
          nodeIndex: battalion.nodeIndex,
        },
        owner: NodeOwner.ENEMY,
        stats,
        mark: 1,
      });
    });
    
    // Calculate neutral node health based on total army strength
    const totalArmyStrength = battalions.reduce((sum, battalion) => {
      return sum + calculateBattalionHealth(battalion.stats.health, battalion.quantity);
    }, 0);
    
    const neutralNodeHealth = Math.floor(totalArmyStrength * 0.75);
    nodes[3].health = neutralNodeHealth;
    nodes[4].health = neutralNodeHealth;
    nodes[5].health = neutralNodeHealth;
    
    // Create battle with proper phase setup
    const battle = new Battle({
      battleId,
      attackerId,
      defenderId,
      phase: BattlePhase.COUNTDOWN, // Start in countdown phase
      countdown: 3, // 3-second countdown as per intentions
      battleTime: 0,
      battalions,
      nodes,
      winner: null,
      startTime: new Date(),
      endTime: null,
    });

    // Save battle to database
    const savedBattle = await battle.save();

    // Start server-side timer for this battle
    this.timerService.startTimer(battleId);

    // Set up timer event listeners
    this.timerService.on('countdownUpdate', (data) => {
      if (data.battleId === battleId) {
        this.updateBattleTimer(battleId, data.countdown, data.phase);
      }
    });

    this.timerService.on('phaseChange', (data) => {
      if (data.battleId === battleId) {
        this.updateBattlePhase(battleId, data.phase);
        
        // Start movement updates when battle enters ACTIVE phase
        if (data.phase === BattlePhase.ACTIVE) {
          console.log(`🎮 BATTLE ACTIVE - Starting movement for ${battleId}`);
          this.startMovementUpdates(battleId);
        }
      }
    });

    this.timerService.on('battleEnd', (data) => {
      if (data.battleId === battleId) {
        this.stopMovementUpdates(battleId); // Stop movement before ending battle
        this.endBattle(battleId, NodeOwner.ENEMY); // Default to enemy win on timeout
      }
    });
    
    // Log battle creation event
    await new BattleEvent({
      battleId,
      timestamp: new Date(),
      eventType: 'battle_start',
      data: {
        attackerId,
        defenderId,
        battalionCount: battalions.length,
        nodeCount: nodes.length,
      },
    }).save();
    
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
    
    // Clean up movement states
    this.movementStates.delete(battleId);
    
    // Log battle end event
    await new BattleEvent({
      battleId,
      timestamp: new Date(),
      eventType: 'battle_end',
      data: { winner },
    }).save();
    
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