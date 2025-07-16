import { Battle, IBattleDocument } from '../models/Battle';
import { BattleEvent } from '../models/BattleEvent';
import { BattlePhase, NodeOwner, BotType, IBattalion, INode } from '../types/battle';
import { BattleTimerService } from './BattleTimer';

// Bot stats copied from mobile useBots.ts
const BOT_CATEGORIES: Record<BotType, any> = {
  guardian: {
    role: 'Cavalry',
    stats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 8,
      defense: 6,
    },
  },
  breacher: {
    role: 'Infantry',
    stats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 7,
      defense: 8,
    },
  },
  phreak: {
    role: 'Ranged',
    stats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 6,
      defense: 5,
    },
  },
};

// Enemy bot stats (4x higher attack for testing)
const ENEMY_BOT_CATEGORIES: Record<BotType, any> = {
  guardian: {
    role: 'Cavalry',
    stats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 32,
      defense: 6,
    },
  },
  breacher: {
    role: 'Infantry',
    stats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 28,
      defense: 8,
    },
  },
  phreak: {
    role: 'Ranged',
    stats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 24,
      defense: 5,
    },
  },
};

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
   * Create a new battle with initial setup
   */
  async createBattle(attackerId: string, defenderId: string): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize nodes (9 nodes in 3x3 grid)
    const nodes: INode[] = [];
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      
      let owner: NodeOwner = NodeOwner.NEUTRAL;
      let health = 100;
      
      // User nodes (0, 1, 2)
      if (i < 3) {
        owner = NodeOwner.USER;
        health = 100;
      }
      // Enemy nodes (6, 7, 8)
      else if (i >= 6) {
        owner = NodeOwner.ENEMY;
        health = 100;
      }
      // Neutral nodes (3, 4, 5) - set health to 75% of total army strength
      else {
        owner = NodeOwner.NEUTRAL;
        health = 75; // Will be calculated based on total army strength
      }
      
      nodes.push({
        index: i,
        position: {
          x: 100 + col * 200,
          y: 100 + row * 200,
        },
        owner,
        health,
        captureProgress: 0,
      });
    }
    
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
      eventType: 'BATTLE_CREATED',
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
      eventType: 'BATTLE_ENDED',
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