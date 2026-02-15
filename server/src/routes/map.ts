import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth';
import { MapService } from '../services/MapService';
import { ShieldService } from '../services/ShieldService';
import { Map as MapModel } from '../models/Map';
import { User } from '../models/User';
import { NPCService } from '../services/NPCService';
import { MapChatMessage } from '../models/MapChatMessage';
import { filterBadWords } from '../utils/contentModeration';

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

function getDisplayLevel(userLevelAssociation: number): number {
  const mapping: { [key: number]: number } = {
    1: 1,
    5: 2,
    10: 3,
    15: 4,
    20: 5,
    25: 6,
    30: 7,
    35: 8,
  };
  return mapping[userLevelAssociation] || 1;
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

    const user = await User.findById(userId).select('unlockedFeatures').lean();
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

    const formattedMessages = messages.map((msg: any) => ({
      id: String(msg._id),
      userId: String(msg.userId),
      username: msg.username,
      message: msg.message,
      timestamp: msg.createdAt,
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

    res.json({
      success: true,
      message: {
        id: (chatMessage._id as mongoose.Types.ObjectId).toString(),
        userId: (chatMessage.userId as mongoose.Types.ObjectId).toString(),
        username: chatMessage.username,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt,
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

    let mapDoc = await MapModel.findOne({ name: 'main' });
    if (!mapDoc) {
      res.status(404).json({ error: 'Map not found' });
      return;
    }

    const cells = (mapDoc as any).cells as any[];
    // Prefer the user's house (entityName !== 'YOU'); fallback to any player cell for this user (e.g. YOU marker)
    let house = cells.find(
      (c: any) =>
        c.occupiedBy === 'player' &&
        c.userId &&
        String(c.userId) === String(authUserId) &&
        c.entityName !== 'YOU'
    );
    if (!house) {
      house = cells.find(
        (c: any) =>
          c.occupiedBy === 'player' &&
          c.userId &&
          String(c.userId) === String(authUserId)
      );
    }
    if (!house) {
      // User has no house (e.g. viewport-only load never ran placement). Place them once.
      // Use findOneAndUpdate with positional $ to avoid full-doc save and E11000 duplicate key (cells array index).
      const user = await User.findById(authUserId, { handle: 1 });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const handle = (user as any).handle || 'User';
      const gridSize = (mapDoc as any).gridSize || 50;
      let tries = 0;
      while (tries < 500) {
        const candidateX = Math.floor(Math.random() * gridSize);
        const candidateY = Math.floor(Math.random() * gridSize);
        // Atomic duplicate-house guard: only place if user has no existing house (same as GET /:name placement).
        const updated = await MapModel.findOneAndUpdate(
          {
            name: 'main',
            $and: [
              { cells: { $not: { $elemMatch: { userId: authUserId, occupiedBy: 'player', entityName: { $ne: 'YOU' } } } } },
              {
                cells: {
                  $elemMatch: {
                    x: candidateX,
                    y: candidateY,
                    isOccupied: false,
                    canBeOccupied: true,
                    terrain: { $nin: ['water', 'mountain', 'road'] },
                  },
                },
              },
            ],
          },
          {
            $set: {
              'cells.$.isOccupied': true,
              'cells.$.occupiedBy': 'player',
              'cells.$.entityName': handle,
              'cells.$.userId': authUserId,
            },
          },
          { new: true }
        );
        if (updated) {
          res.json({ x: candidateX, y: candidateY });
          return;
        }
        tries++;
      }
      // Race: a concurrent request may have placed the user's house; re-check before 503 (Bugbot).
      const mapDocAgain = await MapModel.findOne({ name: 'main' });
      if (mapDocAgain) {
        const cellsAgain = (mapDocAgain as any).cells as any[];
        const houseNow =
          cellsAgain.find(
            (c: any) =>
              c.occupiedBy === 'player' &&
              c.userId &&
              String(c.userId) === String(authUserId) &&
              c.entityName !== 'YOU'
          ) ||
          cellsAgain.find(
            (c: any) =>
              c.occupiedBy === 'player' &&
              c.userId &&
              String(c.userId) === String(authUserId)
          );
        if (houseNow) {
          res.json({ x: houseNow.x, y: houseNow.y });
          return;
        }
      }
      res.status(503).json({ error: 'Map full; no empty cell for placement' });
      return;
    }

    res.json({ x: house.x, y: house.y });
  } catch (error: any) {
    console.error('My position fetch error:', error);
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
    for (const c of (mapDoc as any).cells as any[]) {
      // Only clear ephemeral 'YOU' markers for this user, or legacy invalid 'YOU' without userId
      const belongsToAuthUser = c.userId && String(c.userId) === String(authUserId);
      const legacyInvalidYou = c.entityName === 'YOU' && !c.userId;
      if (c.isOccupied && c.occupiedBy === 'player' && c.entityName === 'YOU' && (belongsToAuthUser || legacyInvalidYou)) {
        c.isOccupied = false;
        c.occupiedBy = 'none';
        c.entityName = '';
        c.userId = null;
      }
    }

    const target = (mapDoc.cells as any[]).find((c) => c.x === x && c.y === y);
    if (!target) {
      res.status(404).json({ error: 'Target cell not found' });
      return;
    }
    if (!target.canBeOccupied || target.terrain === 'mountain' || target.terrain === 'water' || target.terrain === 'road') {
      res.status(400).json({ error: 'Cell cannot be occupied' });
      return;
    }
    if (target.isOccupied) {
      res.status(400).json({ error: 'Cell already occupied' });
      return;
    }

    target.isOccupied = true;
    target.occupiedBy = 'player';
    target.entityName = 'YOU';
    target.userId = authUserId;

    await mapDoc.save();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Player position update error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:name', async (req: Request, res: Response) => {
  try {
    const name = req.params.name;
    let mapDoc = await MapModel.findOne({ name });
    if (!mapDoc) {
      console.log('[map fetch] no map found for', name, '- dropping legacy index if present and generating');
      // Drop legacy unique index so insert can succeed (E11000); per-doc uniqueness enforced in app (user-position-and-locator.md)
      try {
        await MapModel.collection.dropIndex('cells.x_1_cells.y_1');
        console.log('[map fetch] dropped legacy unique index cells.x_1_cells.y_1');
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

    const viewportEarly = parseViewportFromRequest(req);
    // Viewport requests: skip loading all users and the per-user placement loop (hundreds of DB round-trips).
    // Placement runs only for full-map requests so new users get a house; viewport just returns tiles.
    const users = viewportEarly.hasViewport
      ? []
      : await User.find({}, { _id: 1, handle: 1, antivirusShield: 1 });

    // Migrate old maps: enforce version >=2 and gridSize 50, friendly cleanup, and placement rules
    const docAny = mapDoc as any;
    if (!docAny.version || docAny.version < 2 || docAny.gridSize !== 50) {
      await MapModel.deleteOne({ _id: docAny._id });
      try {
        await MapModel.collection.dropIndex('cells.x_1_cells.y_1');
        console.log('[map fetch] dropped legacy unique index cells.x_1_cells.y_1 (migrate path)');
      } catch (_) {}
      const recreated = await mapService.generateMap(name);
      mapDoc = (recreated as any) || await MapModel.findOne({ name });
      if (!mapDoc) {
        res.status(500).json({ error: 'Failed to build map' });
        return;
      }
    } else {
      // Validate and normalize map: ensure per-user homes exist and no blocked occupied cells
      let cells: any[] = Array.isArray((mapDoc as any).cells) ? Array.from((mapDoc as any).cells) : [];
      // Fix E11000 duplicate key: dedupe cells by (x,y), preferring occupied over empty to avoid losing player houses (Bugbot).
      const cellByKey = new Map<string, any>();
      for (const c of cells) {
        const key = `${c.x},${c.y}`;
        const existing = cellByKey.get(key);
        if (!existing) {
          cellByKey.set(key, c);
        } else if (c.isOccupied && !existing.isOccupied) {
          cellByKey.set(key, c);
        }
      }
      const deduped = Array.from(cellByKey.values());
      if (deduped.length !== cells.length) {
        console.log('[map fetch] deduping cells', cells.length, '->', deduped.length);
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

    const gridSize = (mapDoc as any).gridSize || 50;
    
    // Phase 3B: After migration, extract cells and userIds for optimized user query
    const cells = (mapDoc as any).cells as any[];
    
    // Extract userIds from all cells (for full map optimization)
    const userIdsInMap = new Set<string>();
    cells.forEach((c: any) => {
      if (c.occupiedBy === 'player' && c.userId) {
        userIdsInMap.add(String(c.userId));
      }
    });
    
    const hasViewport = viewportEarly.hasViewport;
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
    
    const viewportCells = hasViewport 
      ? cells.filter((c: any) => 
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
    
    const emptyGrid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => ({ terrain: 'plain', entity: 'empty' }))
    );
    let mutated = false;
    
    const shieldStatusMap = await ShieldService.checkAndUpdateMultipleShieldStatuses(usersToQuery);
    
    const userMap = new Map();
    usersToQuery.forEach((user: any) => {
      userMap.set(String(user._id), user);
    });
    
    const allNPCs = await NPCService.getAllNPCs();
    const npcLevelMap = new Map<string, number>();
    for (const npc of allNPCs) {
      if (npc.slug && npc.userLevelAssociation) {
        npcLevelMap.set(npc.slug, getDisplayLevel(npc.userLevelAssociation));
      }
    }
    
    for (const c of viewportCells) {
      const y = c.y;
      const x = c.x;
      const entity = c.isOccupied ? 'house' : 'empty';
      const owner = c.isOccupied ? (c.occupiedBy === 'player' ? 'player' : 'enemy') : undefined;
      const name = c.entityName || undefined;
      const npcSlug = c.occupiedBy === 'npc' ? (c.npcSlug || undefined) : undefined;
      if (c.occupiedBy === 'npc' && npcSlug && !c.npcInstanceId) {
        c.npcInstanceId = `${npcSlug}-${x}-${y}`;
        mutated = true;
      }
      const npcInstanceId = c.occupiedBy === 'npc' ? (c.npcInstanceId || undefined) : undefined;
      const npcLevel = c.occupiedBy === 'npc' && npcSlug ? (npcLevelMap.get(npcSlug) || 1) : undefined;
      
      let isShielded = false;
      if (c.occupiedBy === 'player' && c.userId) {
        isShielded = shieldStatusMap.get(String(c.userId)) || false;
      }
      
      emptyGrid[y][x] = {
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
      (mapDoc as any).markModified('cells');
      await (mapDoc as any).save();
    }

    if (hasViewport) {
      res.json({ 
        grid: emptyGrid,
        viewport: { x1: viewportX1, y1: viewportY1, x2: viewportX2, y2: viewportY2 }
      });
    } else {
      res.json({ grid: emptyGrid });
    }
  } catch (error: any) {
    console.error('Map fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


