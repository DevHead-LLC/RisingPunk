import express, { Request, Response, Router } from 'express';
import { BattleController } from '../controllers/BattleController';
import { BATTLE_CONFIG } from '../config/battleConfig';

interface StartBattleRequest extends Request {
  body: {
    userBattalions?: Array<{
      type: 'guardian' | 'breacher' | 'phreak';
      quantity: number;
      nodeIndex: number;
    }>;
    defenderId?: string;
  }
}



interface BattleResponse {
  success?: boolean;
  data?: any;
  error?: string;
  battleId?: string;
}

const router: Router = express.Router();
const battleController = new BattleController();

// Authentication temporarily removed for user vs computer testing

// Start a new battle
router.post<{}, BattleResponse, StartBattleRequest['body']>(
  '/start',
  async (req, res): Promise<void> => {
    try {
      const { userBattalions, defenderId } = req.body;
      // For now, use a default user ID for testing
      const attackerId = 'test-user-id';
      // Use computer opponent if no defenderId provided
      const actualDefenderId = defenderId || 'computer';

      const battle = await battleController.startBattle(attackerId, actualDefenderId);
      res.status(201).json({ battleId: battle.battleId });
    } catch (error) {
      console.error('Start battle error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start battle' 
      });
    }
  }
);

// Get current battle state
router.get<{ id: string }, BattleResponse>(
  '/:id/state',
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      const { screenWidth, screenHeight } = req.query;
      // For now, use a default user ID for testing
      const userId = 'test-user-id';

      // Parse screen dimensions from query params
      const width = screenWidth ? parseInt(screenWidth as string) : BATTLE_CONFIG.STANDARD_SCREEN_WIDTH;
      const height = screenHeight ? parseInt(screenHeight as string) : BATTLE_CONFIG.STANDARD_SCREEN_HEIGHT;

      const battleState = await battleController.getBattleState(id, userId, width, height);
      if (!battleState) {
        res.status(404).json({ success: false, error: 'Battle not found' });
        return;
      }



      // Transform server response to match client expectations
      const clientBattleState = {
        battleId: battleState.battleId,
        phase: battleState.phase === 'countdown' ? 'countdown' : 
               battleState.phase === 'active' ? 'battle' : 
               battleState.phase === 'complete' ? 'victory' : 'setup',
        timeRemaining: battleState.phase === 'countdown' ? battleState.countdown : 
                      battleState.phase === 'active' ? (20 - battleState.battleTime) : 0,
        battalions: battleState.battalions || [],
        nodes: battleState.nodes || [],
        networkConnections: battleState.networkConnections || [], // Add network data
        lineProperties: battleState.lineProperties || [],         // Add line data
        victoryCondition: battleState.winner ? {
          winner: battleState.winner === 'user' ? 'user' : 'enemy',
          reason: 'timeout'
        } : undefined
      };



      res.json({ success: true, data: clientBattleState });
    } catch (error) {
      console.error('Get battle state error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get battle state' 
      });
    }
  }
);











export default router; 