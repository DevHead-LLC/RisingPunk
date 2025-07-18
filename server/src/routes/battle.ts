import express, { Request, Response, Router } from 'express';
import { BattleController } from '../controllers/BattleController';

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

interface BattleActionRequest extends Request {
  body: {
    actionType: string;
    data: any;
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
      // For now, use a default user ID for testing
      const userId = 'test-user-id';

      const battleState = await battleController.getBattleState(id, userId);
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
        battalions: (battleState.battalions || []).map(battalion => ({
          id: battalion.id,
          type: battalion.type,
          quantity: battalion.quantity,
          currentHealth: battalion.currentHealth,
          maxHealth: battalion.maxHealth,
          nodeIndex: battalion.position?.nodeIndex ?? 0,
          isUser: battalion.owner === 'user',
          stats: battalion.stats,
          targetNode: battalion.targetNode,
          mark: battalion.mark,
          remainingPath: battalion.remainingPath,
          finalTarget: battalion.finalTarget,
        })),
        nodes: battleState.nodes || [],
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

// Submit battle action (future use)
router.post<{ id: string }, BattleResponse, BattleActionRequest['body']>(
  '/:id/action',
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      const { actionType, data } = req.body;
      // For now, use a default user ID for testing
      const userId = 'test-user-id';

      const result = await battleController.submitAction(id, userId, actionType, data);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Submit action error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit action' 
      });
    }
  }
);

// Get battle event log
router.get<{ id: string }, BattleResponse>(
  '/:id/events',
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const events = await battleController.getBattleEvents(id, userId);
      res.json({ success: true, data: events });
    } catch (error) {
      console.error('Get battle events error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get battle events' 
      });
    }
  }
);

// Get battalion movement state for debugging
router.get<{ id: string }, BattleResponse>(
  '/:id/movement',
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const movementData = await battleController.getBattalionMovement(id, userId);
      res.json({ success: true, data: movementData });
    } catch (error) {
      console.error('Get battalion movement error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get battalion movement' 
      });
    }
  }
);

// Force retarget for testing retargeting logic
router.post<{ id: string; battalionId: string }, BattleResponse>(
  '/:id/retarget/:battalionId',
  async (req, res): Promise<void> => {
    try {
      const { id, battalionId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = await battleController.forceRetarget(id, userId, battalionId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Force retarget error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to force retarget' 
      });
    }
  }
);

// Get battle timer state
router.get<{ id: string }, BattleResponse>(
  '/:id/timer',
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      // For now, use a default user ID for testing
      const userId = 'test-user-id';

      const timerState = await battleController.getBattleTimer(id, userId);
      res.json({ success: true, data: timerState });
    } catch (error) {
      console.error('Get battle timer error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get battle timer' 
      });
    }
  }
);

// Force end battle (admin/timeout)
router.post<{ id: string }, BattleResponse>(
  '/:id/end',
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = await battleController.endBattle(id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('End battle error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to end battle' 
      });
    }
  }
);

export default router; 