import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth';
import { BugInstance } from '../models/BugInstance';
import { UserHunter } from '../models/UserHunter';
import { User } from '../models/User';
import { UserBugHuntState } from '../models/UserBugHuntState';
import { UserResearchFeature } from '../models/UserResearchFeature';
import { AttackMarch } from '../models/AttackMarch';
import { HunterProgressionService } from '../services/HunterProgressionService';
import { getBugHuntWorldStateSnapshot } from '../services/BugHuntWorldService';
import { publishBugHpUpdate, subscribeBugHpUpdates } from '../services/BugHuntPushService';
import {
  ANT_WORLD_CAP,
  BUG_TYPE_ANT,
  HUNTER_ROSTER_KAITO_GLITCH,
  MAX_HUNTER_LEVEL,
  type BugLifecycleState,
  type BugType,
  type HunterRosterId,
} from '../types/bugHunt';
import { BUG_HUNT_STORAGE_ITEM_DEFINITIONS } from '../constants/bugHuntStorageItems';
import { JWT_SECRET } from '../config/env';
import {
  resolveEffectiveBugHuntTokenConfig,
} from '../services/BugHuntTokenService';
import { getBugHuntTelemetrySummary, recordBugHuntStorageItemConsumed } from '../services/BugHuntTelemetryService';
import { getBugHuntOperationalChecks } from '../services/BugHuntOperationalChecksService';
import { buildMillisecondsPerUnit, getBuildQueueFamily, getInventoryKey } from '../utils/botInventoryKeys';
import { scheduleMarchArrival, scheduleReturnMarchComplete } from '../services/MarchArrivalSchedulerService';
import { reduceProbeTravelTime } from './probe';
import { buildUndergroundExchangePacks, resolvePackById } from '../services/UndergroundExchangePackService';

const Bot = require('../models/Bot');

const router = express.Router();
const KAITO_UNLOCK_SOFT_CURRENCY_COST = 250_000;
const KAITO_UNLOCK_MIN_USER_LEVEL = 5;
const STORAGE_DEFINITION_BY_KEY = new Map(
  BUG_HUNT_STORAGE_ITEM_DEFINITIONS.map((def) => [def.itemKey, def])
);
const EXCHANGE_CATALOG_ITEMS = BUG_HUNT_STORAGE_ITEM_DEFINITIONS.filter((def) =>
  Number.isFinite(def.shopPrice) && Number(def.shopPrice) > 0
);
const EXCHANGE_CATALOG_BY_KEY = new Map(EXCHANGE_CATALOG_ITEMS.map((def) => [def.itemKey, def]));

function requireExchangeCatalogItem(itemKey: string) {
  const def = EXCHANGE_CATALOG_BY_KEY.get(itemKey);
  if (!def) {
    throw new Error(`Unknown Underground Exchange item '${itemKey}'`);
  }
  if (!Number.isFinite(def.shopPrice) || (def.shopPrice ?? 0) <= 0) {
    throw new Error(`Underground Exchange item '${itemKey}' is missing a valid shop price`);
  }
  return def;
}

function asBugType(value: unknown): BugType {
  if (value !== BUG_TYPE_ANT) {
    throw new Error(`bugType must be '${BUG_TYPE_ANT}'`);
  }
  return value;
}

function asHunterRosterId(value: unknown): HunterRosterId {
  if (value !== HUNTER_ROSTER_KAITO_GLITCH) {
    throw new Error(`hunterRosterId must be '${HUNTER_ROSTER_KAITO_GLITCH}'`);
  }
  return value;
}

function toHpPercent(currentHp: number, maxHp: number): number {
  if (!Number.isFinite(maxHp) || maxHp <= 0) {
    throw new Error('maxHp must be a positive finite number');
  }
  if (!Number.isFinite(currentHp) || currentHp < 0 || currentHp > maxHp) {
    throw new Error('currentHp must be finite and within [0, maxHp]');
  }
  return Math.round((currentHp / maxHp) * 10000) / 100;
}

function requireStorageDefinition(itemKey: string) {
  const def = STORAGE_DEFINITION_BY_KEY.get(itemKey);
  if (!def) {
    throw new Error(`Unknown bug-hunt storage item '${itemKey}'`);
  }
  return def;
}

async function getOrCreateUserBugHuntState(params: {
  userId: string;
  session: mongoose.ClientSession;
}) {
  const existing = await UserBugHuntState.findOne({ userId: params.userId }).session(params.session);
  if (existing) {
    if (!Array.isArray(existing.storageItems)) {
      existing.storageItems = [];
    }
    return existing;
  }
  const effectiveTokenConfig = await resolveEffectiveBugHuntTokenConfig({
    userId: params.userId,
    session: params.session,
  });
  const created = await UserBugHuntState.create(
    [
      {
        userId: params.userId,
        currentTokens: effectiveTokenConfig.maxTokens,
        maxTokens: effectiveTokenConfig.maxTokens,
        regenPerMinute: effectiveTokenConfig.regenPerMinute,
        lastRegenAt: new Date(),
        storageItems: [],
      },
    ],
    { session: params.session }
  );
  const state = created[0];
  if (!state) {
    throw new Error('Failed to initialize user bug-hunt state');
  }
  return state;
}

function applySpeedupDate(originalDate: Date, durationSeconds: number): Date {
  const nowMs = Date.now();
  const reducedMs = originalDate.getTime() - durationSeconds * 1000;
  return new Date(Math.max(nowMs, reducedMs));
}

function resolveRegeneratedTokenSnapshotFromState(params: {
  currentTokensRaw: unknown;
  maxTokensRaw: unknown;
  regenPerMinuteRaw: unknown;
  lastRegenAt: Date | null | undefined;
  syncedMaxTokens: number;
  syncedRegenPerMinute: number;
  now: Date;
}): {
  currentTokens: number;
  maxTokens: number;
  regenPerMinute: number;
  lastRegenAt: Date;
} {
  const currentTokensPersisted = Math.max(0, Math.floor(Number(params.currentTokensRaw ?? 0)));
  const maxTokensPersisted = Math.max(1, Math.floor(Number(params.maxTokensRaw ?? 0)));
  const regenPerMinutePersisted = Math.max(0, Math.floor(Number(params.regenPerMinuteRaw ?? 0)));
  const nowMs = params.now.getTime();
  const lastMs = params.lastRegenAt instanceof Date ? params.lastRegenAt.getTime() : NaN;

  if (!Number.isFinite(lastMs) || lastMs <= 0) {
    throw new Error('Bug-hunt token state has invalid lastRegenAt');
  }

  let regeneratedTokens = currentTokensPersisted;
  let regeneratedLastRegenAt = new Date(lastMs);
  if (nowMs > lastMs) {
    const elapsedMinutes = Math.floor((nowMs - lastMs) / 60_000);
    if (elapsedMinutes > 0) {
      const regained = elapsedMinutes * regenPerMinutePersisted;
      regeneratedTokens = Math.min(maxTokensPersisted, currentTokensPersisted + regained);
      regeneratedLastRegenAt =
        regeneratedTokens >= maxTokensPersisted ? params.now : new Date(lastMs + elapsedMinutes * 60_000);
    }
  }

  const syncedMaxTokens = Math.max(1, Math.floor(params.syncedMaxTokens));
  const syncedRegenPerMinute = Math.max(0, Math.floor(params.syncedRegenPerMinute));
  const syncedCurrentTokens = Math.min(syncedMaxTokens, Math.max(0, Math.floor(regeneratedTokens)));

  return {
    currentTokens: syncedCurrentTokens,
    maxTokens: syncedMaxTokens,
    regenPerMinute: syncedRegenPerMinute,
    lastRegenAt: regeneratedLastRegenAt,
  };
}

type ConstructionSpeedupTarget =
  | 'research-center'
  | 'remodel'
  | 'property-build-1'
  | 'property-build-2'
  | 'property-build-3'
  | 'property-build-4';

async function authenticateSseRequest(req: Request): Promise<{ userId: string } | null> {
  const accessTokenRaw = req.query.accessToken;
  const streamTokenRaw = req.query.streamToken;
  const tokenRaw =
    typeof streamTokenRaw === 'string' && streamTokenRaw.trim() !== ''
      ? streamTokenRaw
      : typeof accessTokenRaw === 'string' && accessTokenRaw.trim() !== ''
        ? accessTokenRaw
        : null;
  if (!tokenRaw) {
    return null;
  }
  try {
    const decoded = jwt.verify(tokenRaw, JWT_SECRET || 'defaultsecret') as {
      userId?: string;
      sessionId?: string;
      scope?: string;
    };
    // If the caller used the new short-lived stream token, require the SSE scope.
    if (typeof streamTokenRaw === 'string' && streamTokenRaw.trim() !== '') {
      if (decoded.scope !== 'bug-hunt-bugs-sse') {
        return null;
      }
    }
    const userId = String(decoded.userId ?? '').trim();
    if (userId === '') {
      return null;
    }
    const user = await User.findById(userId).select('currentTokenId').lean();
    if (!user) {
      return null;
    }
    const sessionId = decoded.sessionId;
    if (sessionId && String((user as any).currentTokenId ?? '') !== String(sessionId)) {
      return null;
    }
    return { userId };
  } catch {
    return null;
  }
}

router.get('/world-state', auth, async (_req: Request, res: Response): Promise<void> => {
  const world = getBugHuntWorldStateSnapshot();
  res.json({
    reseedInProgress: world.reseedInProgress,
    nextAntWorldReseedAtUtc: world.nextAntWorldReseedAtUtc.toISOString(),
    serverTimeMs: Date.now(),
    updatedAtUtc: world.updatedAt.toISOString(),
  });
});

/**
 * EventSource cannot attach auth headers; use a short-lived scoped token to reduce bearer token exposure in logs.
 * Still accepts legacy `accessToken` for backwards compatibility.
 */
router.get('/bugs/stream-token', auth, async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.user?._id ?? '').trim();
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const sessionId = String((req.user as any)?.currentTokenId ?? '').trim();
  const secret = JWT_SECRET || 'defaultsecret';
  const streamToken = jwt.sign(
    { userId, sessionId, scope: 'bug-hunt-bugs-sse' },
    secret,
    // Small window so a leaked query param is less valuable than the full bearer token.
    { expiresIn: '2m' }
  );
  res.json({ streamToken, serverTimeMs: Date.now() });
});

router.get('/tokens', auth, async (req: Request, res: Response): Promise<void> => {
  const userId = String(req.user._id);
  const session = await mongoose.startSession();
  try {
    const tokenPayload = await readBugHuntTokens({ userId, session });

    res.json({
      currentTokens: tokenPayload.currentTokens,
      maxTokens: tokenPayload.maxTokens,
      regenPerMinute: tokenPayload.regenPerMinute,
      lastRegenAt: tokenPayload.lastRegenAt.toISOString(),
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    console.error('GET /api/bug-hunt/tokens error:', error);
    res.status(500).json({ error: 'Failed to load bug-hunt token state' });
  } finally {
    session.endSession();
  }
});

router.get('/telemetry/summary', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const lookbackRaw = Number(req.query.lookbackHours ?? 24);
    const lookbackHours = Math.max(1, Math.min(24 * 7, Math.floor(lookbackRaw)));
    const summary = await getBugHuntTelemetrySummary({ lookbackHours });
    res.json({
      ...summary,
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    console.error('GET /api/bug-hunt/telemetry/summary error:', error);
    res.status(500).json({ error: 'Failed to compute bug-hunt telemetry summary' });
  }
});

router.get('/ops/checks', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const sampleLimitRaw = Number(req.query.sampleLimit ?? 25);
    const sampleLimit = Math.max(1, Math.min(100, Math.floor(sampleLimitRaw)));
    const checks = await getBugHuntOperationalChecks({ sampleLimit });
    res.json({
      ...checks,
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    console.error('GET /api/bug-hunt/ops/checks error:', error);
    res.status(500).json({ error: 'Failed to compute bug-hunt operational checks' });
  }
});

/**
 * Phase 1 read contract: authoritative bug world rows.
 */
router.get('/bugs', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const bugTypeRaw = req.query.bugType;
    const lifecycleStateRaw = req.query.lifecycleState;

    const filter: Record<string, unknown> = {};
    if (bugTypeRaw !== undefined) {
      filter.bugType = asBugType(bugTypeRaw);
    }
    if (lifecycleStateRaw !== undefined) {
      const allowedStates: BugLifecycleState[] = ['alive', 'defeated', 'removed'];
      if (typeof lifecycleStateRaw !== 'string' || !allowedStates.includes(lifecycleStateRaw as BugLifecycleState)) {
        res.status(400).json({ error: 'lifecycleState must be one of: alive, defeated, removed' });
        return;
      }
      filter.lifecycleState = lifecycleStateRaw;
    }

    const bugs = await BugInstance.find(filter).sort({ spawnedAt: -1, bugInstanceId: 1 }).lean();
    res.json({
      bugs,
      antWorldCap: ANT_WORLD_CAP,
      serverNowUtc: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/bug-hunt/bugs error:', error);
    res.status(500).json({ error: 'Failed to fetch bug instances' });
  }
});

router.get('/bugs/viewport', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const x1 = Number(req.query.x1);
    const y1 = Number(req.query.y1);
    const x2 = Number(req.query.x2);
    const y2 = Number(req.query.y2);
    if (![x1, y1, x2, y2].every((n) => Number.isFinite(n) && Number.isInteger(n))) {
      res.status(400).json({ error: 'x1,y1,x2,y2 must be integer query params' });
      return;
    }
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const bugs = await BugInstance.find({
      bugType: BUG_TYPE_ANT,
      lifecycleState: 'alive',
      mapCellX: { $gte: minX, $lte: maxX },
      mapCellY: { $gte: minY, $lte: maxY },
    })
      .sort({ bugInstanceId: 1 })
      .lean();
    res.json({
      bugs,
      viewport: { x1: minX, y1: minY, x2: maxX, y2: maxY },
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    console.error('GET /api/bug-hunt/bugs/viewport error:', error);
    res.status(500).json({ error: 'Failed to fetch viewport bug instances' });
  }
});

router.get('/bugs/stream', async (req: Request, res: Response): Promise<void> => {
  const authResult = await authenticateSseRequest(req);
  if (!authResult) {
    res.status(401).json({ error: 'Unauthorized stream request' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: unknown) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  send({ type: 'connected', serverTimeMs: Date.now() });
  const heartbeat = setInterval(() => {
    send({ type: 'heartbeat', serverTimeMs: Date.now() });
  }, 20_000);

  const unsubscribe = subscribeBugHpUpdates((event) => {
    send({
      type: 'bug-hp-update',
      bugInstanceId: event.bugInstanceId,
      hpPercent: event.hpPercent,
      seq: event.seq,
      serverTimeMs: Date.now(),
    });
  });

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

router.get('/bugs/:bugInstanceId', auth, async (req: Request, res: Response): Promise<void> => {
  const bugInstanceId = String(req.params.bugInstanceId ?? '').trim();
  if (!bugInstanceId) {
    res.status(400).json({ error: 'bugInstanceId is required' });
    return;
  }
  const bug = await BugInstance.findOne({ bugInstanceId }).lean();
  if (!bug) {
    res.status(404).json({ error: 'Bug instance not found' });
    return;
  }
  res.json({ bug, serverTimeMs: Date.now() });
});

/**
 * Phase 1 write contract: authoritative bug instance create (used by seed tooling / admin flows).
 */
router.post('/bugs', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { bugInstanceId, bugType, mapCellX, mapCellY, maxHp, currentHp } = req.body ?? {};
    if (typeof bugInstanceId !== 'string' || bugInstanceId.trim() === '') {
      res.status(400).json({ error: 'bugInstanceId is required' });
      return;
    }
    const parsedBugType = asBugType(bugType);
    if (!Number.isInteger(mapCellX) || !Number.isInteger(mapCellY)) {
      res.status(400).json({ error: 'mapCellX and mapCellY must be integers' });
      return;
    }
    if (!Number.isFinite(maxHp) || maxHp <= 0) {
      res.status(400).json({ error: 'maxHp must be a positive finite number' });
      return;
    }
    if (!Number.isFinite(currentHp) || currentHp < 0 || currentHp > maxHp) {
      res.status(400).json({ error: 'currentHp must be finite and within [0, maxHp]' });
      return;
    }

    if (parsedBugType === BUG_TYPE_ANT) {
      const antAliveCount = await BugInstance.countDocuments({
        bugType: BUG_TYPE_ANT,
        lifecycleState: 'alive',
      });
      if (antAliveCount >= ANT_WORLD_CAP) {
        res.status(409).json({ error: `Ant world cap (${ANT_WORLD_CAP}) reached` });
        return;
      }
    }

    const now = new Date();
    const hpPercent = toHpPercent(currentHp, maxHp);
    const created = await BugInstance.create({
      bugInstanceId: bugInstanceId.trim(),
      bugType: parsedBugType,
      mapCellX,
      mapCellY,
      maxHp,
      currentHp,
      hpPercent,
      seq: 0,
      lifecycleState: currentHp === 0 ? 'defeated' : 'alive',
      spawnedAt: now,
      defeatedAt: currentHp === 0 ? now : undefined,
    });
    publishBugHpUpdate({
      bugInstanceId: created.bugInstanceId,
      hpPercent: created.hpPercent,
      seq: created.seq,
    });

    res.status(201).json({ bug: created.toObject() });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(409).json({ error: 'bugInstanceId already exists' });
      return;
    }
    if (error instanceof Error && error.message.includes('bugType must be')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('POST /api/bug-hunt/bugs error:', error);
    res.status(500).json({ error: 'Failed to create bug instance' });
  }
});

/**
 * Phase 1 write contract: authoritative HP update with monotonic per-bug seq.
 */
router.patch('/bugs/:bugInstanceId/hp', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const bugInstanceId = String(req.params.bugInstanceId ?? '').trim();
    if (bugInstanceId === '') {
      res.status(400).json({ error: 'bugInstanceId is required' });
      return;
    }

    const { currentHp } = req.body ?? {};
    if (!Number.isFinite(currentHp) || currentHp < 0) {
      res.status(400).json({ error: 'currentHp must be a finite number >= 0' });
      return;
    }

    const bug = await BugInstance.findOne({ bugInstanceId });
    if (!bug) {
      res.status(404).json({ error: 'Bug instance not found' });
      return;
    }
    if (bug.lifecycleState === 'removed') {
      res.status(409).json({ error: 'Bug instance is already removed' });
      return;
    }
    if (currentHp > bug.maxHp) {
      res.status(400).json({ error: 'currentHp cannot exceed maxHp' });
      return;
    }

    const hpPercent = toHpPercent(currentHp, bug.maxHp);
    const nextState: BugLifecycleState = currentHp === 0 ? 'defeated' : 'alive';
    bug.currentHp = currentHp;
    bug.hpPercent = hpPercent;
    bug.seq = bug.seq + 1;
    bug.lifecycleState = nextState;
    if (currentHp === 0 && !bug.defeatedAt) {
      bug.defeatedAt = new Date();
    }
    await bug.save();
    publishBugHpUpdate({
      bugInstanceId: bug.bugInstanceId,
      hpPercent: bug.hpPercent,
      seq: bug.seq,
    });

    res.json({
      bug,
      event: {
        bugInstanceId: bug.bugInstanceId,
        hpPercent: bug.hpPercent,
        seq: bug.seq,
      },
    });
  } catch (error) {
    console.error('PATCH /api/bug-hunt/bugs/:bugInstanceId/hp error:', error);
    res.status(500).json({ error: 'Failed to update bug HP' });
  }
});

/**
 * Phase 1 persistence read: hunter ownership + progression rows for current user.
 */
router.get('/hunters/me', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.user._id);
    const hunters = await UserHunter.find({ userId }).sort({ unlockedAt: 1 }).lean();
    res.json({ hunters, maxHunterLevel: MAX_HUNTER_LEVEL });
  } catch (error) {
    console.error('GET /api/bug-hunt/hunters/me error:', error);
    res.status(500).json({ error: 'Failed to fetch hunter ownership' });
  }
});

/**
 * Phase 1 persistence write: create hunter ownership row (MVP roster id only).
 */
router.post('/hunters/unlock', auth, async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  try {
    const rosterId = asHunterRosterId(req.body?.hunterRosterId);
    const userId = String(req.user._id);
    let createdHunter: unknown = null;
    let alreadyUnlocked = false;

    await session.withTransaction(async () => {
      const existing = await UserHunter.findOne({ userId, hunterRosterId: rosterId }).session(session).lean();
      if (existing) {
        createdHunter = existing;
        alreadyUnlocked = true;
        return;
      }

      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const hasAntivirusResearch = await UserResearchFeature.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        categoryId: 'home-defense',
        featureId: 'antivirus',
        isUnlocked: true,
      })
        .select('_id')
        .session(session)
        .lean();

      const gateErrors: string[] = [];
      const userBalance = Number(user.balance?.total);
      if (!Number.isFinite(userBalance)) {
        throw new Error('User wallet balance is invalid for hunter unlock');
      }
      if (user.level < KAITO_UNLOCK_MIN_USER_LEVEL) {
        gateErrors.push(`Requires level ${KAITO_UNLOCK_MIN_USER_LEVEL} (current: ${user.level})`);
      }
      if (user.unlockedFeatures?.researchCenter !== true) {
        gateErrors.push('Requires Research Center to be built');
      }
      if (user.unlockedFeatures?.rentalHousing1 !== true) {
        gateErrors.push('Requires Investment Property 1 to be built');
      }
      if (!hasAntivirusResearch) {
        gateErrors.push('Requires Antivirus research to be completed');
      }
      if (userBalance < KAITO_UNLOCK_SOFT_CURRENCY_COST) {
        gateErrors.push(
          `Requires $${KAITO_UNLOCK_SOFT_CURRENCY_COST.toLocaleString()} (current: $${Math.floor(
            userBalance
          ).toLocaleString()})`
        );
      }
      if (gateErrors.length > 0) {
        const err = new Error('Kaito unlock requirements not met');
        (err as Error & { gateErrors?: string[] }).gateErrors = gateErrors;
        throw err;
      }

      user.balance.total -= KAITO_UNLOCK_SOFT_CURRENCY_COST;
      user.balance.lastUpdated = new Date();
      await user.save({ session });

      const progress = HunterProgressionService.createInitialProgressSnapshot();
      const created = await UserHunter.create(
        [
          {
            userId,
            hunterRosterId: rosterId,
            unlockedAt: new Date(),
            level: progress.level,
            currentExp: progress.currentExp,
            nextLevelExp: progress.nextLevelExp,
            totalExp: progress.totalExp,
          },
        ],
        { session }
      );
      const createdRow = created[0];
      if (!createdRow) {
        throw new Error('FAILED_TO_CREATE_HUNTER');
      }
      createdHunter = createdRow.toObject();
    });

    if (!createdHunter) {
      res.status(500).json({ error: 'Failed to unlock hunter' });
      return;
    }
    res.status(alreadyUnlocked ? 200 : 201).json({ hunter: createdHunter as Record<string, unknown> });
  } catch (error) {
    if (error instanceof Error && error.message.includes('hunterRosterId must be')) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const gateErrors = (error as Error & { gateErrors?: string[] }).gateErrors;
    if (Array.isArray(gateErrors) && gateErrors.length > 0) {
      res.status(403).json({ error: 'Kaito unlock requirements not met', gateErrors });
      return;
    }
    console.error('POST /api/bug-hunt/hunters/unlock error:', error);
    res.status(500).json({ error: 'Failed to unlock hunter' });
  } finally {
    session.endSession();
  }
});

/**
 * Phase 1 contract: current+next effective stats using hunterLevel (not user level).
 */
router.get('/hunters/:hunterRosterId/stats', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.user._id);
    const hunterRosterId = asHunterRosterId(req.params.hunterRosterId);
    const hunter = await UserHunter.findOne({ userId, hunterRosterId }).lean();
    if (!hunter) {
      res.status(404).json({ error: 'Hunter not owned' });
      return;
    }

    const stats = HunterProgressionService.getCurrentAndNextStats(hunterRosterId, hunter.level);
    res.json({
      hunter: {
        hunterRosterId,
        level: hunter.level,
        currentExp: hunter.currentExp,
        nextLevelExp: hunter.nextLevelExp,
        totalExp: hunter.totalExp,
      },
      stats,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('hunterRosterId must be')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('GET /api/bug-hunt/hunters/:hunterRosterId/stats error:', error);
    res.status(500).json({ error: 'Failed to fetch hunter stats' });
  }
});

/**
 * Phase 1 storage contract: typed item definitions used by Ant full-defeat rewards.
 */
router.get('/storage-item-definitions', auth, async (_req: Request, res: Response): Promise<void> => {
  res.json({
    bugType: BUG_TYPE_ANT,
    items: BUG_HUNT_STORAGE_ITEM_DEFINITIONS,
  });
});

router.get('/exchange/catalog', auth, async (_req: Request, res: Response): Promise<void> => {
  const items = EXCHANGE_CATALOG_ITEMS.map((def) => ({
    itemKey: def.itemKey,
    label: def.label,
    category: def.category,
    shopPrice: Math.floor(def.shopPrice ?? 0),
    durationSeconds: def.durationSeconds,
    speedupDomain: def.speedupDomain,
    travelSpeedPercent: def.travelSpeedPercent,
    tokenAmount: def.tokenAmount,
  }));
  res.json({ items, serverTimeMs: Date.now() });
});

router.get('/exchange/packs', auth, async (_req: Request, res: Response): Promise<void> => {
  const packs = buildUndergroundExchangePacks({
    now: new Date(),
    itemDefinitions: BUG_HUNT_STORAGE_ITEM_DEFINITIONS,
  });
  res.json({
    staplePacks: packs.staplePacks,
    weeklyPacks: packs.weeklyPacks,
    weekStartUtc: packs.weekWindow.weekStartUtc,
    weekEndUtc: packs.weekWindow.weekEndUtc,
    serverTimeMs: Date.now(),
  });
});

router.post('/exchange/purchase', auth, async (req: Request, res: Response): Promise<void> => {
  const itemKey = String(req.body?.itemKey ?? '').trim();
  const quantityRaw = Number(req.body?.quantity);
  const quantity = Math.floor(quantityRaw);
  if (itemKey === '') {
    res.status(400).json({ error: 'itemKey is required' });
    return;
  }
  if (!Number.isFinite(quantityRaw) || !Number.isInteger(quantityRaw) || quantity <= 0) {
    res.status(400).json({ error: 'quantity must be a positive integer' });
    return;
  }

  let definition: (typeof BUG_HUNT_STORAGE_ITEM_DEFINITIONS)[number];
  try {
    definition = requireExchangeCatalogItem(itemKey);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid exchange catalog item' });
    return;
  }

  const userId = String(req.user._id);
  const session = await mongoose.startSession();
  try {
    let newBalance = 0;
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }
      const unitPrice = Math.floor(definition.shopPrice ?? 0);
      if (unitPrice <= 0) {
        throw new Error(`Underground Exchange item '${definition.itemKey}' has invalid unit price`);
      }
      const totalCost = unitPrice * quantity;
      if (!Number.isFinite(user.balance.total)) {
        throw new Error('User wallet balance is invalid');
      }
      if (user.balance.total < totalCost) {
        throw new Error(`Insufficient balance for purchase ($${totalCost.toLocaleString()} required)`);
      }

      const state = await getOrCreateUserBugHuntState({ userId, session });
      const currentItems = [...(state.storageItems ?? [])];
      const rowIdx = currentItems.findIndex((row) => row.itemKey === definition.itemKey);
      if (rowIdx >= 0) {
        const existingQty = Math.max(0, Math.floor(Number(currentItems[rowIdx].quantity ?? 0)));
        currentItems[rowIdx] = { itemKey: definition.itemKey, quantity: existingQty + quantity };
      } else {
        currentItems.push({ itemKey: definition.itemKey, quantity });
      }
      state.storageItems = currentItems.sort((a, b) => a.itemKey.localeCompare(b.itemKey));
      await state.save({ session });

      user.balance.total -= totalCost;
      user.balance.lastUpdated = new Date();
      await user.save({ session });
      newBalance = user.balance.total;
    });

    res.json({
      success: true,
      itemKey: definition.itemKey,
      quantityPurchased: quantity,
      totalCost: Math.floor(definition.shopPrice ?? 0) * quantity,
      newBalance,
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to purchase exchange item';
    const isUserError = message.includes('Unknown Underground Exchange item') || message.includes('Insufficient balance');
    if (isUserError) {
      res.status(400).json({ error: message });
      return;
    }
    console.error('POST /api/bug-hunt/exchange/purchase error:', error);
    res.status(500).json({ error: message });
  } finally {
    session.endSession();
  }
});

router.post('/exchange/packs/purchase', auth, async (req: Request, res: Response): Promise<void> => {
  const packId = String(req.body?.packId ?? '').trim();
  const quantityRaw = Number(req.body?.quantity);
  const quantity = Math.floor(quantityRaw);
  if (packId === '') {
    res.status(400).json({ error: 'packId is required' });
    return;
  }
  if (!Number.isFinite(quantityRaw) || !Number.isInteger(quantityRaw) || quantity <= 0) {
    res.status(400).json({ error: 'quantity must be a positive integer' });
    return;
  }
  const pack = resolvePackById({
    now: new Date(),
    itemDefinitions: BUG_HUNT_STORAGE_ITEM_DEFINITIONS,
    packId,
  });
  if (!pack) {
    res.status(400).json({ error: `Unknown or inactive Underground Exchange pack '${packId}'` });
    return;
  }
  const unitPrice = Math.max(1, Math.floor(pack.discountedPrice));
  const totalCost = unitPrice * quantity;

  const userId = String(req.user._id);
  const session = await mongoose.startSession();
  try {
    let newBalance = 0;
    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }
      if (!Number.isFinite(user.balance.total)) {
        throw new Error('User wallet balance is invalid');
      }
      if (user.balance.total < totalCost) {
        throw new Error(`Insufficient balance for purchase ($${totalCost.toLocaleString()} required)`);
      }

      const state = await getOrCreateUserBugHuntState({ userId, session });
      const inventoryMap = new Map<string, number>();
      for (const row of state.storageItems ?? []) {
        inventoryMap.set(String(row.itemKey), Math.max(0, Math.floor(Number(row.quantity ?? 0))));
      }
      for (const row of pack.items) {
        const addQty = Math.max(1, Math.floor(row.quantity)) * quantity;
        inventoryMap.set(row.itemKey, (inventoryMap.get(row.itemKey) ?? 0) + addQty);
      }
      state.storageItems = [...inventoryMap.entries()]
        .map(([itemKey, qty]) => ({ itemKey, quantity: qty }))
        .sort((a, b) => a.itemKey.localeCompare(b.itemKey));
      await state.save({ session });

      user.balance.total -= totalCost;
      user.balance.lastUpdated = new Date();
      await user.save({ session });
      newBalance = user.balance.total;
    });

    res.json({
      success: true,
      packId: pack.packId,
      quantityPurchased: quantity,
      totalCost,
      newBalance,
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to purchase exchange pack';
    const isUserError = message.includes('Unknown or inactive Underground Exchange pack') || message.includes('Insufficient balance');
    if (isUserError) {
      res.status(400).json({ error: message });
      return;
    }
    console.error('POST /api/bug-hunt/exchange/packs/purchase error:', error);
    res.status(500).json({ error: message });
  } finally {
    session.endSession();
  }
});

router.get('/storage/inventory', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String(req.user._id);
    const state = await UserBugHuntState.findOne({ userId }).lean();
    const quantityByKey = new Map<string, number>();
    for (const row of state?.storageItems ?? []) {
      quantityByKey.set(String(row.itemKey), Number(row.quantity));
    }
    const items = BUG_HUNT_STORAGE_ITEM_DEFINITIONS.map((def) => ({
      ...def,
      quantity: Math.max(0, Math.floor(quantityByKey.get(def.itemKey) ?? 0)),
    })).filter((entry) => entry.quantity > 0);
    res.json({
      items,
      pendingTravelSpeedupPercent: state?.pendingTravelSpeedupPercent ?? null,
      serverTimeMs: Date.now(),
    });
  } catch (error) {
    console.error('GET /api/bug-hunt/storage/inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch bug-hunt storage inventory' });
  }
});

router.post('/storage/use', auth, async (req: Request, res: Response): Promise<void> => {
  const itemKey = String(req.body?.itemKey ?? '').trim();
  const speedupTargetRaw = String(req.body?.speedupTarget ?? '').trim();
  const researchCategoryIdRaw = String(req.body?.researchCategoryId ?? '').trim();
  const researchFeatureIdRaw = String(req.body?.researchFeatureId ?? '').trim();
  const attackMarchIdRaw = String(req.body?.attackMarchId ?? '').trim();
  const probeIdRaw = String(req.body?.probeId ?? '').trim();
  const quantityRaw = Number(req.body?.quantity ?? 1);
  const quantity = Math.floor(quantityRaw);
  const speedupTarget: ConstructionSpeedupTarget | null =
    speedupTargetRaw === 'research-center' ||
    speedupTargetRaw === 'remodel' ||
    speedupTargetRaw === 'property-build-1' ||
    speedupTargetRaw === 'property-build-2' ||
    speedupTargetRaw === 'property-build-3' ||
    speedupTargetRaw === 'property-build-4'
      ? speedupTargetRaw
      : null;
  if (itemKey === '') {
    res.status(400).json({ error: 'itemKey is required' });
    return;
  }
  if ((researchCategoryIdRaw === '') !== (researchFeatureIdRaw === '')) {
    res.status(400).json({ error: 'researchCategoryId and researchFeatureId must be provided together' });
    return;
  }
  if (!Number.isFinite(quantityRaw) || !Number.isInteger(quantityRaw) || quantity <= 0) {
    res.status(400).json({ error: 'quantity must be a positive integer' });
    return;
  }
  if (speedupTargetRaw !== '' && !speedupTarget) {
    res.status(400).json({
      error:
        "speedupTarget must be one of: research-center, remodel, property-build-1, property-build-2, property-build-3, property-build-4",
    });
    return;
  }
  let definition: (typeof BUG_HUNT_STORAGE_ITEM_DEFINITIONS)[number];
  try {
    definition = requireStorageDefinition(itemKey);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid item key' });
    return;
  }

  const userId = String(req.user._id);
  const session = await mongoose.startSession();
  try {
    let responsePayload: Record<string, unknown> | null = null;
    await session.withTransaction(async () => {
      const state = await getOrCreateUserBugHuntState({ userId, session });
      const storageItems = [...(state.storageItems ?? [])];
      const rowIdx = storageItems.findIndex((row) => row.itemKey === definition.itemKey);
      if (rowIdx < 0) {
        throw new Error(`No ${definition.label} available in storage`);
      }
      const currentQty = Number(storageItems[rowIdx].quantity ?? 0);
      if (!Number.isInteger(currentQty) || currentQty <= 0) {
        throw new Error(`${definition.label} is out of stock`);
      }
      if (currentQty < quantity) {
        throw new Error(`${definition.label} has only ${currentQty} left`);
      }
      let quantityToConsume = quantity;

      if (definition.category === 'cash') {
        if (!Number.isFinite(definition.cashAmount) || (definition.cashAmount ?? 0) <= 0) {
          throw new Error(`Storage item '${definition.itemKey}' missing cashAmount`);
        }
        const user = await User.findById(userId).session(session);
        if (!user) {
          throw new Error('User not found for cash item grant');
        }
        const cashAdded = Math.floor(definition.cashAmount ?? 0) * quantity;
        user.balance.total += cashAdded;
        user.balance.lastUpdated = new Date();
        await user.save({ session });
        responsePayload = {
          effect: 'cash',
          cashAdded,
          quantityUsed: quantity,
          itemKey: definition.itemKey,
        };
      } else if (definition.category === 'token') {
        if (!Number.isFinite(definition.tokenAmount) || (definition.tokenAmount ?? 0) <= 0) {
          throw new Error(`Storage item '${definition.itemKey}' missing tokenAmount`);
        }
        const tokenAmountPerItem = Math.floor(definition.tokenAmount ?? 0);
        const effectiveTokenConfig = await resolveEffectiveBugHuntTokenConfig({ userId, session });
        const tokenSnapshot = resolveRegeneratedTokenSnapshotFromState({
          currentTokensRaw: state.currentTokens,
          maxTokensRaw: state.maxTokens,
          regenPerMinuteRaw: state.regenPerMinute,
          lastRegenAt: state.lastRegenAt,
          syncedMaxTokens: effectiveTokenConfig.maxTokens,
          syncedRegenPerMinute: effectiveTokenConfig.regenPerMinute,
          now: new Date(),
        });
        const currentTokens = tokenSnapshot.currentTokens;
        const maxTokens = tokenSnapshot.maxTokens;
        if (!Number.isFinite(currentTokens) || !Number.isFinite(maxTokens)) {
          throw new Error('Token state is invalid');
        }
        if (currentTokens >= maxTokens) {
          throw new Error('Bug-hunt tokens are already full');
        }
        const tokensNeededToCap = maxTokens - currentTokens;
        const maxUsefulQuantity = Math.floor(tokensNeededToCap / tokenAmountPerItem);
        if (!Number.isFinite(maxUsefulQuantity) || maxUsefulQuantity < 1) {
          throw new Error('This token item would exceed bug-hunt token capacity');
        }
        quantityToConsume = Math.min(quantity, maxUsefulQuantity);
        const tokenGrantAttempt = tokenAmountPerItem * quantityToConsume;
        const tokensAfterUse = Math.min(maxTokens, currentTokens + tokenGrantAttempt);
        const tokenAdded = tokensAfterUse - currentTokens;
        if (tokenAdded <= 0) {
          throw new Error('Bug-hunt tokens are already full');
        }
        state.currentTokens = tokensAfterUse;
        state.maxTokens = tokenSnapshot.maxTokens;
        state.regenPerMinute = tokenSnapshot.regenPerMinute;
        state.lastRegenAt = tokenSnapshot.lastRegenAt;
        responsePayload = {
          effect: 'token',
          tokenAdded,
          itemKey: definition.itemKey,
          quantityUsed: quantityToConsume,
          tokensAfterUse,
          maxTokens,
        };
      } else if (definition.category === 'speedup') {
        if (!Number.isFinite(definition.durationSeconds) || (definition.durationSeconds ?? 0) <= 0) {
          throw new Error(`Storage item '${definition.itemKey}' missing durationSeconds`);
        }
        if (!definition.speedupDomain) {
          throw new Error(`Storage item '${definition.itemKey}' missing speedupDomain`);
        }
        const perItemDurationSeconds = Math.floor(definition.durationSeconds ?? 0);
        if (definition.speedupDomain === 'research') {
          const targetedResearchFilter: Record<string, unknown> = {
            userId: new mongoose.Types.ObjectId(userId),
            isResearching: true,
            researchCompletesAt: { $ne: null },
          };
          if (researchCategoryIdRaw !== '' && researchFeatureIdRaw !== '') {
            targetedResearchFilter.categoryId = researchCategoryIdRaw;
            targetedResearchFilter.featureId = researchFeatureIdRaw;
          }
          const activeResearchQuery = UserResearchFeature.findOne(targetedResearchFilter).session(session);
          const activeResearch =
            researchCategoryIdRaw !== '' && researchFeatureIdRaw !== ''
              ? await activeResearchQuery
              : await activeResearchQuery.sort({ researchCompletesAt: 1 });
          if (!activeResearch || !activeResearch.researchCompletesAt) {
            throw new Error('No active research feature to speed up');
          }
          const remainingSeconds = Math.max(
            0,
            Math.ceil((activeResearch.researchCompletesAt.getTime() - Date.now()) / 1000)
          );
          if (remainingSeconds <= 0) {
            throw new Error('The active research timer is already complete');
          }
          const maxUsefulQuantity = Math.max(1, Math.ceil(remainingSeconds / perItemDurationSeconds));
          quantityToConsume = Math.min(quantity, maxUsefulQuantity);
          const durationSeconds = perItemDurationSeconds * quantityToConsume;
          const nextCompletesAt = applySpeedupDate(activeResearch.researchCompletesAt, durationSeconds);
          activeResearch.researchCompletesAt = nextCompletesAt;
          await activeResearch.save({ session });
          responsePayload = {
            effect: 'speedup',
            domain: 'research',
            itemKey: definition.itemKey,
            quantityUsed: quantityToConsume,
            categoryId: activeResearch.categoryId,
            featureId: activeResearch.featureId,
            nextCompletesAt: nextCompletesAt.toISOString(),
          };
        } else if (definition.speedupDomain === 'construction') {
          const user = await User.findById(userId).session(session);
          if (!user) {
            throw new Error('User not found for construction speedup');
          }
          const candidates: Array<{
            key: 'research-center' | 'remodel' | 'property-build-1' | 'property-build-2' | 'property-build-3' | 'property-build-4';
            completesAt: Date;
          }> = [];
          if (user.researchCenterBuild?.completesAt instanceof Date) {
            candidates.push({ key: 'research-center', completesAt: user.researchCenterBuild.completesAt });
          }
          if (user.activeRemodel?.completesAt instanceof Date) {
            candidates.push({ key: 'remodel', completesAt: user.activeRemodel.completesAt });
          }
          const propertyBuilds = user.rentalHousingBuilds;
          if (propertyBuilds?.property1?.completesAt instanceof Date) {
            candidates.push({ key: 'property-build-1', completesAt: propertyBuilds.property1.completesAt });
          }
          if (propertyBuilds?.property2?.completesAt instanceof Date) {
            candidates.push({ key: 'property-build-2', completesAt: propertyBuilds.property2.completesAt });
          }
          if (propertyBuilds?.property3?.completesAt instanceof Date) {
            candidates.push({ key: 'property-build-3', completesAt: propertyBuilds.property3.completesAt });
          }
          if (propertyBuilds?.property4?.completesAt instanceof Date) {
            candidates.push({ key: 'property-build-4', completesAt: propertyBuilds.property4.completesAt });
          }
          if (candidates.length === 0) {
            throw new Error('No active construction/remodel timer to speed up');
          }
          let chosen: (typeof candidates)[number] | undefined;
          if (speedupTarget) {
            chosen = candidates.find((entry) => entry.key === speedupTarget);
            if (!chosen) {
              throw new Error(`No active construction target found for '${speedupTarget}'`);
            }
          } else {
            candidates.sort((a, b) => a.completesAt.getTime() - b.completesAt.getTime());
            chosen = candidates[0];
          }
          if (!chosen) {
            throw new Error('No eligible construction timer found for speedup');
          }
          const remainingSeconds = Math.max(0, Math.ceil((chosen.completesAt.getTime() - Date.now()) / 1000));
          if (remainingSeconds <= 0) {
            throw new Error('The selected construction timer is already complete');
          }
          const maxUsefulQuantity = Math.max(1, Math.ceil(remainingSeconds / perItemDurationSeconds));
          quantityToConsume = Math.min(quantity, maxUsefulQuantity);
          const durationSeconds = perItemDurationSeconds * quantityToConsume;
          const nextCompletesAt = applySpeedupDate(chosen.completesAt, durationSeconds);
          if (chosen.key === 'research-center' && user.researchCenterBuild) {
            user.researchCenterBuild.completesAt = nextCompletesAt;
          } else if (chosen.key === 'remodel' && user.activeRemodel) {
            user.activeRemodel.completesAt = nextCompletesAt;
          } else if (chosen.key === 'property-build-1' && user.rentalHousingBuilds?.property1) {
            user.rentalHousingBuilds.property1.completesAt = nextCompletesAt;
          } else if (chosen.key === 'property-build-2' && user.rentalHousingBuilds?.property2) {
            user.rentalHousingBuilds.property2.completesAt = nextCompletesAt;
          } else if (chosen.key === 'property-build-3' && user.rentalHousingBuilds?.property3) {
            user.rentalHousingBuilds.property3.completesAt = nextCompletesAt;
          } else if (chosen.key === 'property-build-4' && user.rentalHousingBuilds?.property4) {
            user.rentalHousingBuilds.property4.completesAt = nextCompletesAt;
          } else {
            throw new Error('Failed to apply construction speedup target');
          }
          await user.save({ session });
          responsePayload = {
            effect: 'speedup',
            domain: 'construction',
            itemKey: definition.itemKey,
            quantityUsed: quantityToConsume,
            target: chosen.key,
            nextCompletesAt: nextCompletesAt.toISOString(),
          };
        } else if (definition.speedupDomain === 'bot_assembly') {
          const botDoc = await Bot.findOne({ userId }).session(session);
          const completesAt = botDoc?.buildQueue?.completesAt;
          if (!(completesAt instanceof Date)) {
            throw new Error('No active bot assembly build to speed up');
          }
          const remainingSeconds = Math.max(0, Math.ceil((completesAt.getTime() - Date.now()) / 1000));
          if (remainingSeconds <= 0) {
            throw new Error('The active bot assembly timer is already complete');
          }
          const maxUsefulQuantity = Math.max(1, Math.ceil(remainingSeconds / perItemDurationSeconds));
          quantityToConsume = Math.min(quantity, maxUsefulQuantity);
          const durationSeconds = perItemDurationSeconds * quantityToConsume;
          const nextCompletesAt = applySpeedupDate(completesAt, durationSeconds);
          const markLevel = Number(botDoc.buildQueue.markLevel ?? 1) >= 2 ? 2 : 1;
          const msPerUnit = buildMillisecondsPerUnit(markLevel);
          const queueQuantity = Math.max(0, Math.floor(Number(botDoc.buildQueue.quantity ?? 0)));
          const prevBuilt = Math.max(0, Math.floor(Number(botDoc.buildQueue.botsBuilt ?? 0)));
          const startedAtMs = new Date(botDoc.buildQueue.startedAt).getTime();
          const expectedBuiltFromElapsed =
            Number.isFinite(startedAtMs) && msPerUnit > 0
              ? Math.min(queueQuantity, Math.floor(Math.max(0, Date.now() - startedAtMs) / msPerUnit))
              : prevBuilt;
          const baselineBuilt = Math.max(prevBuilt, expectedBuiltFromElapsed);
          const remainingAfterBaseline = Math.max(0, queueQuantity - baselineBuilt);
          const acceleratedBuilt = Math.min(
            remainingAfterBaseline,
            Math.floor((durationSeconds * 1000) / msPerUnit)
          );
          const builtAfterSpeedup = Math.min(queueQuantity, baselineBuilt + acceleratedBuilt);
          const newlyBuilt = Math.max(0, builtAfterSpeedup - prevBuilt);
          if (newlyBuilt > 0) {
            const family = getBuildQueueFamily(botDoc.buildQueue);
            const inventoryKey = getInventoryKey(family, markLevel);
            const botsMap = botDoc.bots as Record<string, number>;
            botsMap[inventoryKey] = Math.max(0, Math.floor(Number(botsMap[inventoryKey] ?? 0))) + newlyBuilt;
            botDoc.buildQueue.botsBuilt = builtAfterSpeedup;
          }
          botDoc.buildQueue.completesAt = nextCompletesAt;
          await botDoc.save({ session });
          responsePayload = {
            effect: 'speedup',
            domain: 'bot_assembly',
            itemKey: definition.itemKey,
            quantityUsed: quantityToConsume,
            nextCompletesAt: nextCompletesAt.toISOString(),
          };
        } else {
          throw new Error(`Unsupported speedup domain '${definition.speedupDomain}'`);
        }
      } else if (definition.category === 'travel') {
        if (quantity !== 1) {
          throw new Error('Travel speedup items can only be used one at a time');
        }
        if (!Number.isFinite(definition.travelSpeedPercent) || (definition.travelSpeedPercent ?? 0) <= 0) {
          throw new Error(`Storage item '${definition.itemKey}' missing travelSpeedPercent`);
        }
        const hasAttackMarchTarget = attackMarchIdRaw !== '';
        const hasProbeTarget = probeIdRaw !== '';
        if (hasAttackMarchTarget === hasProbeTarget) {
          throw new Error('Exactly one travel target is required: attackMarchId or probeId');
        }
        const travelSpeedPercent = Math.max(1, Math.floor(definition.travelSpeedPercent ?? 0));
        if (hasAttackMarchTarget) {
          const activeMarch = await AttackMarch.findOne({
            marchId: attackMarchIdRaw,
            attackerId: userId,
            state: { $in: ['outbound', 'returning'] },
          }).session(session);
          if (!activeMarch) {
            throw new Error('No active owned march found for this travel speedup');
          }
          const nowMs = Date.now();
          if (activeMarch.state === 'outbound') {
            const currentArriveMs = activeMarch.arriveAt instanceof Date ? activeMarch.arriveAt.getTime() : NaN;
            if (!Number.isFinite(currentArriveMs)) {
              throw new Error('The selected march has invalid timing data');
            }
            const remainingMs = Math.max(0, currentArriveMs - nowMs);
            if (remainingMs <= 0) {
              throw new Error('The selected march has already arrived at the target');
            }
            const reducedRemainingMs = Math.max(
              1000,
              Math.ceil(remainingMs * (1 - travelSpeedPercent / 100))
            );
            const nextArriveAt = new Date(nowMs + reducedRemainingMs);
            activeMarch.arriveAt = nextArriveAt;
            await activeMarch.save({ session });
            responsePayload = {
              effect: 'travel',
              itemKey: definition.itemKey,
              quantityUsed: quantityToConsume,
              attackMarchId: activeMarch.marchId,
              phase: 'outbound',
              travelSpeedPercentApplied: travelSpeedPercent,
              nextArriveAt: nextArriveAt.toISOString(),
            };
          } else if (activeMarch.state === 'returning') {
            const currentReturnArriveMs =
              activeMarch.returnArriveAt instanceof Date ? activeMarch.returnArriveAt.getTime() : NaN;
            if (!Number.isFinite(currentReturnArriveMs)) {
              throw new Error('The selected return leg has invalid timing data');
            }
            const remainingMs = Math.max(0, currentReturnArriveMs - nowMs);
            if (remainingMs <= 0) {
              throw new Error('The selected march has already completed its return');
            }
            const reducedRemainingMs = Math.max(
              1000,
              Math.ceil(remainingMs * (1 - travelSpeedPercent / 100))
            );
            const nextReturnArriveAt = new Date(nowMs + reducedRemainingMs);
            activeMarch.returnArriveAt = nextReturnArriveAt;
            await activeMarch.save({ session });
            responsePayload = {
              effect: 'travel',
              itemKey: definition.itemKey,
              quantityUsed: quantityToConsume,
              attackMarchId: activeMarch.marchId,
              phase: 'returning',
              travelSpeedPercentApplied: travelSpeedPercent,
              nextReturnArriveAt: nextReturnArriveAt.toISOString(),
            };
          } else {
            throw new Error('Travel speedup target march must be outbound or returning');
          }
        } else {
          const probeTravel = reduceProbeTravelTime({
            probeId: probeIdRaw,
            userId,
            travelSpeedPercent,
          });
          responsePayload = {
            effect: 'travel',
            itemKey: definition.itemKey,
            quantityUsed: quantityToConsume,
            probeId: probeTravel.probeId,
            phase: probeTravel.phase,
            travelSpeedPercentApplied: probeTravel.travelSpeedPercentApplied,
            probeRemainingMs: probeTravel.remainingMs,
            ...(Number.isFinite(probeTravel.returnEndAt ?? NaN)
              ? { probeReturnEndAt: new Date(probeTravel.returnEndAt as number).toISOString() }
              : {}),
          };
        }
      } else {
        const rawCategory = (definition as { category?: unknown }).category;
        throw new Error(`Unsupported storage category '${String(rawCategory)}'`);
      }

      const nextQty = currentQty - quantityToConsume;
      if (nextQty > 0) {
        storageItems[rowIdx] = { itemKey: definition.itemKey, quantity: nextQty };
      } else {
        storageItems.splice(rowIdx, 1);
      }
      state.storageItems = storageItems;
      await state.save({ session });
    });

    if (!responsePayload) {
      res.status(500).json({ error: 'Storage use did not produce a result' });
      return;
    }
    const payload = responsePayload as Record<string, unknown>;
    const effectRaw = String(payload.effect ?? '').trim();
    if (effectRaw === 'cash' || effectRaw === 'speedup' || effectRaw === 'travel' || effectRaw === 'token') {
      void recordBugHuntStorageItemConsumed({
        userId,
        itemKey: definition.itemKey,
        effect: effectRaw as 'cash' | 'speedup' | 'travel' | 'token',
      });
    }
    res.json({
      success: true,
      ...payload,
      serverTimeMs: Date.now(),
    });
    if (effectRaw === 'travel') {
      const nextArriveAtRaw = payload.nextArriveAt;
      const nextReturnArriveAtRaw = payload.nextReturnArriveAt;
      const attackMarchIdValue = String(payload.attackMarchId ?? '').trim();
      if (typeof nextArriveAtRaw === 'string' && attackMarchIdValue !== '') {
        const nextArriveAt = new Date(nextArriveAtRaw);
        if (Number.isFinite(nextArriveAt.getTime())) {
          scheduleMarchArrival(attackMarchIdValue, nextArriveAt);
        }
      }
      if (typeof nextReturnArriveAtRaw === 'string' && attackMarchIdValue !== '') {
        const nextReturnArriveAt = new Date(nextReturnArriveAtRaw);
        if (Number.isFinite(nextReturnArriveAt.getTime())) {
          scheduleReturnMarchComplete(attackMarchIdValue, nextReturnArriveAt);
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to consume storage item';
    const isUserError =
      message.includes('No ') ||
      message.includes('out of stock') ||
      message.includes('already armed') ||
      message.includes('Unknown bug-hunt storage item') ||
      message.includes('No active construction target found') ||
      message.includes('has only') ||
      message.includes('one at a time') ||
      message.includes('already complete') ||
      message.includes('Exactly one travel target is required') ||
      message.includes('No active owned march found') ||
      message.includes('already arrived') ||
      message.includes('invalid timing data') ||
      message.includes('already completed its return') ||
      message.includes('No active owned probe found') ||
      message.includes('already reached its target') ||
      message.includes('probeId is required') ||
      message.includes('already full');
    if (isUserError) {
      res.status(400).json({ error: message });
      return;
    }
    console.error('POST /api/bug-hunt/storage/use error:', error);
    res.status(500).json({ error: message });
  } finally {
    session.endSession();
  }
});

export default router;
