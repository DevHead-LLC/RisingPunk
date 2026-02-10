import { Router, Request, Response } from 'express';
import { BattleController } from '../controllers/BattleController';
import auth from '../middleware/auth';
import { Battle } from '../models/Battle';
import { UserTaskProgress } from '../models/UserTaskProgress';
import { NPCService } from '../services/NPCService';
import { UserResearchFeature } from '../models/UserResearchFeature';

interface StartBattleRequest extends Request {
  body: {
    userBattalions?: Array<{
      type: 'guardian' | 'breacher' | 'phreak';
      quantity: number;
      nodeIndex: number;
    }>;
    defenderId?: string;
    defenderNpcSlug?: string;
    defenderNpcInstanceId?: string;
    unlockHackRigOnWin?: boolean;
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

const router: Router = Router();
const battleController = new BattleController();

router.post<{}, BattleResponse, StartBattleRequest['body']>(
  '/start',
  auth,
  async (req, res): Promise<void> => {
    try {
      const { userBattalions, defenderId, defenderNpcSlug, defenderNpcInstanceId, screenWidth, screenHeight, unlockHackRigOnWin } = req.body;
      
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

      const now = new Date().getTime();

      if (userBattalions.length > 2) {
        const battalionCFeature = await UserResearchFeature.findOne({
          userId: req.user._id,
          categoryId: 'hack-ability',
          featureId: 'add-battalion-c'
        })
        .select('isUnlocked isResearching researchCompletesAt')
        .lean();

        if (!battalionCFeature) {
          res.status(403).json({
            success: false,
            error: 'Battalion C is locked. Complete the "Add Battalion C" research feature to unlock it.'
          });
          return;
        }

        const researchCompletesAtC = battalionCFeature.researchCompletesAt
          ? new Date(battalionCFeature.researchCompletesAt).getTime()
          : null;
        const remainingC = researchCompletesAtC !== null ? Math.max(0, researchCompletesAtC - now) : null;
        const isActuallyUnlockedC = battalionCFeature.isUnlocked ||
          (battalionCFeature.isResearching && researchCompletesAtC !== null && remainingC === 0);

        if (!isActuallyUnlockedC) {
          res.status(403).json({
            success: false,
            error: 'Battalion C is locked. Complete the "Add Battalion C" research feature to unlock it.'
          });
          return;
        }
      }

      if (userBattalions.length > 3) {
        const battalionDFeature = await UserResearchFeature.findOne({
          userId: req.user._id,
          categoryId: 'hack-ability',
          featureId: 'add-battalion-d'
        })
        .select('isUnlocked isResearching researchCompletesAt')
        .lean();

        if (!battalionDFeature) {
          res.status(403).json({
            success: false,
            error: 'Battalion D is locked. Complete the "Add Battalion D" research feature to unlock it.'
          });
          return;
        }

        const researchCompletesAtD = battalionDFeature.researchCompletesAt
          ? new Date(battalionDFeature.researchCompletesAt).getTime()
          : null;
        const remainingD = researchCompletesAtD !== null ? Math.max(0, researchCompletesAtD - now) : null;
        const isActuallyUnlockedD = battalionDFeature.isUnlocked ||
          (battalionDFeature.isResearching && researchCompletesAtD !== null && remainingD === 0);

        if (!isActuallyUnlockedD) {
          res.status(403).json({
            success: false,
            error: 'Battalion D is locked. Complete the "Add Battalion D" research feature to unlock it.'
          });
          return;
        }
      }

      if (userBattalions.length > 4) {
        const battalionEFeature = await UserResearchFeature.findOne({
          userId: req.user._id,
          categoryId: 'hack-ability',
          featureId: 'add-battalion-e'
        })
        .select('isUnlocked isResearching researchCompletesAt')
        .lean();

        if (!battalionEFeature) {
          res.status(403).json({
            success: false,
            error: 'Battalion E is locked. Complete the "Add Battalion E" research feature to unlock it.'
          });
          return;
        }

        const researchCompletesAtE = battalionEFeature.researchCompletesAt
          ? new Date(battalionEFeature.researchCompletesAt).getTime()
          : null;
        const remainingE = researchCompletesAtE !== null ? Math.max(0, researchCompletesAtE - now) : null;
        const isActuallyUnlockedE = battalionEFeature.isUnlocked ||
          (battalionEFeature.isResearching && researchCompletesAtE !== null && remainingE === 0);

        if (!isActuallyUnlockedE) {
          res.status(403).json({
            success: false,
            error: 'Battalion E is locked. Complete the "Add Battalion E" research feature to unlock it.'
          });
          return;
        }
      }
      
      const battle = await battleController.startBattle(req.user._id, defenderId || 'computer', screenWidth, screenHeight, userBattalions, defenderNpcSlug, unlockHackRigOnWin === true, defenderNpcInstanceId);
      
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