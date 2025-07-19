import { Request } from 'express';
import { BattleService } from '../services/BattleService';
import { BattleCalculator } from '../services/BattleCalculator';
import { BattleMovement } from '../services/BattleMovement';
import { Battle, IBattleDocument } from '../models/Battle';
import { BattleEvent } from '../models/BattleEvent';
import { BattlePhase, NodeOwner, BattleStateResponse } from '../types/battle';
import { BATTLE_CONFIG } from '../config/battleConfig';

interface AuthenticatedRequest extends Request {
  user: { _id: string };
}

export class BattleController {
  private battleService: BattleService;
  private battleCalculator: BattleCalculator;
  private battleMovement: BattleMovement;

  constructor() {
    this.battleService = new BattleService();
    this.battleCalculator = new BattleCalculator();
    this.battleMovement = new BattleMovement();
  }

  /**
   * Generate network data for client (server authority)
   */
  private generateNetworkData(nodes: any[], screenWidth: number, screenHeight: number) {
    // Recalculate node positions for client's actual screen size
    const repositionedNodes = BATTLE_CONFIG.calculateNodePositions(screenWidth, screenHeight, 125);
    
    // Update the nodes with correct positions for client screen
    const updatedNodes = nodes.map(node => {
      const repositioned = repositionedNodes.find(rn => rn.index === node.index);
      return {
        index: node.index,
        owner: node.owner,
        health: node.health,
        captureProgress: node.captureProgress,
        position: repositioned ? repositioned.position : node.position
      };
    });
    
    // Get network connections from server config (convert readonly to mutable)
    const networkConnections = [...BATTLE_CONFIG.NETWORK_CONNECTIONS];
    
    // Create node position map for line calculations using updated positions
    const nodePositions = updatedNodes.reduce((acc, node) => {
      acc[node.index] = node.position;
      return acc;
    }, {} as Record<number, { x: number; y: number }>);

    // Calculate line properties for each connection using updated positions
    const lineProperties = networkConnections.map(connection => {
      const fromPos = nodePositions[connection.from];
      const toPos = nodePositions[connection.to];
      
      if (!fromPos || !toPos) {
        // Return default properties if positions not found
        return { length: 0, angle: 0, left: 0, top: 0 };
      }
      
      return BATTLE_CONFIG.calculateLineProperties(fromPos, toPos);
    });

    return { networkConnections, lineProperties, updatedNodes };
  }

  /**
   * Start a new battle
   */
  async startBattle(attackerId: string, defenderId: string): Promise<BattleStateResponse> {
    try {
      // Handle computer opponent
      const actualDefenderId = defenderId === 'computer' ? 'computer-opponent' : defenderId;
      
      // Create battle using BattleService
      const battle = await this.battleService.createBattle(attackerId, actualDefenderId);
      
      // Log battle start event
      await this.battleCalculator.logBattleEvent(battle.battleId, 'battle_start', {
        attackerId,
        defenderId: actualDefenderId,
        phase: battle.phase,
        battalionCount: battle.battalions.length,
        nodeCount: battle.nodes.length
      });

      // Generate network data for client
      const networkData = this.generateNetworkData(battle.nodes, 375, 667);

      // Map battalions for client
      const mappedBattalions = battle.battalions.map(b => ({
        id: b.id,
        type: b.type,
        quantity: b.quantity,
        currentHealth: b.currentHealth,
        maxHealth: b.maxHealth,
        nodeIndex: b.position.nodeIndex,
        isUser: b.owner === 'user',
        mark: b.mark,
        targetNode: b.targetNode,
        remainingPath: b.remainingPath,
        finalTarget: b.finalTarget,
        stats: b.stats,
      }));

      // Return battle state for client
      return {
        battleId: battle.battleId,
        phase: battle.phase,
        countdown: battle.countdown,
        battleTime: battle.battleTime,
        winner: battle.winner,
        battalions: mappedBattalions,
        nodes: networkData.updatedNodes,
        networkConnections: networkData.networkConnections,
        lineProperties: networkData.lineProperties,
        lastUpdated: battle.updatedAt
      };
    } catch (error) {
      console.error('BattleController startBattle error:', error);
      throw new Error('Failed to start battle');
    }
  }

  /**
   * Get current battle state
   */
  async getBattleState(battleId: string, userId: string, screenWidth: number = 375, screenHeight: number = 667): Promise<BattleStateResponse | null> {
    try {
      // Get battle from database
      const battle = await this.battleService.getBattle(battleId);
      
      if (!battle) {
        return null;
      }



      // For testing, allow access to any battle (authentication removed)
      // In production, this would verify user is a participant
      // if (battle.attackerId !== userId && battle.defenderId !== userId) {
      //   throw new Error('User not authorized to view this battle');
      // }

      // Get real-time timer values from BattleTimerService
      const timerService = this.battleService.getTimerService();
      const timerState = timerService.getTimeRemaining(battleId);

      // Use real-time timer values if available, otherwise fall back to database values
      const currentPhase = timerState ? timerState.phase : battle.phase;
      const currentCountdown = timerState ? timerState.countdown : battle.countdown;
      const currentBattleTime = timerState ? timerState.battleTime : battle.battleTime;

      // Convert battalion objects to plain objects without using toObject()
      const mappedBattalions = battle.battalions.map(b => {
        // Extract properties manually to avoid Mongoose subdocument issues
        return {
          id: b.id,
          type: b.type,
          quantity: b.quantity,
          currentHealth: b.currentHealth,
          maxHealth: b.maxHealth,
          nodeIndex: b.position.nodeIndex, // Extract nodeIndex from position
          isUser: b.owner === 'user', // Map owner to isUser boolean
          mark: b.mark,
          targetNode: b.targetNode,
          remainingPath: b.remainingPath,
          finalTarget: b.finalTarget,
          stats: b.stats,
          // Include movement data for client
          isMoving: b.remainingPath && b.remainingPath.length > 0,
          movementProgress: b.remainingPath ? (b.remainingPath.length > 0 ? 'moving' : 'idle') : 'idle'
        };
      });

      // Generate network data for client
      const networkData = this.generateNetworkData(battle.nodes, screenWidth, screenHeight);

      // Return battle state for client with movement data
      return {
        battleId: battle.battleId,
        phase: currentPhase,
        countdown: currentCountdown,
        battleTime: currentBattleTime,
        winner: battle.winner,
        battalions: mappedBattalions,
        nodes: networkData.updatedNodes,
        networkConnections: networkData.networkConnections,
        lineProperties: networkData.lineProperties,
        lastUpdated: battle.updatedAt,
        // Include movement timing information for client interpolation
        movementData: {
          updateInterval: 100, // Server updates every 100ms
          lastMovementUpdate: battle.updatedAt
        }
      };
    } catch (error) {
      console.error('BattleController getBattleState error:', error);
      throw new Error('Failed to get battle state');
    }
  }

  /**
   * Submit battle action (future use for movement/attacks)
   */
  async submitAction(battleId: string, userId: string, actionType: string, data: any): Promise<any> {
    try {
      // Get battle from database
      const battle = await this.battleService.getBattle(battleId);
      
      if (!battle) {
        throw new Error('Battle not found');
      }

      // Verify user is a participant
      if (battle.attackerId !== userId && battle.defenderId !== userId) {
        throw new Error('User not authorized to submit actions for this battle');
      }

      // Verify battle is active
      if (battle.phase !== BattlePhase.ACTIVE) {
        throw new Error('Battle is not active');
      }

      // Log the action
      await this.battleCalculator.logBattleEvent(battleId, actionType, {
        userId,
        data,
        timestamp: new Date()
      });

      // For now, just return success - actual action processing will be implemented later
      return { success: true, actionType, timestamp: new Date() };
    } catch (error) {
      console.error('BattleController submitAction error:', error);
      throw new Error('Failed to submit action');
    }
  }

  /**
   * Get battle event log
   */
  async getBattleEvents(battleId: string, userId: string): Promise<any[]> {
    try {
      // Get battle from database
      const battle = await this.battleService.getBattle(battleId);
      
      if (!battle) {
        throw new Error('Battle not found');
      }

      // Verify user is a participant
      if (battle.attackerId !== userId && battle.defenderId !== userId) {
        throw new Error('User not authorized to view this battle');
      }

      // Get events from database
      const events = await BattleEvent.find({ battleId })
        .sort({ timestamp: 1 })
        .limit(100); // Limit to last 100 events

      return events.map(event => ({
        id: event._id,
        eventType: event.eventType,
        timestamp: event.timestamp,
        actorId: event.actorId,
        data: event.data
      }));
    } catch (error) {
      console.error('BattleController getBattleEvents error:', error);
      throw new Error('Failed to get battle events');
    }
  }

  /**
   * Get battalion movement state for debugging
   */
  async getBattalionMovement(battleId: string, userId: string): Promise<any> {
    try {
      // Get battle from database
      const battle = await this.battleService.getBattle(battleId);
      
      if (!battle) {
        throw new Error('Battle not found');
      }

      // Verify user is a participant
      if (battle.attackerId !== userId && battle.defenderId !== userId) {
        throw new Error('User not authorized to view this battle');
      }

      // Return movement data for debugging
      return {
        battleId: battle.battleId,
        battalions: battle.battalions.map(b => ({
          id: b.id,
          position: b.position,
          targetNode: b.targetNode,
          finalTarget: b.finalTarget,
          remainingPath: b.remainingPath,
          isMoving: b.remainingPath && b.remainingPath.length > 0
        })),
        nodes: battle.nodes.map(n => ({
          index: n.index,
          owner: n.owner,
          position: n.position
        }))
      };
    } catch (error) {
      console.error('BattleController getBattalionMovement error:', error);
      throw new Error('Failed to get battalion movement');
    }
  }

  /**
   * Force retarget for testing retargeting logic
   */
  async forceRetarget(battleId: string, userId: string, battalionId: string): Promise<any> {
    try {
      // Get battle from database
      const battle = await this.battleService.getBattle(battleId);
      
      if (!battle) {
        throw new Error('Battle not found');
      }

      // Verify user is a participant
      if (battle.attackerId !== userId && battle.defenderId !== userId) {
        throw new Error('User not authorized to modify this battle');
      }

      // Find the battalion
      const battalion = battle.battalions.find(b => b.id === battalionId);
      if (!battalion) {
        throw new Error('Battalion not found');
      }

      // Force retarget by clearing current target
      battalion.targetNode = undefined;
      battalion.finalTarget = undefined;
      battalion.remainingPath = [];

      // Save battle state
      await battle.save();

      return {
        success: true,
        battalionId,
        message: 'Battalion retargeting forced'
      };
    } catch (error) {
      console.error('BattleController forceRetarget error:', error);
      throw new Error('Failed to force retarget');
    }
  }

  /**
   * Get battle timer state
   */
  async getBattleTimer(battleId: string, userId: string): Promise<any> {
    try {
      // Get battle from database
      const battle = await this.battleService.getBattle(battleId);
      
      if (!battle) {
        throw new Error('Battle not found');
      }

      // Verify user is a participant
      if (battle.attackerId !== userId && battle.defenderId !== userId) {
        throw new Error('User not authorized to view this battle');
      }

      // Get timer state from BattleTimerService
      const timerService = this.battleService.getTimerService();
      const timerState = timerService.getTimeRemaining(battleId);

      if (!timerState) {
        // Timer not active, return current battle state
        return {
          battleId: battle.battleId,
          phase: battle.phase,
          countdown: battle.countdown,
          battleTime: battle.battleTime,
          isActive: false
        };
      }

      return {
        battleId: battle.battleId,
        phase: timerState.phase,
        countdown: timerState.countdown,
        battleTime: timerState.battleTime,
        isActive: timerService.isTimerActive(battleId)
      };
    } catch (error) {
      console.error('BattleController getBattleTimer error:', error);
      throw new Error('Failed to get battle timer');
    }
  }

  /**
   * Force end battle (admin/timeout)
   */
  async endBattle(battleId: string, userId: string): Promise<BattleStateResponse> {
    try {
      // Get battle from database
      const battle = await this.battleService.getBattle(battleId);
      
      if (!battle) {
        throw new Error('Battle not found');
      }

      // Verify user is a participant
      if (battle.attackerId !== userId && battle.defenderId !== userId) {
        throw new Error('User not authorized to end this battle');
      }

      // Check victory conditions
      const winner = this.battleCalculator.checkVictoryConditions(
        battle.battalions,
        battle.nodes,
        battle.battleTime
      );

      // End battle with winner
      const endedBattle = await this.battleService.endBattle(
        battleId, 
        winner === 'attacker' ? NodeOwner.USER : NodeOwner.ENEMY
      );

      if (!endedBattle) {
        throw new Error('Failed to end battle');
      }

      // Log battle end event
      await this.battleCalculator.logBattleEvent(battleId, 'battle_end', {
        winner: endedBattle.winner,
        finalBattleTime: endedBattle.battleTime,
        finalBattalionCount: endedBattle.battalions.length
      });

      // Generate network data for client (use default dimensions for end battle)
      const networkData = this.generateNetworkData(endedBattle.nodes, 375, 667);

      // Map battalions for client
      const mappedBattalions = endedBattle.battalions.map(b => ({
        id: b.id,
        type: b.type,
        quantity: b.quantity,
        currentHealth: b.currentHealth,
        maxHealth: b.maxHealth,
        nodeIndex: b.position.nodeIndex,
        isUser: b.owner === 'user',
        mark: b.mark,
        targetNode: b.targetNode,
        remainingPath: b.remainingPath,
        finalTarget: b.finalTarget,
        stats: b.stats,
      }));

      // Return final battle state
      return {
        battleId: endedBattle.battleId,
        phase: endedBattle.phase,
        countdown: endedBattle.countdown,
        battleTime: endedBattle.battleTime,
        winner: endedBattle.winner,
        battalions: mappedBattalions,
        nodes: networkData.updatedNodes,
        networkConnections: networkData.networkConnections,
        lineProperties: networkData.lineProperties,
        lastUpdated: endedBattle.updatedAt
      };
    } catch (error) {
      console.error('BattleController endBattle error:', error);
      throw new Error('Failed to end battle');
    }
  }


} 