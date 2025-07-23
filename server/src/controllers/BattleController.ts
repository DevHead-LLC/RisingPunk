import { Request } from 'express';
import { BattleService } from '../services/BattleService';
import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, NodeOwner, BattleStateResponse } from '../types/battle';
import { calculateNodePositions } from '../services/NodeService';
import { calculateLineProperties, NETWORK_CONNECTIONS } from '../config/networkConfig';
import { BattalionMappingService } from '../services/BattalionMappingService';
import { BattleResponseService } from '../services/BattleResponseService';
import { createNodePositionMap } from '../utils/battleUtils';
import { ScreenDimensionService } from '../services/ScreenDimensionService';

interface AuthenticatedRequest extends Request {
  user: { _id: string };
}

export class BattleController {
  private battleService: BattleService;

  constructor() {
    this.battleService = new BattleService();
  }

  /**
   * Generate network data for client (server authority)
   */
  private generateNetworkData(nodes: any[], screenWidth: number, screenHeight: number, battle: IBattleDocument) {
    // Use ScreenDimensionService as single source of truth
    const dimensionsChanged = ScreenDimensionService.updateScreenDimensionsIfChanged(battle.battleId, screenWidth, screenHeight);
    
    let updatedNodes;
    
    if (dimensionsChanged) {
      // Recalculate node positions for new screen dimensions
      const repositionedNodes = calculateNodePositions(screenWidth, screenHeight, 125);
      
      // Update the nodes with new positions
      updatedNodes = nodes.map(node => {
        const repositioned = repositionedNodes.find(rn => rn.index === node.index);
        return {
          index: node.index,
          owner: node.owner,
          tugOfWarProgress: node.tugOfWarProgress,
          maxCaptureThreshold: node.maxCaptureThreshold,
          position: repositioned ? repositioned.position : node.position
        };
      });
    } else {
      // Use existing node positions (no recalculation needed)
      updatedNodes = nodes.map(node => ({
        index: node.index,
        owner: node.owner,
        tugOfWarProgress: node.tugOfWarProgress,
        maxCaptureThreshold: node.maxCaptureThreshold,
        position: node.position
      }));
    }
    
    // Get network connections from server config (convert readonly to mutable)
    const networkConnections = [...NETWORK_CONNECTIONS];
    
    // Create node position map for line calculations using updated positions
    const nodePositions = createNodePositionMap(updatedNodes);

    // Calculate line properties for each connection using updated positions
    const lineProperties = networkConnections.map(connection => {
      const fromPos = nodePositions[connection.from];
      const toPos = nodePositions[connection.to];
      
      if (!fromPos || !toPos) {
        // Return default properties if positions not found
        return { length: 0, angle: 0, left: 0, top: 0 };
      }
      
      return calculateLineProperties(fromPos, toPos);
    });

    return { networkConnections, lineProperties, updatedNodes };
  }

  /**
   * Start a new battle
   */
  async startBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number): Promise<BattleStateResponse> {
    try {
      // Handle computer opponent
      const actualDefenderId = defenderId === 'computer' ? 'computer-opponent' : defenderId;
      
      // Use provided screen dimensions (required)
      const width = screenWidth;
      const height = screenHeight;
      
      // Create battle using BattleService
      const battle = await this.battleService.createBattle(attackerId, actualDefenderId, width, height);

      // Generate network data for client
      const networkData = this.generateNetworkData(battle.nodes, width, height, battle);

      // Map battalions for client using focused service
      const mappedBattalions = BattalionMappingService.mapBattalionsForClient(battle.battalions);

      // Return battle state for client using focused service
      return BattleResponseService.createBattleStateResponse(battle, mappedBattalions, networkData);
    } catch (error) {
      console.error('BattleController startBattle error:', error);
      throw new Error('Failed to start battle');
    }
  }

  /**
   * Get current battle state
   */
  async getBattleState(battleId: string, userId: string, screenWidth: number, screenHeight: number): Promise<BattleStateResponse | null> {
    try {
      // Store screen dimensions for this battle (for movement calculations)
      this.battleService.setBattleScreenDimensions(battleId, screenWidth, screenHeight);
      
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

      // Get movement states from BattleService
      const movementStates = this.battleService.getMovementStates(battleId);

      // Map battalions for client using focused service
      const mappedBattalions = BattalionMappingService.mapBattalionsForClient(battle.battalions, movementStates);

      // Generate network data for client
      const networkData = this.generateNetworkData(battle.nodes, screenWidth, screenHeight, battle);

      // Get targeting results if countdown has ended
      let targetingResults: any[] = [];
      if (currentPhase === BattlePhase.ACTIVE && currentCountdown === 0) {
        // Trigger initial targeting if not already done
        if (this.battleService.getTargetingResults(battleId).length === 0) {
          await this.battleService.triggerInitialTargeting(battleId);
        }
        targetingResults = this.battleService.getTargetingResults(battleId);
      }

      // Return battle state for client using focused service
      return BattleResponseService.createBattleStateResponseWithTimer(
        battle, 
        mappedBattalions, 
        networkData, 
        currentPhase, 
        currentCountdown, 
        currentBattleTime, 
        targetingResults,
        movementStates // Add movement data to existing response
      );
    } catch (error) {
      console.error('BattleController getBattleState error:', error);
      throw new Error('Failed to get battle state');
    }
  }








} 