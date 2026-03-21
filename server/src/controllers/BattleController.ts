import { BattleService } from '../services/BattleService';
import { IBattleDocument } from '../models/Battle';
import { BattlePhase, BattleStateResponse } from '../types/battle';
import { calculateNodePositions } from '../services/NodeService';
import { calculateLineProperties, NETWORK_CONNECTIONS } from '../config/networkConfig';
import { BattalionMappingService } from '../services/BattalionMappingService';
import { BattleResponseService } from '../services/BattleResponseService';
import { createNodePositionMap } from '../utils/battleUtils';
import { ScreenDimensionService } from '../services/ScreenDimensionService';
import { BattalionService } from '../services/BattalionService';
import { MovementService } from '../services/MovementService';

export class BattleController {
  private battleService: BattleService;

  constructor() {
    this.battleService = new BattleService();
  }

  /**
   * Generate network data for client (server authority)
   */
  private generateNetworkData(nodes: any[], screenWidth: number, screenHeight: number, battle: IBattleDocument) {
    const dimensionsChanged = ScreenDimensionService.updateScreenDimensionsIfChanged(battle.battleId, screenWidth, screenHeight);
    
    const updatedNodes = nodes.map(node => {
      const baseNode = {
        index: node.index,
        owner: node.owner,
        tugOfWarProgress: node.tugOfWarProgress,
        maxCaptureThreshold: node.maxCaptureThreshold,
      };
      
      if (dimensionsChanged) {
        const repositionedNodes = calculateNodePositions(screenWidth, screenHeight, 125);
        const repositioned = repositionedNodes.find(rn => rn.index === node.index);
        return { ...baseNode, position: repositioned ? repositioned.position : node.position };
      }
      
      return { ...baseNode, position: node.position };
    });
    
    const networkConnections = [...NETWORK_CONNECTIONS];
    const nodePositions = createNodePositionMap(updatedNodes);

    const lineProperties = networkConnections.map(connection => {
      const fromPos = nodePositions[connection.from];
      const toPos = nodePositions[connection.to];
      
      if (!fromPos || !toPos) {
        return { length: 0, angle: 0, left: 0, top: 0 };
      }
      
      return calculateLineProperties(fromPos, toPos);
    });

    return { networkConnections, lineProperties, updatedNodes };
  }

  /**
   * Start a new battle
   */
  async startBattle(
    attackerId: string,
    defenderId: string,
    screenWidth: number,
    screenHeight: number,
    userBattalions?: Array<{ type: string; quantity: number }>,
    defenderNpcSlug?: string,
    unlockHackRigOnWin?: boolean,
    defenderNpcInstanceId?: string,
    hackMapCellX?: number,
    hackMapCellY?: number
  ): Promise<BattleStateResponse> {
    try {
      const actualDefenderId = defenderId === 'computer' ? 'computer-opponent' : defenderId;
      const battle = await this.battleService.createBattle(
        attackerId,
        actualDefenderId,
        screenWidth,
        screenHeight,
        userBattalions,
        defenderNpcSlug,
        unlockHackRigOnWin === true,
        defenderNpcInstanceId,
        hackMapCellX,
        hackMapCellY
      );
      const networkData = this.generateNetworkData(battle.nodes, screenWidth, screenHeight, battle);
      const mappedBattalions = BattalionMappingService.mapBattalionsForClient(battle.battalions);
      
      return await BattleResponseService.createBattleStateResponse(battle, mappedBattalions, networkData);
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
      const battle = await this.battleService.getBattle(battleId);
      if (!battle) return null;

      // Always ensure screen dimensions are set for this battle (only updates if changed)
      ScreenDimensionService.updateScreenDimensionsIfChanged(battleId, screenWidth, screenHeight);

      const timerService = this.battleService.getTimerService();
      const timerState = timerService.getTimeRemaining(battleId);

      const movementStates = MovementService.getMovementStates(battleId);
      const mappedBattalions = BattalionMappingService.mapBattalionsForClient(battle.battalions, movementStates);
      const networkData = this.generateNetworkData(battle.nodes, screenWidth, screenHeight, battle);

      let targetingResults: any[] = [];
      // Use timerState if available, otherwise fall back to battle data
      const currentPhase = timerState?.phase || battle.phase;
      const currentCountdown = timerState?.countdown ?? battle.countdown;
      
      if (currentPhase === BattlePhase.ACTIVE && currentCountdown === 0) {
        if (BattalionService.getTargetingResults(battleId).length === 0) {
          await this.battleService.triggerInitialTargeting(battleId);
          // Immediately start movement for initial targeting
          await MovementService.updateBattleMovement(battleId, battle, BattalionService.getTargetingResults(battleId));
        }
        targetingResults = BattalionService.getTargetingResults(battleId);
      }

      return await BattleResponseService.createBattleStateResponse(
        battle, 
        mappedBattalions, 
        networkData, 
        targetingResults,
        undefined, // retargetingStatus
        movementStates,
        timerState || undefined
      );
    } catch (error) {
      console.error('BattleController getBattleState error:', error);
      throw new Error('Failed to get battle state');
    }
  }
} 