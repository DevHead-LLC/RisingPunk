import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { ENABLE_ASYNC_BATTLES } from '../config/env';
import { AttackMarch } from '../models/AttackMarch';
import { MAP_VISIBLE_ATTACK_MARCH_STATES } from '../types/attackMarch';
import {
  normalizeUserBattalionsForBattleStart,
  type NormalizedBattleBattalion,
} from '../utils/normalizeUserBattalionsForBattleStart';
import {
  resolveMarchLaunchTarget,
  MarchTargetValidationError,
  type ResolvedMarchLaunchTarget,
} from '../services/MarchTargetValidationService';
import {
  executeAttackMarchLaunch,
  AttackMarchLaunchError,
} from '../services/AttackMarchLaunchService';
import { scheduleMarchArrival } from '../services/MarchArrivalSchedulerService';
import {
  cancelOutboundAttackMarch,
  AttackMarchCancelError,
} from '../services/AttackMarchCancelService';
import { BugInstance } from '../models/BugInstance';
import { UserHunter } from '../models/UserHunter';
import {
  BUG_TYPE_ANT,
  HUNTER_ROSTER_KAITO_GLITCH,
  HUNTER_VISUAL_KEY_KAITO_GLITCH_SPRINT,
} from '../types/bugHunt';
import { getBugHuntWorldStateSnapshot } from '../services/BugHuntWorldService';

const router = express.Router();

/**
 * GET /api/attack/active — all marches visible on the main HackMap (any authenticated user).
 * Omits `armySnapshot` (large); probe parity: global list like GET /api/probe/active.
 */
router.get('/active', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const marches = await AttackMarch.find({
      state: { $in: MAP_VISIBLE_ATTACK_MARCH_STATES },
    })
      .select('-armySnapshot')
      .sort({ departAt: 1 })
      .lean();

    res.json({ marches });
  } catch (err) {
    console.error('GET /api/attack/active error:', err);
    res.status(500).json({ error: 'Failed to load active marches' });
  }
});

/**
 * GET /api/attack/mine — current user's non-terminal marches (same visibility states as the global map feed).
 * Includes `asyncMarchesEnabled` so the client can branch launch vs live battle without a separate config call.
 */
router.get('/mine', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const attackerId = String(req.user._id);
    const marches = await AttackMarch.find({
      attackerId,
      state: { $in: MAP_VISIBLE_ATTACK_MARCH_STATES },
    })
      .select('-armySnapshot')
      .sort({ departAt: 1 })
      .lean();

    res.json({ marches, asyncMarchesEnabled: ENABLE_ASYNC_BATTLES });
  } catch (err) {
    console.error('GET /api/attack/mine error:', err);
    res.status(500).json({ error: 'Failed to load your attack marches' });
  }
});

/**
 * POST /api/attack/launch — create outbound march, commit bots from assignments + inventory (transaction).
 * Gated by `ENABLE_ASYNC_BATTLES=true`. Client still uses `POST /api/battle/start` when the flag is off.
 */
router.post('/launch', auth, async (req: Request, res: Response): Promise<void> => {
  if (!ENABLE_ASYNC_BATTLES) {
    res.status(403).json({
      success: false,
      error: 'Async attack marches are not enabled (ENABLE_ASYNC_BATTLES).',
    });
    return;
  }

  try {
    const userId = String(req.user._id);
    const {
      userBattalions,
      attackType,
      bugInstanceId,
      hunterRosterId,
      hunterVisualKey,
      defenderId,
      defenderNpcSlug,
      defenderNpcInstanceId,
      screenWidth,
      screenHeight,
      hackMapCellX,
      hackMapCellY,
      originX,
      originY,
    } = req.body ?? {};

    if (!screenWidth || !screenHeight) {
      res.status(400).json({ success: false, error: 'Screen dimensions are required' });
      return;
    }
    const sw = Number(screenWidth);
    const sh = Number(screenHeight);
    if (!Number.isFinite(sw) || !Number.isFinite(sh) || sw <= 0 || sh <= 0) {
      res.status(400).json({ success: false, error: 'Screen dimensions must be positive finite numbers' });
      return;
    }

    const ox = Number(originX);
    const oy = Number(originY);
    const tx = Number(hackMapCellX);
    const ty = Number(hackMapCellY);
    if (!Number.isFinite(ox) || !Number.isFinite(oy)) {
      res.status(400).json({ success: false, error: 'originX and originY are required and must be finite numbers' });
      return;
    }
    if (!Number.isInteger(ox) || !Number.isInteger(oy)) {
      res.status(400).json({ success: false, error: 'originX and originY must be integers (tile coordinates)' });
      return;
    }
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      res.status(400).json({
        success: false,
        error: 'hackMapCellX and hackMapCellY are required and must be finite numbers',
      });
      return;
    }
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) {
      res.status(400).json({
        success: false,
        error: 'hackMapCellX and hackMapCellY must be integers (tile coordinates)',
      });
      return;
    }

    const isBugHunt = attackType === 'bug_hunt';
    let normalizedBattalions: NormalizedBattleBattalion[];
    let target: ResolvedMarchLaunchTarget;

    if (isBugHunt) {
      if (!bugInstanceId || typeof bugInstanceId !== 'string' || bugInstanceId.trim() === '') {
        res.status(400).json({ success: false, error: 'bugInstanceId is required for bug-hunt launch' });
        return;
      }
      if (hunterRosterId !== HUNTER_ROSTER_KAITO_GLITCH) {
        res.status(400).json({
          success: false,
          error: `hunterRosterId must be '${HUNTER_ROSTER_KAITO_GLITCH}' for MVP bug hunts`,
        });
        return;
      }
      if (hunterVisualKey !== HUNTER_VISUAL_KEY_KAITO_GLITCH_SPRINT) {
        res.status(400).json({
          success: false,
          error: `hunterVisualKey must be '${HUNTER_VISUAL_KEY_KAITO_GLITCH_SPRINT}' for MVP bug hunts`,
        });
        return;
      }

      const list = Array.isArray(userBattalions) ? userBattalions : [];
      const hasAnyBattalionQuantity = list.some((b) => Number((b as { quantity?: unknown }).quantity) > 0);
      if (hasAnyBattalionQuantity) {
        res.status(400).json({
          success: false,
          error: 'Bug-hunt launch payload must not include battalion bots (hunters-only march)',
        });
        return;
      }

      const world = getBugHuntWorldStateSnapshot();
      if (world.reseedInProgress) {
        res.status(409).json({ success: false, error: 'Ant world refresh in progress; hunts are temporarily unavailable' });
        return;
      }

      const ownedHunter = await UserHunter.findOne({
        userId,
        hunterRosterId: HUNTER_ROSTER_KAITO_GLITCH,
      }).lean();
      if (!ownedHunter) {
        res.status(403).json({ success: false, error: 'Kaito Glitch must be unlocked before launching a bug hunt' });
        return;
      }

      const bug = await BugInstance.findOne({
        bugInstanceId: bugInstanceId.trim(),
        bugType: BUG_TYPE_ANT,
        lifecycleState: 'alive',
      }).lean();
      if (!bug) {
        res.status(404).json({ success: false, error: 'Bug instance not found or no longer huntable' });
        return;
      }
      if (bug.mapCellX !== tx || bug.mapCellY !== ty) {
        res.status(400).json({
          success: false,
          error: 'Bug location mismatch; refresh the map and try again',
        });
        return;
      }

      normalizedBattalions = [];
      target = {
        attackMarchDefenderId: 'bug',
        bugInstanceId: bug.bugInstanceId,
        hackMapCellX: bug.mapCellX,
        hackMapCellY: bug.mapCellY,
      };
    } else {
      const battalionNorm = await normalizeUserBattalionsForBattleStart(userId, userBattalions);
      if (!battalionNorm.ok) {
        res.status(battalionNorm.status).json({ success: false, error: battalionNorm.error });
        return;
      }
      normalizedBattalions = battalionNorm.normalized;
      target = await resolveMarchLaunchTarget({
        attackerId: userId,
        defenderIdRaw: typeof defenderId === 'string' ? defenderId : undefined,
        defenderNpcSlug: typeof defenderNpcSlug === 'string' ? defenderNpcSlug : undefined,
        defenderNpcInstanceId:
          typeof defenderNpcInstanceId === 'string' ? defenderNpcInstanceId : undefined,
        hackMapCellX: tx,
        hackMapCellY: ty,
      });
    }

    const data = await executeAttackMarchLaunch({
      attackerId: userId,
      normalizedBattalions,
      screenWidth: sw,
      screenHeight: sh,
      originX: ox,
      originY: oy,
      target,
      ...(isBugHunt
        ? {
            attackType: 'bug_hunt' as const,
            bugHuntContract: {
              bugInstanceId: String(bugInstanceId),
              hunterRosterId: HUNTER_ROSTER_KAITO_GLITCH,
              hunterVisualKey: HUNTER_VISUAL_KEY_KAITO_GLITCH_SPRINT,
            },
          }
        : {}),
    });

    scheduleMarchArrival(data.marchId, new Date(data.arriveAt));

    res.json({ success: true, data });
  } catch (e: unknown) {
    if (e instanceof MarchTargetValidationError) {
      res.status(e.statusCode).json({ success: false, error: e.message });
      return;
    }
    if (e instanceof AttackMarchLaunchError) {
      res.status(e.statusCode).json({ success: false, error: e.message });
      return;
    }
    console.error('POST /api/attack/launch error:', e);
    res.status(500).json({ success: false, error: 'Failed to launch attack march' });
  }
});

/**
 * POST /api/attack/:marchId/cancel — body `{ clientNowMs, outboundProgressT }` (same progress 0–1 as map
 * outbound overlay). Outbound only; march → `returning`; restores bots when return completes.
 * Gated by `ENABLE_ASYNC_BATTLES=true`.
 */
router.post('/:marchId/cancel', auth, async (req: Request, res: Response): Promise<void> => {
  if (!ENABLE_ASYNC_BATTLES) {
    res.status(403).json({
      success: false,
      error: 'Async attack marches are not enabled (ENABLE_ASYNC_BATTLES).',
    });
    return;
  }

  try {
    const { clientNowMs, outboundProgressT } = req.body ?? {};
    if (typeof clientNowMs !== 'number' || !Number.isFinite(clientNowMs)) {
      res.status(400).json({
        success: false,
        error: 'clientNowMs is required and must be a finite number (use device Date.now() when cancelling).',
      });
      return;
    }
    if (typeof outboundProgressT !== 'number' || !Number.isFinite(outboundProgressT)) {
      res.status(400).json({
        success: false,
        error:
          'outboundProgressT is required and must be a finite number (0–1 progress along outbound leg, same as map).',
      });
      return;
    }
    await cancelOutboundAttackMarch(String(req.user._id), req.params.marchId, clientNowMs, outboundProgressT);
    res.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof AttackMarchCancelError) {
      res.status(e.statusCode).json({ success: false, error: e.message });
      return;
    }
    console.error('POST /api/attack/:marchId/cancel error:', e);
    res.status(500).json({ success: false, error: 'Failed to cancel march' });
  }
});

export default router;
