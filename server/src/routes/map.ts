import express, { Request, Response, Router } from 'express';
import auth from '../middleware/auth';
import { MapService } from '../services/MapService';
import { ShieldService } from '../services/ShieldService';
import { Map as MapModel } from '../models/Map';
import { User } from '../models/User';
import { NPCService } from '../services/NPCService';

const router: Router = express.Router();
const mapService = new MapService();

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

router.get('/:name', async (req: Request, res: Response) => {
  try {
    const name = req.params.name;
    let mapDoc = await MapModel.findOne({ name });
    if (!mapDoc) {
      const created = await mapService.generateMap(name);
      mapDoc = (created as any) || await MapModel.findOne({ name });
    }

    if (!mapDoc) {
      res.status(500).json({ error: 'Failed to load map' });
      return;
    }

    // Get users data for shield status lookup
    const users = await User.find({}, { _id: 1, handle: 1, antivirusShield: 1 });

    // Migrate old maps: enforce version >=2 and gridSize 50, friendly cleanup, and placement rules
    const docAny = mapDoc as any;
    if (!docAny.version || docAny.version < 2 || docAny.gridSize !== 50) {
      await MapModel.deleteOne({ _id: docAny._id });
      const recreated = await mapService.generateMap(name);
      mapDoc = (recreated as any) || await MapModel.findOne({ name });
      if (!mapDoc) {
        res.status(500).json({ error: 'Failed to build map' });
        return;
      }
    } else {
      // Validate and normalize map: ensure per-user homes exist and no blocked occupied cells
      const cells: any[] = (mapDoc as any).cells;
      const isBlocked = (c: any) => c.terrain === 'water' || c.terrain === 'mountain' || c.terrain === 'road';
      let mutatedForCleanup = false;
      for (const c of cells) {
        if (c.isOccupied && isBlocked(c)) {
          c.isOccupied = false;
          c.occupiedBy = 'none';
          c.entityName = '';
          c.userId = null;
          mutatedForCleanup = true;
        }
        // Clear invalid player-occupied cells (no userId)
        if (c.isOccupied && c.occupiedBy === 'player' && !c.userId) {
          c.isOccupied = false;
          c.occupiedBy = 'none';
          c.entityName = '';
          c.userId = null;
          mutatedForCleanup = true;
        }
        // Always clear ephemeral 'YOU' markers regardless of userId to avoid persistence across map loads
        if (c.isOccupied && c.occupiedBy === 'player' && c.entityName === 'YOU') {
          c.isOccupied = false;
          c.occupiedBy = 'none';
          c.entityName = '';
          c.userId = null;
          mutatedForCleanup = true;
        }
      }

      if (mutatedForCleanup) {
        (mapDoc as any).markModified('cells');
        await (mapDoc as any).save();
      }

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
              // Ensure this user does not already have a permanent home cell (ignore ephemeral 'YOU')
              cells: { $not: { $elemMatch: { userId: (u as any)._id, occupiedBy: 'player', entityName: { $ne: 'YOU' } } } },
              // Atomically target a single array element that matches all conditions
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

    const gridSize = (mapDoc as any).gridSize || 50;
    const emptyGrid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => ({ terrain: 'plain', entity: 'empty' }))
    );
    let mutated = false;
    
    // Check and update shield statuses for all users to ensure expired shields are deactivated
    const shieldStatusMap = await ShieldService.checkAndUpdateMultipleShieldStatuses(users);
    
    // Create a map of userId to user data for quick lookup
    const userMap = new Map();
    users.forEach((user: any) => {
      userMap.set(String(user._id), user);
    });
    
    // Load all NPCs once and create a lookup map by slug to avoid N+1 queries
    const allNPCs = await NPCService.getAllNPCs();
    const npcLevelMap = new Map<string, number>();
    for (const npc of allNPCs) {
      if (npc.slug && npc.userLevelAssociation) {
        npcLevelMap.set(npc.slug, getDisplayLevel(npc.userLevelAssociation));
      }
    }
    
    for (const c of (mapDoc as any).cells as any[]) {
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
      
      // Get current shield status for player entities (using updated status from ShieldService)
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

    res.json({ grid: emptyGrid });
  } catch (error: any) {
    console.error('Map fetch error:', error);
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

export default router;


