import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth';
import { MapService } from '../services/MapService';
import { ShieldService } from '../services/ShieldService';
import { Map as MapModel } from '../models/Map';
import { MapCell } from '../models/MapCell';
import { User } from '../models/User';
import {
  usesMapCells,
  getCellsForMap,
  getCell,
  findHouseForUser,
  placeUserHouse,
  clearYouMarkersForUser,
  setPlayerPosition,
  updateCell,
  moveUserHouseToCell,
} from '../services/CellAccessorService';
import { accrueBalanceToTime } from '../utils/balanceAccrual';
import { MOVE_PROPERTY_COST } from '../../../shared/movePropertyCost';
import { NPCService } from '../services/NPCService';
import { MapChatMessage } from '../models/MapChatMessage';
import { filterBadWords } from '../utils/contentModeration';
import { getAdminUserIds } from '../config/env';
import { dedupCellsByCoord } from '../utils/mapCellUtils';

const router: Router = express.Router();
const mapService = new MapService();

// Rate limit for map chat POST: per user per map, max 10 messages per 60s to prevent spam/abuse (Bugbot).
// Evict expired entries on each POST so the Map stays bounded (Bugbot: keys for users who stop posting are never revisited otherwise).
const MAP_CHAT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAP_CHAT_RATE_LIMIT_MAX = 10;
const mapChatRateLimit = new Map<string, { count: number; windowStartMs: number }>();

function evictExpiredMapChatRateLimitEntries(nowMs: number): void {
  for (const [key, val] of mapChatRateLimit.entries()) {
    if (nowMs - val.windowStartMs >= MAP_CHAT_RATE_LIMIT_WINDOW_MS) {
      mapChatRateLimit.delete(key);
    }
  }
}

/** userLevelAssociation (DB) → display level 1–21 shown on map. Levels 9–21 use 40,45,…,99. Single source of truth; SORTED_DB_LEVELS derived once (Bugbot: avoid recomputing sort on every fallback call). */
const DISPLAY_LEVEL_MAPPING: { [key: number]: number } = {
  1: 1, 5: 2, 10: 3, 15: 4, 20: 5, 25: 6, 30: 7, 35: 8, 40: 9, 45: 10,
  50: 11, 55: 12, 60: 13, 65: 14, 70: 15, 75: 16, 80: 17, 85: 18, 90: 19, 95: 20, 99: 21,
};
const SORTED_DB_LEVELS = Object.keys(DISPLAY_LEVEL_MAPPING).map(Number).sort((a, b) => a - b);

function getDisplayLevel(userLevelAssociation: number): number {
  const exact = DISPLAY_LEVEL_MAPPING[userLevelAssociation];
  if (typeof exact === 'number') return exact;
  // Bugbot: Unmapped DB levels (e.g. 37, 42) — use display level of largest mapped DB level <= input; clamp to 1–21.
  if (userLevelAssociation < SORTED_DB_LEVELS[0]) return 1;
  if (userLevelAssociation >= SORTED_DB_LEVELS[SORTED_DB_LEVELS.length - 1]) return 21;
  let largestLeq = SORTED_DB_LEVELS[0];
  for (const db of SORTED_DB_LEVELS) {
    if (db > userLevelAssociation) break;
    largestLeq = db;
  }
  return DISPLAY_LEVEL_MAPPING[largestLeq];
}

// Map name used by World Chat; only this name may be auto-created if missing so chat works on fresh environments (Bugbot).
const MAP_CHAT_ALLOWED_AUTO_CREATE_NAME = 'main';

// Serialize bootstrap per map name so concurrent first requests don't race in generateMap (Bugbot: non-atomic chat map bootstrap).
const mapBootstrapChains = new Map<string, Promise<void>>();

async function ensureMapExistsForChat(mapName: string): Promise<void> {
  const run = async (): Promise<void> => {
    const exists = await MapModel.exists({ name: mapName });
    if (!exists) await mapService.generateMap(mapName);
    // Do not swallow errors: bootstrap failures must surface as 500, not 400 Invalid map name (Bugbot).
  };
  let chain = mapBootstrapChains.get(mapName);
  if (!chain) {
    chain = Promise.resolve();
    mapBootstrapChains.set(mapName, chain);
  }
  const next = chain.then(() => run());
  mapBootstrapChains.set(mapName, next);
  // On rejection, clear chain so next request can retry; otherwise rejected promise blocks bootstrap until restart (Bugbot).
  await next.catch((err) => {
    mapBootstrapChains.delete(mapName);
    throw err;
  });
}

// Map chat (world chat) - MUST be before /:name to avoid route conflict
// Visibility is gated by user.unlockedFeatures.hackRig; only users who have unlocked the hack rig can read/send.
// Restrict mapName to existing maps (or main: create on first use) to prevent storage abuse via arbitrary names (Bugbot).
router.get('/:mapName/chat-messages', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { mapName } = req.params;
    if (!mapName || typeof mapName !== 'string' || mapName.trim().length === 0) {
      res.status(400).json({ error: 'Valid map name is required' });
      return;
    }
    const normalizedMapName = mapName.trim();

    const user = await User.findById(userId).select('unlockedFeatures blockedUserIds').lean();
    if (!user?.unlockedFeatures?.hackRig) {
      res.status(403).json({ error: 'Hack rig must be unlocked to access world chat' });
      return;
    }

    let mapExists = await MapModel.exists({ name: normalizedMapName });
    if (!mapExists) {
      if (normalizedMapName === MAP_CHAT_ALLOWED_AUTO_CREATE_NAME) {
        await ensureMapExistsForChat(normalizedMapName);
        mapExists = await MapModel.exists({ name: normalizedMapName });
      }
      if (!mapExists) {
        res.status(400).json({ error: 'Invalid map name' });
        return;
      }
    }

    const messages = await MapChatMessage.find({ mapName: normalizedMapName })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    messages.reverse();

    const blockedSet = new Set((user.blockedUserIds || []).map((id: unknown) => String(id)));
    const adminIds = getAdminUserIds();
    const formattedMessages = messages
      .filter((msg: any) => !blockedSet.has(String(msg.userId)))
      .map((msg: any) => ({
        id: String(msg._id),
        userId: String(msg.userId),
        username: msg.username,
        message: msg.message,
        timestamp: msg.createdAt,
        isFromAdmin: adminIds.some((id) => id.toString() === String(msg.userId)),
      }));

    res.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error: any) {
    console.error('Error fetching map chat messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface SendMapChatMessageRequest extends Request {
  body: {
    message: string;
  };
}

// Same map validation as GET: existing map or auto-create main only (Bugbot).
router.post('/:mapName/chat-messages', auth, async (req: SendMapChatMessageRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { mapName } = req.params;
    if (!mapName || typeof mapName !== 'string' || mapName.trim().length === 0) {
      res.status(400).json({ error: 'Valid map name is required' });
      return;
    }
    const normalizedMapName = mapName.trim();

    const user = await User.findById(userId).select('handle unlockedFeatures').lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!user.unlockedFeatures?.hackRig) {
      res.status(403).json({ error: 'Hack rig must be unlocked to send world chat messages' });
      return;
    }

    let mapExists = await MapModel.exists({ name: normalizedMapName });
    if (!mapExists) {
      if (normalizedMapName === MAP_CHAT_ALLOWED_AUTO_CREATE_NAME) {
        await ensureMapExistsForChat(normalizedMapName);
        mapExists = await MapModel.exists({ name: normalizedMapName });
      }
      if (!mapExists) {
        res.status(400).json({ error: 'Invalid map name' });
        return;
      }
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }
    if (trimmedMessage.length > 500) {
      res.status(400).json({ error: 'Message must be 500 characters or less' });
      return;
    }

    const rateLimitKey = `${userId}:${normalizedMapName}`;
    const nowMs = Date.now();
    evictExpiredMapChatRateLimitEntries(nowMs);
    const entry = mapChatRateLimit.get(rateLimitKey);
    if (entry) {
      if (nowMs - entry.windowStartMs >= MAP_CHAT_RATE_LIMIT_WINDOW_MS) {
        mapChatRateLimit.delete(rateLimitKey);
      } else if (entry.count >= MAP_CHAT_RATE_LIMIT_MAX) {
        res.status(429).json({
          error: 'Too many messages. Please wait a moment before sending again.',
        });
        return;
      }
    }

    // Reserve slot before any await so concurrent requests cannot bypass the limit (Bugbot).
    const entryToIncrement = mapChatRateLimit.get(rateLimitKey);
    if (!entryToIncrement) {
      mapChatRateLimit.set(rateLimitKey, { count: 1, windowStartMs: nowMs });
    } else {
      entryToIncrement.count += 1;
    }

    let chatMessage: InstanceType<typeof MapChatMessage>;
    try {
      const filteredMessage = filterBadWords(trimmedMessage);

      chatMessage = new MapChatMessage({
        mapName: normalizedMapName,
        userId,
        username: user.handle || 'Unknown',
        message: filteredMessage,
        originalMessage: trimmedMessage,
      });

      await chatMessage.save();
    } catch (saveError: any) {
      // Refund only when save (or pre-save) failed; do not refund if save succeeded and post-save steps fail (Bugbot).
      const entry = mapChatRateLimit.get(rateLimitKey);
      if (entry) {
        entry.count -= 1;
        if (entry.count <= 0) mapChatRateLimit.delete(rateLimitKey);
      }
      throw saveError;
    }

    const totalMessages = await MapChatMessage.countDocuments({ mapName: normalizedMapName });
    if (totalMessages > 100) {
      const cutoff = await MapChatMessage.findOne(
        { mapName: normalizedMapName },
        { createdAt: 1, _id: 1 },
        { sort: { createdAt: -1, _id: -1 }, skip: 99, lean: true }
      );
      if (cutoff) {
        await MapChatMessage.deleteMany({
          mapName: normalizedMapName,
          $or: [
            { createdAt: { $lt: cutoff.createdAt } },
            { createdAt: cutoff.createdAt, _id: { $lt: cutoff._id } },
          ],
        });
      }
    }

    const adminIds = getAdminUserIds();
    const isFromAdmin = adminIds.some((id) => id.toString() === String(userId));
    res.json({
      success: true,
      message: {
        id: (chatMessage._id as mongoose.Types.ObjectId).toString(),
        userId: (chatMessage.userId as mongoose.Types.ObjectId).toString(),
        username: chatMessage.username,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt,
        isFromAdmin,
      },
    });
  } catch (error: any) {
    console.error('Error sending map chat message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Parse viewport params once (used to skip expensive placement for viewport-only requests)
function parseViewportFromRequest(req: Request): { hasViewport: boolean; x1: number; y1: number; x2: number; y2: number } {
  const parse = (param: any): number | undefined => {
    if (param === undefined || param === null) return undefined;
    const parsed = parseInt(param as string, 10);
    return isNaN(parsed) ? undefined : parsed;
  };
  const x1 = parse(req.query.x1);
  const y1 = parse(req.query.y1);
  const x2 = parse(req.query.x2);
  const y2 = parse(req.query.y2);
  const hasViewport = x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined;
  return { hasViewport, x1: x1 ?? 0, y1: y1 ?? 0, x2: x2 ?? 0, y2: y2 ?? 0 };
}

// GET my-position and POST player-position MUST be before /:name so /api/map/my-position is not matched as name='my-position' (user-position-and-locator.md)
// GET current user's house position on the map (for centering and locator; does not depend on viewport).
// If the user has no house (e.g. viewport-only load never ran placement), place them once and return that position.
router.get('/my-position', auth, async (req: Request, res: Response) => {
  try {
    const authUserId: any = (req as any).user?._id;
    if (!authUserId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const mapDoc = await MapModel.findOne({ name: 'main' });
    if (!mapDoc) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }

    let house = await findHouseForUser(mapDoc, authUserId);
    if (house) {
      res.json({ x: house.x, y: house.y });
      return;
    }

    const user = await User.findById(authUserId, { handle: 1 });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const handle = (user as any).handle || 'User';
    const placed = await placeUserHouse(mapDoc, authUserId, handle);
    if (placed) {
      res.json({ x: placed.x, y: placed.y });
      return;
    }
    // Bugbot: Re-fetch map so fallback findHouseForUser sees concurrent placement (embedded path reads mapDoc.cells; stale doc would miss it).
    const freshMapDoc = await MapModel.findOne({ name: 'main' });
    house = freshMapDoc ? await findHouseForUser(freshMapDoc, authUserId) : null;
    if (house) {
      res.json({ x: house.x, y: house.y });
      return;
    }
    res.status(503).json({ error: 'Map full; no empty cell for placement' });
  } catch (error: any) {
    console.error('My position fetch error:', error);
    // Bugbot: MapCell placeUserHouse throws on placement failure; embedded returns null. Return same status and message for "map full" so clients get consistent 503.
    const msg = error?.message ?? '';
    const isPlacementFailure = msg.includes('placeUserHouse') && (msg.includes('no empty cells') || msg.includes('could not place after max attempts'));
    if (isPlacementFailure) {
      res.status(503).json({ error: 'Map full; no empty cell for placement' });
      return;
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/player-position', auth, async (req: Request, res: Response) => {
  try {
    const { x, y } = req.body as { x: number; y: number };
    if (typeof x !== 'number' || typeof y !== 'number') {
      res.status(400).json({ error: 'Invalid coordinates' });
      return;
    }

    let mapDoc = await MapModel.findOne({ name: 'main' });
    if (!mapDoc) {
      const created = await mapService.generateMap('main');
      mapDoc = await MapModel.findOne({ name: 'main' });
      if (!mapDoc && created) {
        mapDoc = created as any;
      }
    }

    if (!mapDoc) {
      res.status(500).json({ error: 'Failed to load map' });
      return;
    }

    const authUserId: any = (req as any).user?._id;

    // Bugbot: Validate target cell before clearing YOU markers so MapCell path doesn't commit delete on validation failure.
    const target = await getCell(mapDoc, x, y);
    if (!target) {
      res.status(404).json({ error: 'Target cell not found' });
      return;
    }
    if (!target.canBeOccupied || target.terrain === 'mountain' || target.terrain === 'water' || target.terrain === 'road') {
      res.status(400).json({ error: 'Cell cannot be occupied' });
      return;
    }
    if (target.isOccupied) {
      // Allow re-place at user's own YOU marker (clear + set same cell); otherwise cell is taken by someone else.
      // Bugbot: Re-place at same cell works for MapCell: we clear YOU markers first (in same transaction), then setPlayerPosition runs so the cell is already empty when updateOne runs.
      const isOwnYouMarker =
        target.occupiedBy === 'player' &&
        target.entityName === 'YOU' &&
        target.userId &&
        String(target.userId) === String(authUserId);
      if (!isOwnYouMarker) {
        res.status(400).json({ error: 'Cell already occupied' });
        return;
      }
    }

    // Bugbot: For MapCell maps, clear+set in one transaction so concurrent position updates cannot leave two YOU markers or overwrite without detection.
    // Bugbot: If setPlayerPosition returns false (e.g. cell taken concurrently), throw so the transaction aborts; otherwise we would commit clearYouMarkersForUser and leave the user with no YOU marker.
    let updated: boolean;
    if (usesMapCells(mapDoc)) {
      const session = await mongoose.startSession();
      try {
        updated = await session.withTransaction(async () => {
          await clearYouMarkersForUser(mapDoc, authUserId, session);
          const ok = await setPlayerPosition(mapDoc, x, y, authUserId, 'YOU', session);
          if (!ok) throw new Error('Failed to update position');
          return true;
        });
      } finally {
        await session.endSession();
      }
    } else {
      await clearYouMarkersForUser(mapDoc, authUserId);
      updated = await setPlayerPosition(mapDoc, x, y, authUserId, 'YOU');
    }
    // Bugbot: We always check setPlayerPosition's return value; never send success when placement failed (avoids client/server desync).
    if (!updated) {
      res.status(500).json({ error: 'Failed to update position' });
      return;
    }
    if (!usesMapCells(mapDoc)) {
      (mapDoc as any).markModified('cells');
      await (mapDoc as any).save();
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Player position update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST move-property MUST be before /:name (same as my-position / player-position).
router.post('/move-property', auth, async (req: Request, res: Response) => {
  try {
    const authUserId: any = (req as any).user?._id;
    if (!authUserId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { x: rawX, y: rawY } = req.body as { x: unknown; y: unknown };
    if (typeof rawX !== 'number' || typeof rawY !== 'number' || !Number.isInteger(rawX) || !Number.isInteger(rawY)) {
      res.status(400).json({ error: 'Invalid coordinates' });
      return;
    }
    const x = rawX;
    const y = rawY;

    const mapDoc = await MapModel.findOne({ name: 'main' });
    if (!mapDoc) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }

    if (!usesMapCells(mapDoc)) {
      res.status(503).json({ error: 'Property move is not available for this map layout' });
      return;
    }

    const target = await getCell(mapDoc, x, y);
    if (!target) {
      res.status(404).json({ error: 'Target cell not found' });
      return;
    }
    if (!target.canBeOccupied || target.terrain === 'mountain' || target.terrain === 'water' || target.terrain === 'road') {
      res.status(400).json({ error: 'Cell cannot be occupied' });
      return;
    }

    const authUserIdObj = authUserId as mongoose.Types.ObjectId;
    const house = await findHouseForUser(mapDoc, authUserIdObj);
    if (!house) {
      res.status(400).json({ error: 'No property on the map to move' });
      return;
    }
    if (house.x === x && house.y === y) {
      res.status(400).json({ error: 'Property is already at this location' });
      return;
    }

    if (target.isOccupied) {
      const isOwnYou =
        target.occupiedBy === 'player' &&
        target.entityName === 'YOU' &&
        target.userId &&
        String(target.userId) === String(authUserId);
      if (!isOwnYou) {
        res.status(400).json({ error: 'Cell already occupied' });
        return;
      }
    }

    const user = await User.findById(authUserId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const handle = (user as any).handle || 'User';
    const now = new Date();
    const accrued = accrueBalanceToTime(
      user.balance.total,
      user.balance.ratePerSecond,
      user.balance.lastUpdated,
      user.balance.fractionalRemainder ?? 0,
      now
    );

    if (accrued.total < MOVE_PROPERTY_COST) {
      res.status(400).json({
        error: `Insufficient funds — $${MOVE_PROPERTY_COST.toLocaleString()} required to move property.`,
        costRequired: MOVE_PROPERTY_COST,
        currentBalance: accrued.total,
      });
      return;
    }

    const newBalance = accrued.total - MOVE_PROPERTY_COST;
    const frRead = user.balance.fractionalRemainder ?? 0;
    const fractionalFingerprint =
      frRead === 0
        ? {
            $or: [
              { 'balance.fractionalRemainder': 0 },
              { 'balance.fractionalRemainder': null },
              { 'balance.fractionalRemainder': { $exists: false } },
            ],
          }
        : { 'balance.fractionalRemainder': frRead };

    const session = await mongoose.startSession();
    let responseNewBalance: number;
    try {
      await session.withTransaction(async () => {
        const updated = await User.findOneAndUpdate(
          {
            _id: authUserId,
            $and: [
              {
                'balance.total': user.balance.total,
                'balance.ratePerSecond': user.balance.ratePerSecond,
                'balance.lastUpdated': user.balance.lastUpdated,
              },
              fractionalFingerprint,
            ],
          },
          {
            $set: {
              'balance.total': newBalance,
              'balance.fractionalRemainder': accrued.fractionalRemainder,
              'balance.lastUpdated': accrued.lastUpdated,
            },
          },
          { session, new: true }
        );

        if (!updated) {
          const err = new Error('BALANCE_CONFLICT');
          (err as any).code = 'BALANCE_CONFLICT';
          throw err;
        }

        await moveUserHouseToCell(mapDoc, authUserIdObj, handle, x, y, session);
        responseNewBalance = updated.balance.total;
      });
    } catch (err: any) {
      if (err?.code === 'BALANCE_CONFLICT' || err?.message === 'BALANCE_CONFLICT') {
        res.status(409).json({ error: 'Balance changed. Please try again.' });
        return;
      }
      if (err?.code === 'MOVE_TARGET_UNAVAILABLE' || err?.message === 'MOVE_TARGET_UNAVAILABLE') {
        res.status(409).json({ error: 'That tile is no longer available. Try again.' });
        return;
      }
      if (err?.code === 11000 || err?.codeName === 'DuplicateKey') {
        res.status(409).json({ error: 'That tile is no longer available. Try again.' });
        return;
      }
      throw err;
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      x,
      y,
      newBalance: responseNewBalance!,
    });
  } catch (error: any) {
    console.error('Move property error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:name', async (req: Request, res: Response) => {
  try {
    const name = req.params.name;
    const viewportEarly = parseViewportFromRequest(req);
    let mapDoc = await MapModel.findOne({ name });
    if (!mapDoc) {
      // Drop legacy unique index so insert can succeed (E11000); per-doc uniqueness enforced in app (user-position-and-locator.md)
      try {
        await MapModel.collection.dropIndex('cells.x_1_cells.y_1');
      } catch (_) {
        // Index may not exist or already dropped
      }
      const created = await mapService.generateMap(name);
      mapDoc = (created as any) || await MapModel.findOne({ name });
    }

    if (!mapDoc) {
      res.status(500).json({ error: 'Failed to load map' });
      return;
    }

    // Viewport requests: skip loading all users and the per-user placement loop (hundreds of DB round-trips).
    // Placement runs only for full-map requests so new users get a house; viewport just returns tiles.
    const users = viewportEarly.hasViewport
      ? []
      : await User.find({}, { _id: 1, handle: 1, antivirusShield: 1 });

    // Migrate old maps: enforce version >=2 and gridSize 50 or 500 (expanded map), friendly cleanup, and placement rules.
    // Never delete/recreate a 500×500 map (Phase 1 expanded); only set version if missing so it is not re-migrated.
    const docAny = mapDoc as any;
    // Bugbot: Do not assume missing gridSize means 500×500. Old 50×50 maps may have no gridSize; treating undefined as 500 would set gridSize:500 and usesMapCells→true while MapCell collection is empty, breaking the map. Only treat as expanded when gridSize is explicitly 500.
    const validGridSize = docAny.gridSize === 50 || docAny.gridSize === 500;
    const isExpandedMap = docAny.gridSize === 500;
    const needsVersionBump = !docAny.version || docAny.version < 2;
    // Bugbot: needsMigration = delete/recreate only when gridSize is invalid. Valid 50×50 or 500×500 with old version get version bump only (never delete).
    const needsMigration = !validGridSize;
    if (isExpandedMap && needsVersionBump) {
      // Only set version and gridSize; never delete/recreate a 500×500 map. Persist gridSize so cell access and route use same value (Bugbot: avoid split-brain).
      await MapModel.updateOne(
        { _id: docAny._id },
        { $set: { version: 2, gridSize: 500, lastUpdated: new Date() } }
      );
      mapDoc = (await MapModel.findOne({ name })) as any;
    } else if (docAny.gridSize === 50 && needsVersionBump) {
      // Valid 50×50 with old version: version bump only; never delete/recreate (preserve existing cells).
      await MapModel.updateOne(
        { _id: docAny._id },
        { $set: { version: 2, lastUpdated: new Date() } }
      );
      mapDoc = (await MapModel.findOne({ name })) as any;
    } else if (needsMigration) {
      // Invalid or missing gridSize only: delete/recreate. Never for valid 50×50 or 500×500 (handled above).
      // Bugbot: Delete MapCell then map doc in one transaction so we never leave a zombie map (map doc without cells) if deleteOne fails.
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await MapCell.deleteMany({ mapId: docAny._id }, { session });
          await MapModel.deleteOne({ _id: docAny._id }, { session });
        });
      } finally {
        await session.endSession();
      }
      try {
        await MapModel.collection.dropIndex('cells.x_1_cells.y_1');
      } catch (_) {}
      const recreated = await mapService.generateMap(name);
      mapDoc = (recreated as any) || await MapModel.findOne({ name });
      if (!mapDoc) {
        res.status(500).json({ error: 'Failed to build map' });
        return;
      }
    } else if (!viewportEarly.hasViewport && !usesMapCells(mapDoc)) {
      // Full-map only (and only for embedded 50×50): validate and normalize map (dedup, cleanup, placement). Skip for mapcells (500×500) which requires viewport.
      let cells: any[] = Array.isArray((mapDoc as any).cells) ? Array.from((mapDoc as any).cells) : [];
      // Fix E11000 duplicate key: shared dedupe (mapCellUtils) prefers occupied over empty, stronger occupancy when both occupied (Bugbot).
      const deduped = dedupCellsByCoord(cells);
      if (deduped.length !== cells.length) {
        const updated = await MapModel.findOneAndUpdate(
          { _id: (mapDoc as any)._id },
          { $set: { cells: deduped } },
          { new: true }
        );
        if (updated) {
          mapDoc = updated as any;
          cells = Array.isArray((mapDoc as any).cells) ? Array.from((mapDoc as any).cells) : [];
        }
      }
      const isBlocked = (c: any) => c.terrain === 'water' || c.terrain === 'mountain' || c.terrain === 'road';
      // Build cleaned cells via copy so we persist with findOneAndUpdate (never save()), avoiding re-persisting duplicates (Bugbot).
      const cleanedCells = cells.map((c: any) => {
        const copy = { ...c };
        if (copy.isOccupied && isBlocked(copy)) {
          copy.isOccupied = false;
          copy.occupiedBy = 'none';
          copy.entityName = '';
          copy.userId = null;
        }
        if (copy.isOccupied && copy.occupiedBy === 'player' && !copy.userId) {
          copy.isOccupied = false;
          copy.occupiedBy = 'none';
          copy.entityName = '';
          copy.userId = null;
        }
        if (copy.isOccupied && copy.occupiedBy === 'player' && copy.entityName === 'YOU') {
          copy.isOccupied = false;
          copy.occupiedBy = 'none';
          copy.entityName = '';
          copy.userId = null;
        }
        return copy;
      });
      const needsCleanupPersist = cleanedCells.some((c: any, i: number) => {
        const o = cells[i];
        return o.isOccupied !== c.isOccupied || o.occupiedBy !== c.occupiedBy || o.entityName !== c.entityName || (o.userId !== c.userId && (o.userId != null || c.userId != null));
      });
      if (needsCleanupPersist) {
        const updated = await MapModel.findOneAndUpdate(
          { _id: (mapDoc as any)._id },
          { $set: { cells: cleanedCells } },
          { new: true }
        );
        if (updated) {
          mapDoc = updated as any;
          cells = Array.isArray((mapDoc as any).cells) ? Array.from((mapDoc as any).cells) : cleanedCells;
        } else {
          cells = cleanedCells;
        }
      }

      // Per-user house placement: only for full-map requests. Viewport requests skip this (fast path).
      if (!viewportEarly.hasViewport && users.length > 0) {
        const terrainIsValid = (cc: any) => !cc.isOccupied && cc.canBeOccupied && cc.terrain !== 'water' && cc.terrain !== 'mountain' && cc.terrain !== 'road';
        const pickValidCell = (): { x: number; y: number } | null => {
          let tries = 0;
          while (tries < 10000) {
            const idx = Math.floor(Math.random() * cells.length);
            const cc = cells[idx];
            if (terrainIsValid(cc)) {
              return { x: cc.x, y: cc.y };
            }
            tries++;
          }
          return null;
        };

        for (const u of users) {
          let attempts = 0;
          while (attempts < 10) {
            const candidate = pickValidCell();
            if (!candidate) break;
            const result = await MapModel.findOneAndUpdate(
              {
                _id: (mapDoc as any)._id,
                cells: { $not: { $elemMatch: { userId: (u as any)._id, occupiedBy: 'player', entityName: { $ne: 'YOU' } } } },
                $and: [
                  {
                    cells: {
                      $elemMatch: {
                        x: candidate.x,
                        y: candidate.y,
                        isOccupied: false,
                        canBeOccupied: true,
                        terrain: { $nin: ['water', 'mountain', 'road'] },
                      },
                    },
                  },
                ],
              } as any,
              {
                $set: {
                  'cells.$.isOccupied': true,
                  'cells.$.occupiedBy': 'player',
                  'cells.$.entityName': (u as any).handle,
                  'cells.$.userId': (u as any)._id,
                },
              },
              { new: false }
            );
            if (result) break;
            attempts++;
          }
        }

        mapDoc = await MapModel.findOne({ name });
      }
    }

    const gridSize = (mapDoc as any).gridSize ?? 500;
    const hasViewport = viewportEarly.hasViewport;
    if (gridSize === 500 && !hasViewport) {
      res.status(400).json({ error: 'Viewport required for large map' });
      return;
    }

    let viewportX1 = 0;
    let viewportY1 = 0;
    let viewportX2 = gridSize - 1;
    let viewportY2 = gridSize - 1;
    if (hasViewport) {
      const minX = Math.min(viewportEarly.x1, viewportEarly.x2);
      const maxX = Math.max(viewportEarly.x1, viewportEarly.x2);
      const minY = Math.min(viewportEarly.y1, viewportEarly.y2);
      const maxY = Math.max(viewportEarly.y1, viewportEarly.y2);
      viewportX1 = Math.max(0, Math.min(minX, gridSize - 1));
      viewportY1 = Math.max(0, Math.min(minY, gridSize - 1));
      viewportX2 = Math.min(gridSize - 1, Math.max(maxX, 0));
      viewportY2 = Math.min(gridSize - 1, Math.max(maxY, 0));
    }

    const viewportForFetch = hasViewport
      ? { x1: viewportX1, y1: viewportY1, x2: viewportX2, y2: viewportY2 }
      : undefined;
    const cells: any[] = usesMapCells(mapDoc)
      ? await getCellsForMap(mapDoc, viewportForFetch)
      : (Array.isArray((mapDoc as any).cells) ? Array.from((mapDoc as any).cells) : []);

    const userIdsInMap = new Set<string>();
    cells.forEach((c: any) => {
      if (c.occupiedBy === 'player' && c.userId) {
        userIdsInMap.add(String(c.userId));
      }
    });

    const viewportCells = hasViewport
      ? cells.filter(
          (c: any) =>
            c.x >= viewportX1 && c.x <= viewportX2 &&
            c.y >= viewportY1 && c.y <= viewportY2
        )
      : cells;
    
    // Phase 3B: Use optimized user query - only query users with houses
    // For viewport: filter to users in viewport, for full map: use all users with houses
    const userIdsInViewport = new Set<string>();
    viewportCells.forEach((c: any) => {
      if (c.occupiedBy === 'player' && c.userId) {
        userIdsInViewport.add(String(c.userId));
      }
    });
    
    // Only query users who have houses (optimized from querying all users)
    const usersToQuery = hasViewport
      ? await User.find({ _id: { $in: Array.from(userIdsInViewport) } }, { _id: 1, handle: 1, antivirusShield: 1 })
      : await User.find({ _id: { $in: Array.from(userIdsInMap) } }, { _id: 1, handle: 1, antivirusShield: 1 });
    
    // Viewport requests: build only viewport-sized grid (fast, small payload). Full-map: build gridSize×gridSize.
    const viewportRows = hasViewport ? viewportY2 - viewportY1 + 1 : gridSize;
    const viewportCols = hasViewport ? viewportX2 - viewportX1 + 1 : gridSize;
    const emptyGrid = Array.from({ length: viewportRows }, () =>
      Array.from({ length: viewportCols }, () => ({ terrain: 'plain', entity: 'empty' }))
    );
    let mutated = false;
    /** Only cells we synthesized npcInstanceId for (Bugbot: persist only these, not every NPC in viewport). */
    const synthesizedNpcInstanceIds: { x: number; y: number; npcInstanceId: string }[] = [];

    const shieldStatusMap = await ShieldService.checkAndUpdateMultipleShieldStatuses(usersToQuery);

    const userMap = new Map();
    usersToQuery.forEach((user: any) => {
      userMap.set(String(user._id), user);
    });
    const allNPCs = await NPCService.getAllNPCs();
    const npcLevelMap = new Map<string, number>();
    for (const npc of allNPCs) {
      // Bugbot: Only call getDisplayLevel when userLevelAssociation is a valid number; undefined/null/NaN would yield wrong display level (e.g. 21).
      const level = npc.userLevelAssociation;
      if (npc.slug && typeof level === 'number' && !Number.isNaN(level)) {
        npcLevelMap.set(npc.slug, getDisplayLevel(level));
      }
    }
    const mapId = (mapDoc as any)._id;
    for (const c of viewportCells) {
      const y = c.y;
      const x = c.x;
      const rowIdx = hasViewport ? y - viewportY1 : y;
      const colIdx = hasViewport ? x - viewportX1 : x;
      const entity = c.isOccupied ? 'house' : 'empty';
      const owner = c.isOccupied ? (c.occupiedBy === 'player' ? 'player' : 'enemy') : undefined;
      // Send actual handle for player cells so clients see "Splatrat" etc.; client shows "YOU" only when name === current user's handle.
      const name = c.occupiedBy === 'player' && c.userId && userMap.get(String(c.userId))
        ? (userMap.get(String(c.userId)) as any).handle
        : (c.entityName || undefined);
      const npcSlug = c.occupiedBy === 'npc' ? (c.npcSlug || undefined) : undefined;
      const npcInstanceId = c.occupiedBy === 'npc' && npcSlug ? (c.npcInstanceId || `${npcSlug}-${x}-${y}`) : undefined;
      // Bugbot: Set mutated when we synthesize npcInstanceId so MapCells path can persist it (was only when !hasViewport, making updateCell loop dead).
      if (c.occupiedBy === 'npc' && npcSlug && !c.npcInstanceId) {
        const synthesized = `${npcSlug}-${x}-${y}`;
        c.npcInstanceId = synthesized;
        synthesizedNpcInstanceIds.push({ x, y, npcInstanceId: synthesized });
        mutated = true;
      }
      const npcLevel = c.occupiedBy === 'npc' && npcSlug ? (npcLevelMap.get(npcSlug) || 1) : undefined;
      let isShielded = false;
      if (c.occupiedBy === 'player' && c.userId) {
        isShielded = shieldStatusMap.get(String(c.userId)) || false;
      }
      emptyGrid[rowIdx][colIdx] = {
        terrain: c.terrain,
        entity,
        owner,
        name,
        userId: c.userId ? String(c.userId) : undefined,
        npcSlug,
        npcInstanceId,
        npcLevel,
        isShielded,
      } as any;
    }
    if (mutated) {
      if (usesMapCells(mapDoc)) {
        for (const { x, y, npcInstanceId } of synthesizedNpcInstanceIds) {
          await updateCell(mapId, x, y, { npcInstanceId });
        }
      } else if (!hasViewport) {
        // Bugbot: Only persist embedded cells when full-map path; viewport skips dedup/cleanup (lines 517–526), so save() here could persist duplicates. Concurrent viewport saves would also cause lost writes. Synthesized npcInstanceId is deterministic (npcSlug-x-y) so next request re-synthesizes the same value.
        (mapDoc as any).markModified('cells');
        await (mapDoc as any).save();
      }
    }
    // Bugbot: Always include gridSize so client never falls back to grid.length (viewport-sized grid would yield wrong pan bounds).
    if (hasViewport) {
      res.json({
        grid: emptyGrid,
        gridSize,
        viewport: { x1: viewportX1, y1: viewportY1, x2: viewportX2, y2: viewportY2 }
      });
    } else {
      res.json({ grid: emptyGrid, gridSize });
    }
  } catch (error: any) {
    console.error('Map fetch error:', error);
    res.status(500).json({ error: error?.message ?? 'Internal server error' });
  }
});

export default router;


