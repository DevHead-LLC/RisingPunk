import express, { Request, Response, Router } from 'express';
import { BattleController } from '../controllers/BattleController';
import auth from '../middleware/auth';

interface StartBattleRequest extends Request {
  body: {
    userBattalions?: Array<{
      type: 'guardian' | 'breacher' | 'phreak';
      quantity: number;
      nodeIndex: number;
    }>;
    defenderId?: string;
    defenderNpcSlug?: string;
    screenWidth: number;
    screenHeight: number;
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

router.post<{}, BattleResponse, StartBattleRequest['body']>(
  '/start',
  auth,
  async (req, res): Promise<void> => {
    try {
      const { userBattalions, defenderId, defenderNpcSlug, screenWidth, screenHeight } = req.body;
      
      if (!screenWidth || !screenHeight) {
        res.status(400).json({ success: false, error: 'Screen dimensions are required' });
        return;
      }
      
      const battle = await battleController.startBattle(req.user._id, defenderId || 'computer', screenWidth, screenHeight, userBattalions, defenderNpcSlug);
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

router.get<{ id: string }, BattleResponse>(
  '/:id/state',
  auth,
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      const { screenWidth, screenHeight } = req.query;

      if (!screenWidth || !screenHeight) {
        res.status(400).json({ success: false, error: 'Screen dimensions are required' });
        return;
      }
      
      const width = parseInt(screenWidth as string);
      const height = parseInt(screenHeight as string);
      
      if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        res.status(400).json({ success: false, error: 'Invalid screen dimensions. Must be positive numbers.' });
        return;
      }

      const battleState = await battleController.getBattleState(id, req.user._id, width, height);
      if (!battleState) {
        res.status(404).json({ success: false, error: 'Battle not found' });
        return;
      }

      const clientBattleState = {
        battleId: battleState.battleId,
        phase: battleState.phase === 'countdown' ? 'countdown' : 
               battleState.phase === 'active' ? 'battle' : 
               battleState.phase === 'complete' ? 'victory' : 'setup',
        timeRemaining: battleState.timeRemaining || 0,
        winner: battleState.winner,
        battalions: battleState.battalions || [],
        nodes: battleState.nodes || [],
        networkConnections: battleState.networkConnections || [],
        lineProperties: battleState.lineProperties || [],
        movementStates: battleState.movementStates || [],
        victoryCondition: battleState.winner ? {
          winner: battleState.winner === 'user' ? 'user' : 'enemy',
          reason: 'timeout'
        } : undefined,
        battleEndData: battleState.battleEndData
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