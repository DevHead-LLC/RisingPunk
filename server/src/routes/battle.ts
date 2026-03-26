import { Router, Request, Response } from 'express';
import { BattleController } from '../controllers/BattleController';
import auth from '../middleware/auth';
import { Battle } from '../models/Battle';
import { UserTaskProgress } from '../models/UserTaskProgress';
import { NPCService } from '../services/NPCService';
import { isBattalionSlotUnlocked } from '../utils/researchFeatureUtils';
import { userHasMark2BotsUnlocked } from '../utils/userHasMark2BotsUnlocked';

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
      
      if (!userBattalions || userBattalions.length === 0) {
        res.status(400).json({ success: false, error: 'userBattalions is required and must contain at least one battalion' });
        return;
      }
      
      const hasValidBattalion = userBattalions.some(battalion => battalion.quantity && battalion.quantity > 0);
      if (!hasValidBattalion) {
        res.status(400).json({ success: false, error: 'userBattalions must contain at least one battalion with quantity > 0' });
        return;
      }
      
      const MAX_USER_BATTALIONS = 6;
      if (userBattalions.length > MAX_USER_BATTALIONS) {
        res.status(400).json({ success: false, error: `Maximum ${MAX_USER_BATTALIONS} battalions allowed` });
        return;
      }

      if (userBattalions.length > 2) {
        const unlockedC = await isBattalionSlotUnlocked(String(req.user._id), 'C');
        if (!unlockedC) {
          res.status(403).json({
            success: false,
            error: 'Battalion C is locked. Complete the "Add Battalion C" research feature to unlock it.'
          });
          return;
        }
      }

      if (userBattalions.length > 3) {
        const unlockedD = await isBattalionSlotUnlocked(String(req.user._id), 'D');
        if (!unlockedD) {
          res.status(403).json({
            success: false,
            error: 'Battalion D is locked. Complete the "Add Battalion D" research feature to unlock it.'
          });
          return;
        }
      }

      if (userBattalions.length > 4) {
        const unlockedE = await isBattalionSlotUnlocked(String(req.user._id), 'E');
        if (!unlockedE) {
          res.status(403).json({
            success: false,
            error: 'Battalion E is locked. Complete the "Add Battalion E" research feature to unlock it.'
          });
          return;
        }
      }

      if (userBattalions.length > 5) {
        const unlockedF = await isBattalionSlotUnlocked(String(req.user._id), 'F');
        if (!unlockedF) {
          res.status(403).json({
            success: false,
            error: 'Battalion F is locked. Complete the "Add Battalion F" research feature to unlock it.'
          });
          return;
        }
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

      const normalizedBattalions: Array<{ type: 'breacher' | 'guardian' | 'phreak'; quantity: number; markLevel: number }> = [];
      for (const b of userBattalions) {
        if (!b || typeof b !== 'object') {
          res.status(400).json({ success: false, error: 'Invalid userBattalions entry.' });
          return;
        }
        const t = b.type;
        if (t !== 'breacher' && t !== 'guardian' && t !== 'phreak') {
          res.status(400).json({ success: false, error: 'Each battalion type must be breacher, guardian, or phreak.' });
          return;
        }
        if (typeof b.quantity !== 'number' || !Number.isInteger(b.quantity) || b.quantity <= 0) {
          continue;
        }
        const rawMl = (b as { markLevel?: unknown }).markLevel;
        let markLevel: 1 | 2;
        if (rawMl === undefined || rawMl === null) {
          markLevel = 1;
        } else {
          const v = typeof rawMl === 'string' ? Number(rawMl.trim()) : rawMl;
          if (v !== 1 && v !== 2) {
            res.status(400).json({ success: false, error: 'markLevel must be 1 or 2.' });
            return;
          }
          markLevel = v;
        }
        if (markLevel === 2) {
          const unlocked = await userHasMark2BotsUnlocked(req.user._id);
          if (!unlocked) {
            res.status(403).json({
              success: false,
              error: 'Complete Mark 2 Bots research in Hack Ability to deploy Mark II units in battle.',
            });
            return;
          }
        }
        normalizedBattalions.push({ type: t, quantity: b.quantity, markLevel });
      }

      if (normalizedBattalions.length === 0) {
        res.status(400).json({ success: false, error: 'userBattalions must contain at least one battalion with quantity > 0' });
        return;
      }

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
        
        if (actualDefenderNpcSlug) {
          const npc = await NPCService.getNPCBySlug(actualDefenderNpcSlug);
          if (npc && npc.userLevelAssociation === 1) {
            const existingProgress = await UserTaskProgress.findOne({ userId: req.user._id });
            const wasAlreadyAttacked = existingProgress?.attackedLevel1NpcAt;
            
            if (!wasAlreadyAttacked) {
              await UserTaskProgress.findOneAndUpdate(
                { userId: req.user._id },
                {
                  $set: { attackedLevel1NpcAt: new Date() },
                  $setOnInsert: {
                    completedTasks: [],
                    collectedTasks: [],
                    skippedTasks: [],
                    showTaskGuide: true
                  }
                },
                { upsert: true, new: true }
              );
            }
          }
          // Display level 5 (shown on hack map tile) = userLevelAssociation 20 (see map.ts getDisplayLevel)
          if (npc && npc.userLevelAssociation === 20) {
            const existingProgress = await UserTaskProgress.findOne({ userId: req.user._id });
            const wasAlreadyAttacked = existingProgress?.attackedLevel5NpcAt;
            
            if (!wasAlreadyAttacked) {
              await UserTaskProgress.findOneAndUpdate(
                { userId: req.user._id },
                {
                  $set: { attackedLevel5NpcAt: new Date() },
                  $setOnInsert: {
                    completedTasks: [],
                    collectedTasks: [],
                    skippedTasks: [],
                    showTaskGuide: true
                  }
                },
                { upsert: true, new: true }
              );
            }
          }
          // Display level 6 (shown on hack map tile) = userLevelAssociation 25 (see map.ts getDisplayLevel)
          if (npc && npc.userLevelAssociation === 25) {
            const existingProgress = await UserTaskProgress.findOne({ userId: req.user._id });
            const wasAlreadyAttacked = existingProgress?.attackedLevel6NpcAt;
            
            if (!wasAlreadyAttacked) {
              await UserTaskProgress.findOneAndUpdate(
                { userId: req.user._id },
                {
                  $set: { attackedLevel6NpcAt: new Date() },
                  $setOnInsert: {
                    completedTasks: [],
                    collectedTasks: [],
                    skippedTasks: [],
                    showTaskGuide: true
                  }
                },
                { upsert: true, new: true }
              );
            }
          }
        }
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