import { Battle, IBattleDocument } from '../models/Battle';
import { BattleEvent } from '../models/BattleEvent';
import { BattlePhase, NodeOwner, BotType, IBattalion, INode } from '../types/battle';
import { BattleTimerService } from './BattleTimer';
import { BATTLE_CONFIG } from '../config/battleConfig';
import { TargetingService, TargetingResult } from './TargetingService';

// Bot stats from battleConfig (single source of truth)
const BOT_CATEGORIES = BATTLE_CONFIG.BOT_STATS;
const ENEMY_BOT_CATEGORIES = BATTLE_CONFIG.ENEMY_BOT_STATS;

export class BattleService {
  private timerService: BattleTimerService;
  private targetingResults: Map<string, TargetingResult[]> = new Map();

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
   * Create a new battle with initial setup
   */
  async createBattle(attackerId: string, defenderId: string): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize nodes with server-calculated positions (moved from client for security)
    // Use standard screen dimensions for positioning (client will scale if needed)
    const STANDARD_WIDTH = 375; // Standard mobile width
    const STANDARD_HEIGHT = 667; // Standard mobile height  
    const positionedNodes = BATTLE_CONFIG.calculateNodePositions(STANDARD_WIDTH, STANDARD_HEIGHT, 125);
    
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
      const maxHealth = stats.health * battalion.quantity;
      
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
      const maxHealth = stats.health * battalion.quantity;
      
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
      return sum + (battalion.stats.health * battalion.quantity);
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
      }
    });

    this.timerService.on('battleEnd', (data) => {
      if (data.battleId === battleId) {
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
    const battle = await Battle.findOne({ battleId });
    if (!battle) return null;
    
    battle.phase = BattlePhase.COMPLETE;
    battle.winner = winner;
    battle.endTime = new Date();
    
    const updatedBattle = await battle.save();
    
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