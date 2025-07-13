import express, { Request, Response, Router } from 'express';
import { BattleController } from '../controllers/BattleController';
import battleAuth from '../middleware/battleAuth';

interface StartBattleRequest extends Request {
  body: {
    defenderId: string;
  }
}

interface BattleActionRequest extends Request {
  body: {
    actionType: string;
    data: any;
  }
}

interface BattleResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const router: Router = express.Router();
const battleController = new BattleController();

// Apply auth middleware to all battle routes
router.use(battleAuth);

// Start a new battle
router.post<{}, BattleResponse, StartBattleRequest['body']>(
  '/start',
  async (req, res): Promise<void> => {
    try {
      const { defenderId } = req.body;
      const attackerId = req.user?._id;

      if (!attackerId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const battle = await battleController.startBattle(attackerId, defenderId);
      res.status(201).json({ success: true, data: battle });
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
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const battleState = await battleController.getBattleState(id, userId);
      if (!battleState) {
        res.status(404).json({ success: false, error: 'Battle not found' });
        return;
      }

      res.json({ success: true, data: battleState });
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
      const userId = req.user?._id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

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