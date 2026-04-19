import { Router, Request, Response } from 'express';
import { BattleController } from '../controllers/BattleController';
import auth from '../middleware/auth';
import { Battle } from '../models/Battle';
import { BattleReplay } from '../models/BattleReplay';
import {
  buildAdminIdSet,
  canUserAccessBattleReplay,
} from '../services/BattleReplayLifecycleService';
import { normalizeUserBattalionsForBattleStart } from '../utils/normalizeUserBattalionsForBattleStart';
import { recordNpcAttackProgressForGuidedTasks } from '../services/GuidedTaskNpcAttackService';

interface StartBattleRequest extends Request {
  body: {
    userBattalions?: Array<{
      type: 'guardian' | 'breacher' | 'phreak';
      quantity: number;
      nodeIndex?: number;
      /** Defaults to 1. Requires Mark II research when 2. */
      markLevel?: number;
    }>;
    defenderId?: string;
    defenderNpcSlug?: string;
    defenderNpcInstanceId?: string;
    unlockHackRigOnWin?: boolean;
    screenWidth: number;
    screenHeight: number;
    /** Hack Map grid cell when starting battle from map (optional; must send both or neither). */
    hackMapCellX?: number;
    hackMapCellY?: number;
  }
}

interface BattleResponse {
  success?: boolean;
  data?: any;
  error?: string;
  battleId?: string;
}

const router: Router = Router();
const battleController = new BattleController();

/** Per-user sliding window for large GET /replay payloads. */
const REPLAY_GET_WINDOW_MS = 60_000;
const REPLAY_GET_MAX_PER_WINDOW = 20;
/** Max distinct user keys after expired eviction — bounds per-request scan cost (Bugbot: many concurrent users within window). */
const REPLAY_GET_RATE_MAP_MAX_ENTRIES = 4096;
// Evict expired entries on each check so the Map stays bounded (Bugbot: keys for users who never fetch again are never revisited otherwise).
const replayGetRateByUser = new Map<string, { count: number; windowStartMs: number }>();

function evictExpiredReplayGetRateEntries(now: number): void {
  for (const [key, val] of replayGetRateByUser.entries()) {
    if (now - val.windowStartMs > REPLAY_GET_WINDOW_MS) {
      replayGetRateByUser.delete(key);
    }
  }
}

function trimReplayGetRateMapToMaxEntries(): void {
  const excess = replayGetRateByUser.size - REPLAY_GET_RATE_MAP_MAX_ENTRIES;
  if (excess <= 0) return;
  const entries = [...replayGetRateByUser.entries()].sort(
    (a, b) => a[1].windowStartMs - b[1].windowStartMs
  );
  for (let i = 0; i < excess; i++) {
    replayGetRateByUser.delete(entries[i][0]);
  }
}

function takeReplayGetRateSlot(userId: string): boolean {
  const now = Date.now();
  evictExpiredReplayGetRateEntries(now);
  trimReplayGetRateMapToMaxEntries();
  const entry = replayGetRateByUser.get(userId);
  if (!entry || now - entry.windowStartMs > REPLAY_GET_WINDOW_MS) {
    replayGetRateByUser.set(userId, { count: 1, windowStartMs: now });
    return true;
  }
  if (entry.count >= REPLAY_GET_MAX_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

router.post<{}, BattleResponse, StartBattleRequest['body']>(
  '/start',
  auth,
  async (req, res): Promise<void> => {
    try {
      const {
        userBattalions,
        defenderId,
        defenderNpcSlug,
        defenderNpcInstanceId,
        screenWidth,
        screenHeight,
        unlockHackRigOnWin,
        hackMapCellX,
        hackMapCellY,
      } = req.body;
      
      if (!screenWidth || !screenHeight) {
        res.status(400).json({ success: false, error: 'Screen dimensions are required' });
        return;
      }
      
      let resolvedHackCellX: number | undefined;
      let resolvedHackCellY: number | undefined;
      const hasX = hackMapCellX !== undefined && hackMapCellX !== null;
      const hasY = hackMapCellY !== undefined && hackMapCellY !== null;
      if (hasX && hasY) {
        const x = Number(hackMapCellX);
        const y = Number(hackMapCellY);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          res.status(400).json({
            success: false,
            error: 'hackMapCellX and hackMapCellY must be finite numbers',
          });
          return;
        }
        resolvedHackCellX = x;
        resolvedHackCellY = y;
      } else if (hasX || hasY) {
        res.status(400).json({
          success: false,
          error: 'hackMapCellX and hackMapCellY must be sent together or omitted',
        });
        return;
      }

      const battalionNorm = await normalizeUserBattalionsForBattleStart(String(req.user._id), userBattalions);
      if (!battalionNorm.ok) {
        res.status(battalionNorm.status).json({ success: false, error: battalionNorm.error });
        return;
      }
      const normalizedBattalions = battalionNorm.normalized.map((b) => ({
        type: b.type,
        quantity: b.quantity,
        markLevel: b.markLevel,
      }));

      const battle = await battleController.startBattle(
        req.user._id,
        defenderId || 'computer',
        screenWidth,
        screenHeight,
        normalizedBattalions,
        defenderNpcSlug,
        unlockHackRigOnWin === true,
        defenderNpcInstanceId,
        resolvedHackCellX,
        resolvedHackCellY
      );
      
      try {
        const battleDoc = await Battle.findOne({ battleId: battle.battleId });
        const actualDefenderNpcSlug = (battleDoc as any)?.defenderNpcSlug;
        await recordNpcAttackProgressForGuidedTasks(String(req.user._id), actualDefenderNpcSlug);
      } catch (taskTrackingError) {
        console.error('Error tracking Level 1/5/6 NPC attack for task guide:', taskTrackingError);
      }
      
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

router.get<{ id: string }, BattleResponse>(
  '/:id/replay',
  auth,
  async (req, res): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = String(req.user._id);

      if (!takeReplayGetRateSlot(userId)) {
        res.status(429).json({
          success: false,
          error: 'Too many replay downloads. Try again in a minute.',
        });
        return;
      }

      const replay = await BattleReplay.findOne({ battleId: id }).select('-__v').lean();
      if (!replay) {
        res.status(404).json({ success: false, error: 'Replay not found' });
        return;
      }

      const adminSet = buildAdminIdSet();
      if (!canUserAccessBattleReplay(userId, replay, adminSet)) {
        res.status(403).json({ success: false, error: 'Not authorized to view this replay' });
        return;
      }

      res.json({ success: true, data: replay });
    } catch (error) {
      console.error('Get battle replay error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get battle replay',
      });
    }
  }
);

// Test endpoint to manually trigger battle rewards (for debugging)
router.post('/test-rewards/:battleId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { battleId } = req.params;
    const battle = await Battle.findById(battleId);
    
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }
    
    const { BattleRewardService } = require('../services/BattleRewardService');
    const result = await BattleRewardService.processBattleRewards(battle, battle.attackerId);
    
    res.json({
      success: true,
      result,
      battle: {
        battleId: battle.battleId,
        winner: battle.winner,
        defenderNpcSlug: (battle as any).defenderNpcSlug,
        phase: battle.phase
      }
    });
  } catch (error) {
    console.error('Error testing rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug endpoint to list recent battles
router.get('/debug/recent-battles', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const battles = await Battle.find({ 
      attackerId: req.user._id,
      phase: 'complete'
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

    res.json({
      success: true,
      battles: battles.map((battle: any) => ({
        battleId: battle.battleId,
        winner: battle.winner,
        defenderNpcSlug: (battle as any).defenderNpcSlug,
        defenderNpcInstanceId: (battle as any).defenderNpcInstanceId,
        phase: battle.phase,
        endTime: battle.endTime,
        updatedAt: battle.updatedAt
      }))
    });
  } catch (error) {
    console.error('Debug battles error:', error);
    res.status(500).json({ error: 'Failed to get recent battles' });
  }
});

export default router; 