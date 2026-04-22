import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import {
  SwarmError,
  abortSwarmSession,
  commitSwarmSlot,
  createSwarmSession,
  deploySwarmSession,
  dismissSwarmSlot,
  getSwarmSessionForUser,
} from '../services/SwarmService';

const router = express.Router();

router.get('/mine', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String((req as any).user._id);
    const swarm = await getSwarmSessionForUser(userId);
    res.json({ success: true, data: swarm });
  } catch (e) {
    console.error('GET /api/swarm/mine error:', e);
    res.status(500).json({ success: false, error: 'Failed to load swarm session' });
  }
});

router.post('/create', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const leaderUserId = String((req as any).user._id);
    const { targetUserId, targetX, targetY } = req.body ?? {};
    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({ success: false, error: 'targetUserId is required' });
      return;
    }
    const tx = Number(targetX);
    const ty = Number(targetY);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      res.status(400).json({ success: false, error: 'targetX and targetY are required numbers' });
      return;
    }
    const sessionDoc = await createSwarmSession({
      leaderUserId,
      targetUserId,
      targetX: tx,
      targetY: ty,
    });
    res.json({ success: true, data: sessionDoc });
  } catch (e) {
    if (e instanceof SwarmError) {
      res.status(e.statusCode).json({ success: false, error: e.message });
      return;
    }
    console.error('POST /api/swarm/create error:', e);
    res.status(500).json({ success: false, error: 'Failed to create swarm session' });
  }
});

router.post('/:swarmId/commit', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterUserId = String((req as any).user._id);
    const { slotIndex, botType, quantity, markLevel } = req.body ?? {};
    const sessionDoc = await commitSwarmSlot({
      requesterUserId,
      swarmId: req.params.swarmId,
      slotIndex: Number(slotIndex),
      botType,
      quantity: Number(quantity),
      markLevel: Number(markLevel) >= 2 ? 2 : 1,
    });
    res.json({ success: true, data: sessionDoc });
  } catch (e) {
    if (e instanceof SwarmError) {
      res.status(e.statusCode).json({ success: false, error: e.message });
      return;
    }
    console.error('POST /api/swarm/:swarmId/commit error:', e);
    res.status(500).json({ success: false, error: 'Failed to commit swarm slot' });
  }
});

router.post('/:swarmId/dismiss', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterUserId = String((req as any).user._id);
    const sessionDoc = await dismissSwarmSlot({
      requesterUserId,
      swarmId: req.params.swarmId,
      slotIndex: Number(req.body?.slotIndex),
    });
    res.json({ success: true, data: sessionDoc });
  } catch (e) {
    if (e instanceof SwarmError) {
      res.status(e.statusCode).json({ success: false, error: e.message });
      return;
    }
    console.error('POST /api/swarm/:swarmId/dismiss error:', e);
    res.status(500).json({ success: false, error: 'Failed to dismiss swarm slot' });
  }
});

router.post('/:swarmId/deploy', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterUserId = String((req as any).user._id);
    const sessionDoc = await deploySwarmSession({
      requesterUserId,
      swarmId: req.params.swarmId,
    });
    res.json({ success: true, data: sessionDoc });
  } catch (e) {
    if (e instanceof SwarmError) {
      res.status(e.statusCode).json({ success: false, error: e.message });
      return;
    }
    console.error('POST /api/swarm/:swarmId/deploy error:', e);
    res.status(500).json({ success: false, error: 'Failed to deploy swarm' });
  }
});

router.post('/:swarmId/abort', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const requesterUserId = String((req as any).user._id);
    const sessionDoc = await abortSwarmSession({
      requesterUserId,
      swarmId: req.params.swarmId,
    });
    res.json({ success: true, data: sessionDoc });
  } catch (e) {
    if (e instanceof SwarmError) {
      res.status(e.statusCode).json({ success: false, error: e.message });
      return;
    }
    console.error('POST /api/swarm/:swarmId/abort error:', e);
    res.status(500).json({ success: false, error: 'Failed to abort swarm' });
  }
});

export default router;
